"""FastAPI backend for CreatorHub. PostgreSQL persistence, JWT auth and YouTube OAuth."""
import os, secrets, json, hashlib, smtplib
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta, date
from urllib.parse import urlencode
from typing import Optional

import jwt, requests
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Header, Cookie, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import (create_engine, String, Integer, BigInteger, Boolean, DateTime, Date, Float, Text, ForeignKey, UniqueConstraint, select, func, desc)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

load_dotenv()
DATABASE_URL=os.getenv('DATABASE_URL','sqlite:///./creatorhub_dev.db')
engine=create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={'check_same_thread':False} if DATABASE_URL.startswith('sqlite') else {})
SessionLocal=sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
password_hash=PasswordHash.recommended()
JWT_SECRET=os.getenv('JWT_SECRET_KEY','dev-only-change-this-secret-before-deploying')
JWT_ALG='HS256'; TOKEN_MINUTES=int(os.getenv('JWT_EXPIRE_MINUTES','10080'))
FRONTEND=os.getenv('FRONTEND_ORIGIN','http://localhost:5173')
BACKEND=os.getenv('BACKEND_PUBLIC_URL','http://127.0.0.1:8000')
GOOGLE_ID=os.getenv('GOOGLE_CLIENT_ID',''); GOOGLE_SECRET=os.getenv('GOOGLE_CLIENT_SECRET','')
GOOGLE_REDIRECT=os.getenv('GOOGLE_REDIRECT_URI',BACKEND+'/api/oauth/youtube/callback')
SPOTIFY_ID=os.getenv('SPOTIFY_CLIENT_ID',''); SPOTIFY_SECRET=os.getenv('SPOTIFY_CLIENT_SECRET','')
SPOTIFY_REDIRECT=os.getenv('SPOTIFY_REDIRECT_URI',BACKEND+'/api/oauth/spotify/callback')
SMTP_HOST=os.getenv('SMTP_HOST',''); SMTP_PORT=int(os.getenv('SMTP_PORT','587'))
SMTP_USER=os.getenv('SMTP_USER',''); SMTP_PASSWORD=os.getenv('SMTP_PASSWORD','')
SMTP_FROM=os.getenv('SMTP_FROM',SMTP_USER); SMTP_USE_TLS=os.getenv('SMTP_USE_TLS','true').lower()=='true'
APP_ENV=os.getenv('APP_ENV','development').lower()
if APP_ENV == 'production' and JWT_SECRET == 'dev-only-change-this-secret-before-deploying':
    raise RuntimeError('Set a strong JWT_SECRET_KEY before running in production.')
YT='https://www.googleapis.com/youtube/v3'; YTA='https://youtubeanalytics.googleapis.com/v2/reports'
SCOPES=['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/yt-analytics.readonly']

class Base(DeclarativeBase): pass
class User(Base):
    __tablename__='users'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    name: Mapped[str]=mapped_column(String(100)); email: Mapped[str]=mapped_column(String(255),unique=True,index=True)
    password_hash: Mapped[str]=mapped_column(String(255)); role: Mapped[str]=mapped_column(String(30),default='creator')
    is_active: Mapped[bool]=mapped_column(Boolean,default=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
    creator: Mapped[Optional['Creator']]=relationship(back_populates='user',uselist=False,cascade='all, delete-orphan')
class Creator(Base):
    __tablename__='creators'
    id: Mapped[int]=mapped_column(Integer,primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),unique=True)
    creator_name: Mapped[str]=mapped_column(String(100)); bio: Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    user: Mapped[User]=relationship(back_populates='creator'); accounts: Mapped[list['SocialAccount']]=relationship(back_populates='creator',cascade='all, delete-orphan')
class SocialAccount(Base):
    __tablename__='social_accounts'; __table_args__=(UniqueConstraint('platform','platform_user_id',name='uq_platform_account'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True); creator_id: Mapped[int]=mapped_column(ForeignKey('creators.id',ondelete='CASCADE'),index=True)
    platform: Mapped[str]=mapped_column(String(30)); platform_user_id: Mapped[str]=mapped_column(String(255)); username: Mapped[str]=mapped_column(String(255))
    followers: Mapped[int]=mapped_column(BigInteger,default=0); channel_views: Mapped[int]=mapped_column(BigInteger,default=0); total_posts: Mapped[int]=mapped_column(Integer,default=0)
    access_token: Mapped[str]=mapped_column(Text); refresh_token: Mapped[Optional[str]]=mapped_column(Text,nullable=True); token_expires_at: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)
    connected_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc)); creator: Mapped['Creator']=relationship(back_populates='accounts'); posts: Mapped[list['Post']]=relationship(back_populates='account',cascade='all, delete-orphan')
class Post(Base):
    __tablename__='posts'; __table_args__=(UniqueConstraint('account_id','platform_post_id',name='uq_account_post'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True); account_id: Mapped[int]=mapped_column(ForeignKey('social_accounts.id',ondelete='CASCADE'),index=True)
    platform_post_id: Mapped[str]=mapped_column(String(255)); title: Mapped[str]=mapped_column(String(500)); post_url: Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    thumbnail_url: Mapped[Optional[str]]=mapped_column(Text,nullable=True); published_at: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True); views: Mapped[int]=mapped_column(BigInteger,default=0); likes: Mapped[int]=mapped_column(BigInteger,default=0); comments: Mapped[int]=mapped_column(BigInteger,default=0); shares: Mapped[Optional[int]]=mapped_column(BigInteger,nullable=True); reach: Mapped[Optional[int]]=mapped_column(BigInteger,nullable=True); engagement_rate: Mapped[Optional[float]]=mapped_column(Float,nullable=True); fetched_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
    account: Mapped[SocialAccount]=relationship(back_populates='posts')
class AudienceSnapshot(Base):
    __tablename__='audience_analytics'; __table_args__=(UniqueConstraint('account_id','date',name='uq_audience_day'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True); account_id: Mapped[int]=mapped_column(ForeignKey('social_accounts.id',ondelete='CASCADE'),index=True); date: Mapped[date]=mapped_column(Date); followers: Mapped[int]=mapped_column(BigInteger,default=0); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))
class DailyMetric(Base):
    __tablename__='platform_stats'; __table_args__=(UniqueConstraint('account_id','date',name='uq_platform_day'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True); account_id: Mapped[int]=mapped_column(ForeignKey('social_accounts.id',ondelete='CASCADE'),index=True); date: Mapped[date]=mapped_column(Date); total_views: Mapped[int]=mapped_column(BigInteger,default=0); total_likes: Mapped[int]=mapped_column(BigInteger,default=0); total_comments: Mapped[int]=mapped_column(BigInteger,default=0); total_shares: Mapped[int]=mapped_column(BigInteger,default=0); total_posts: Mapped[int]=mapped_column(Integer,default=0)
class AudienceDemographic(Base):
    __tablename__='audience_demographics'
    __table_args__=(UniqueConstraint('account_id','date','dimension','dimension_value',name='uq_audience_demographic'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    account_id: Mapped[int]=mapped_column(ForeignKey('social_accounts.id',ondelete='CASCADE'),index=True)
    date: Mapped[date]=mapped_column(Date)
    dimension: Mapped[str]=mapped_column(String(40))
    dimension_value: Mapped[str]=mapped_column(String(120))
    percentage: Mapped[float]=mapped_column(Float,default=0)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))

class OAuthState(Base):
    __tablename__='oauth_states'; state: Mapped[str]=mapped_column(String(128),primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE')); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

class PasswordResetToken(Base):
    __tablename__='password_reset_tokens'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),index=True)
    token_hash: Mapped[str]=mapped_column(String(64),unique=True,index=True)
    expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    used_at: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)

class CreatorAssignment(Base):
    __tablename__='creator_assignments'
    __table_args__=(UniqueConstraint('agency_user_id','creator_user_id',name='uq_agency_creator_assignment'),)
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    agency_user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),index=True)
    creator_user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),index=True)
    status: Mapped[str]=mapped_column(String(20),default='pending')
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))

class Campaign(Base):
    __tablename__='campaigns'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    owner_user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),index=True)
    name: Mapped[str]=mapped_column(String(160))
    platform: Mapped[str]=mapped_column(String(40),default='Multi-platform')
    status: Mapped[str]=mapped_column(String(30),default='Planned')
    budget: Mapped[float]=mapped_column(Float,default=0)
    start_date: Mapped[Optional[date]]=mapped_column(Date,nullable=True)
    end_date: Mapped[Optional[date]]=mapped_column(Date,nullable=True)
    notes: Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))

class BrandDeal(Base):
    __tablename__='brand_deals'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    owner_user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE'),index=True)
    brand_name: Mapped[str]=mapped_column(String(160))
    creator_name: Mapped[Optional[str]]=mapped_column(String(160),nullable=True)
    amount: Mapped[float]=mapped_column(Float,default=0)
    status: Mapped[str]=mapped_column(String(30),default='Negotiating')
    due_date: Mapped[Optional[date]]=mapped_column(Date,nullable=True)
    notes: Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=lambda:datetime.now(timezone.utc))

Base.metadata.create_all(engine)
app=FastAPI(title='Content Intelligence Platform API',version='2.0.0',description='Role-based creator analytics with PostgreSQL and YouTube API integration')

# Local single-process sync status. Provider calls run after the HTTP response returns.
SYNC_JOBS: dict[int, dict] = {}
app.add_middleware(CORSMiddleware,allow_origins=[ "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", ],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])

def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()
def create_token(user:User):
    now=datetime.now(timezone.utc); return jwt.encode({'sub':str(user.id),'email':user.email,'role':user.role,'iat':now,'exp':now+timedelta(minutes=TOKEN_MINUTES)},JWT_SECRET,algorithm=JWT_ALG)
def current_user(
    authorization: Optional[str] = Header(default=None),
    creatorhub_session: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
):
    token = None

    # First check Authorization header
    if authorization and authorization.lower().startswith('bearer '):
        token = authorization.split(' ', 1)[1]

    # If no Bearer token, check session cookie
    elif creatorhub_session:
        token = creatorhub_session

    if not token:
        raise HTTPException(
            status_code=401,
            detail='Please sign in to continue.'
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALG]
        )

        user = db.get(User, int(payload['sub']))

    except Exception:
        raise HTTPException(
            status_code=401,
            detail='Session expired or invalid. Please sign in again.'
        )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail='Account is unavailable.'
        )

    return user
class SignupIn(BaseModel): name:str=Field(min_length=1,max_length=100); email:EmailStr; role:str; password:str=Field(min_length=8,max_length=128)
class LoginIn(BaseModel): email:EmailStr; password:str
class ForgotRequestIn(BaseModel): email: EmailStr
class ResetPasswordIn(BaseModel): token: str = Field(min_length=20,max_length=256); new_password: str = Field(min_length=8,max_length=128)
class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None,min_length=1,max_length=100)
    role: Optional[str] = None
    is_active: Optional[bool] = None
class AssignmentDecision(BaseModel):
    status: str = Field(pattern='^(accepted|rejected)$')

class CampaignIn(BaseModel):
    name: str = Field(min_length=1,max_length=160)
    platform: str = Field(default='Multi-platform',max_length=40)
    status: str = Field(default='Planned',max_length=30)
    budget: float = Field(default=0,ge=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

class BrandDealIn(BaseModel):
    brand_name: str = Field(min_length=1,max_length=160)
    creator_name: Optional[str] = None
    amount: float = Field(default=0,ge=0)
    status: str = Field(default='Negotiating',max_length=30)
    due_date: Optional[date] = None
    notes: Optional[str] = None

class DeleteAccountIn(BaseModel): password:str=Field(min_length=1,max_length=128)


def require_admin(user: User):
    if user.role.lower() != 'admin':
        raise HTTPException(status_code=403, detail='Administrator access required.')
    return user

@app.get('/api/admin/overview')
def admin_overview(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    users = db.scalars(select(User)).all()
    accounts = db.scalars(select(SocialAccount)).all()
    posts_count = db.scalar(select(func.count(Post.id))) or 0
    latest_post_sync = db.scalar(select(func.max(Post.fetched_at)))
    platform_counts = {p: sum(1 for a in accounts if a.platform.lower() == p) for p in ('youtube','instagram','spotify','linkedin')}
    return {'totalUsers':len(users),'creators':sum(u.role.lower()=='creator' for u in users),'agencies':sum(u.role.lower()=='agency' for u in users),'marketingTeams':sum(u.role.lower()=='marketing' for u in users),'admins':sum(u.role.lower()=='admin' for u in users),'activeUsers':sum(bool(u.is_active) for u in users),'connectedAccounts':len(accounts),'connectedCreators':len({a.creator.user_id for a in accounts if a.creator and a.creator.user_id}),'totalPosts':posts_count,'platforms':platform_counts,'database':'postgresql' if DATABASE_URL.startswith('postgresql') else 'sqlite','lastUpdated':latest_post_sync.isoformat() if latest_post_sync else None}

@app.get('/api/admin/users')
def admin_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    users = db.scalars(select(User).order_by(desc(User.created_at))).all()
    result=[]
    for u in users:
        accounts=u.creator.accounts if u.creator else []
        result.append({'id':u.id,'name':u.name,'email':u.email,'role':u.role,'isActive':u.is_active,'createdAt':u.created_at.isoformat() if u.created_at else None,'connectedAccounts':len(accounts),'platforms':sorted({a.platform.title() for a in accounts})})
    return {'users':result}

@app.patch('/api/admin/users/{target_user_id}')
def admin_update_user(target_user_id: int, data: AdminUserUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail='User account not found.')
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail='Provide at least one field to update.')
    if target.id == user.id and (changes.get('is_active') is False or changes.get('role', target.role).lower() != 'admin'):
        raise HTTPException(status_code=400, detail='You cannot deactivate or remove your own administrator access.')
    if 'role' in changes:
        role = (changes['role'] or '').lower()
        if role not in {'creator','agency','marketing','admin'}:
            raise HTTPException(status_code=422, detail='Choose a valid account role.')
        if target.role.lower() == 'admin' and role != 'admin':
            admin_count = db.scalar(select(func.count(User.id)).where(func.lower(User.role) == 'admin')) or 0
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail='The last administrator cannot be demoted.')
        changes['role'] = role
    if changes.get('is_active') is False and target.role.lower() == 'admin':
        admin_count = db.scalar(select(func.count(User.id)).where(func.lower(User.role) == 'admin', User.is_active == True)) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail='The last active administrator cannot be deactivated.')
    if 'name' in changes:
        changes['name'] = changes['name'].strip()
        if not changes['name']:
            raise HTTPException(status_code=422, detail='Name cannot be empty.')
    for field, value in changes.items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    return {'user': {'id':target.id,'name':target.name,'email':target.email,'role':target.role,'isActive':target.is_active}}


@app.delete('/api/admin/users/{target_user_id}')
def admin_delete_user(target_user_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Permanently delete a user and their workspace data. Admin-only; admins cannot delete themselves or the final admin."""
    require_admin(user)

    if target_user_id == user.id:
        raise HTTPException(status_code=400, detail='You cannot delete your own administrator account.')

    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail='User account not found.')

    if target.role.lower() == 'admin':
        admin_count = db.scalar(select(func.count(User.id)).where(func.lower(User.role) == 'admin')) or 0
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail='The last administrator account cannot be deleted.')

    try:
        # Remove creator analytics explicitly so deletion also works on SQLite
        # databases where foreign-key cascade enforcement may be disabled.
        creator = db.scalar(select(Creator).where(Creator.user_id == target.id))
        if creator:
            account_ids = list(db.scalars(select(SocialAccount.id).where(SocialAccount.creator_id == creator.id)).all())
            if account_ids:
                db.query(AudienceSnapshot).filter(AudienceSnapshot.account_id.in_(account_ids)).delete(synchronize_session=False)
                db.query(DailyMetric).filter(DailyMetric.account_id.in_(account_ids)).delete(synchronize_session=False)
                db.query(AudienceDemographic).filter(AudienceDemographic.account_id.in_(account_ids)).delete(synchronize_session=False)
            # ORM cascades remove social accounts and their posts.
            db.delete(creator)

        # Remove records owned by the user and any pending OAuth state.
        db.query(Campaign).filter(Campaign.owner_user_id == target.id).delete(synchronize_session=False)
        db.query(BrandDeal).filter(BrandDeal.owner_user_id == target.id).delete(synchronize_session=False)
        db.query(OAuthState).filter(OAuthState.user_id == target.id).delete(synchronize_session=False)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == target.id).delete(synchronize_session=False)
        db.delete(target)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Could not delete this user account. No changes were saved.')

    return {'message': f'User account {target_user_id} and associated workspace data were permanently deleted.', 'deletedUserId': target_user_id}


@app.get('/api/admin/platforms')
def admin_platforms(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    accounts=db.scalars(select(SocialAccount).order_by(desc(SocialAccount.connected_at))).all()
    result=[]
    for a in accounts:
        owner=a.creator.user if a.creator else None
        result.append({'id':a.id,'platform':a.platform.title(),'username':a.username,'followers':int(a.followers or 0),'views':int(a.channel_views or 0),'posts':int(a.total_posts or 0),'connectedAt':a.connected_at.isoformat() if a.connected_at else None,'creatorName':owner.name if owner else (a.creator.creator_name if a.creator else 'Unknown'),'creatorEmail':owner.email if owner else '—'})
    return {'accounts':result}

@app.get('/api/admin/activity')
def admin_activity(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    users=db.scalars(select(User).order_by(desc(User.created_at)).limit(50)).all()
    accounts=db.scalars(select(SocialAccount).order_by(desc(SocialAccount.connected_at)).limit(50)).all()
    events=[]
    for u in users: events.append({'type':'User registered','actor':u.name,'detail':f'{u.email} · role: {u.role}','timestamp':u.created_at.isoformat() if u.created_at else None})
    for a in accounts:
        owner=a.creator.user if a.creator else None
        events.append({'type':'Social account connected','actor':owner.name if owner else 'Unknown','detail':f'{a.platform.title()} · {a.username}','timestamp':a.connected_at.isoformat() if a.connected_at else None})
    events.sort(key=lambda e:e['timestamp'] or '',reverse=True)
    return {'events':events[:100],'note':'Registration and connection events are shown. Sign-in audit events need a dedicated audit-log table.'}

@app.get('/api/health')
def health(db:Session=Depends(get_db)):
    try:
        db.execute(select(1))
        database_connected=True
    except Exception:
        database_connected=False
    engine_name='postgresql' if DATABASE_URL.startswith('postgresql') else 'sqlite'
    return {'status':'ok' if database_connected else 'degraded','service':'creatorhub-fastapi','database':engine_name,'database_connected':database_connected,'youtube_oauth_configured':bool(GOOGLE_ID and GOOGLE_SECRET),'spotify_oauth_configured':bool(SPOTIFY_ID and SPOTIFY_SECRET),'password_reset_email_configured':bool(SMTP_HOST and SMTP_FROM),'timestamp':datetime.now(timezone.utc).isoformat()}
@app.post('/api/auth/signup')
def signup(data:SignupIn,db:Session=Depends(get_db)):
    role=data.role.lower()
    if role not in {'creator','agency','marketing'}: raise HTTPException(422,'Public registration is limited to Creator, Agency, and Marketing roles. Administrator accounts must be provisioned securely.')
    email=str(data.email).lower()
    if db.scalar(select(User).where(User.email==email)): raise HTTPException(409,'An account with this email already exists.')
    user=User(name=data.name.strip(),email=email,password_hash=password_hash.hash(data.password),role=role)
    db.add(user); db.flush()
    if role=='creator': db.add(Creator(user_id=user.id,creator_name=user.name))
    db.commit(); return {'message':'Account created. Please sign in.'}
@app.post('/api/auth/login')
def login(data:LoginIn,db:Session=Depends(get_db)):
    user=db.scalar(select(User).where(User.email==str(data.email).lower()))
    if not user or not password_hash.verify(data.password,user.password_hash): raise HTTPException(401,'Email or password is incorrect.')
    if not user.is_active: raise HTTPException(403,'This account has been deactivated. Contact an administrator.')
    return {'access_token':create_token(user),'token_type':'bearer','user':{'id':user.id,'name':user.name,'email':user.email,'role':user.role}}

class GoogleCredentialIn(BaseModel):
    credential: str = Field(min_length=20, max_length=10000)


@app.post('/api/auth/google')
def google_signin(data: GoogleCredentialIn, db: Session = Depends(get_db)):
    # Verify the signed Google ID token before using any identity claims.
    if not GOOGLE_ID:
        raise HTTPException(status_code=503, detail='Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend/.env.')
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        identity = google_id_token.verify_oauth2_token(data.credential, google_requests.Request(), GOOGLE_ID)
    except ImportError:
        raise HTTPException(status_code=503, detail='Google authentication dependency is missing. Install google-auth.')
    except ValueError:
        raise HTTPException(status_code=401, detail='Google credential is invalid or expired. Please try again.')
    if identity.get('iss') not in {'accounts.google.com', 'https://accounts.google.com'}:
        raise HTTPException(status_code=401, detail='Google credential issuer is invalid.')
    if not identity.get('email_verified'):
        raise HTTPException(status_code=403, detail='Your Google email address must be verified.')
    email = str(identity.get('email', '')).strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail='Google did not provide an email address.')
    user = db.scalar(select(User).where(User.email == email))
    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail='This account has been deactivated. Contact an administrator.')
    else:
        display_name = str(identity.get('name') or email.split('@')[0]).strip()[:100]
        user = User(name=display_name, email=email,
                    password_hash=password_hash.hash(secrets.token_urlsafe(48)), role='creator')
        db.add(user)
        db.flush()
        db.add(Creator(user_id=user.id, creator_name=display_name))
        db.commit()
        db.refresh(user)
    return {'access_token': create_token(user), 'token_type': 'bearer',
            'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}}
def send_password_reset_email(recipient: str, reset_url: str) -> None:
    if not (SMTP_HOST and SMTP_FROM):
        raise RuntimeError('Password reset email is not configured. Set SMTP_HOST and SMTP_FROM.')
    message = EmailMessage()
    message['Subject'] = 'Reset your CreatorHub password'
    message['From'] = SMTP_FROM
    message['To'] = recipient
    message.set_content(
        'We received a request to reset your CreatorHub password. '
        'Use the following one-time link within 30 minutes:\n\n'
        f'{reset_url}\n\nIf you did not request this, you can ignore this email.'
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(message)


@app.post('/api/auth/forgot-password')
def forgot_password(data: ForgotRequestIn, db: Session = Depends(get_db)):
    # Send a one-time, expiring password-reset link; never accept a new password here.
    generic_message = 'If an account exists for that email, a password-reset link will be sent.'
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if not user or not user.is_active:
        return {'message': generic_message}
    if not (SMTP_HOST and SMTP_FROM):
        # Do not reveal account existence or issue a token that cannot be delivered.
        raise HTTPException(status_code=503, detail='Password reset email is not configured. Set SMTP settings in backend/.env.')
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    now = datetime.now(timezone.utc)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None)
    ).delete(synchronize_session=False)
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now + timedelta(minutes=30)
    ))
    db.commit()
    reset_url = FRONTEND.rstrip('/') + '/reset-password?token=' + raw_token
    try:
        send_password_reset_email(user.email, reset_url)
    except Exception:
        db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).delete(synchronize_session=False)
        db.commit()
        raise HTTPException(status_code=503, detail='Could not send the password-reset email. Check SMTP settings and try again.')
    return {'message': generic_message}


@app.post('/api/auth/reset-password')
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(data.token.encode('utf-8')).hexdigest()
    now = datetime.now(timezone.utc)
    reset_record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
    if not reset_record or reset_record.used_at is not None or reset_record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail='This password-reset link is invalid or expired. Request a new link.')
    target = db.get(User, reset_record.user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=400, detail='This account is unavailable. Request a new reset link if needed.')
    target.password_hash = password_hash.hash(data.new_password)
    reset_record.used_at = now
    # Invalidate all outstanding reset tokens for this user.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == target.id,
        PasswordResetToken.id != reset_record.id
    ).delete(synchronize_session=False)
    db.commit()
    return {'message':'Password updated successfully. Please sign in.'}

@app.get('/api/auth/me')
def me(user:User=Depends(current_user)): return {'id':user.id,'name':user.name,'email':user.email,'role':user.role}

@app.delete('/api/social-accounts/{account_id}')
def disconnect_social_account(account_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Disconnect a social account owned by the signed-in creator."""
    if not user.creator:
        raise HTTPException(status_code=403, detail='A creator account is required to manage social accounts.')

    account = db.scalar(
        select(SocialAccount).where(
            SocialAccount.id == account_id,
            SocialAccount.creator_id == user.creator.id,
        )
    )
    if not account:
        raise HTTPException(status_code=404, detail='Social account not found in your account.')

    # Best-effort token revocation for Google/YouTube. Removing the local record
    # still works if the provider revocation endpoint is temporarily unavailable.
    if account.platform.lower() == 'youtube' and account.access_token:
        try:
            requests.post(
                'https://oauth2.googleapis.com/revoke',
                params={'token': account.access_token},
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=10,
            )
        except requests.RequestException:
            pass

    try:
        # Delete dependent analytics explicitly so this works even where database
        # foreign-key cascade enforcement is not enabled (for example SQLite).
        db.query(AudienceSnapshot).filter(AudienceSnapshot.account_id == account.id).delete(synchronize_session=False)
        db.query(DailyMetric).filter(DailyMetric.account_id == account.id).delete(synchronize_session=False)
        db.delete(account)  # ORM cascade removes the account's posts.
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Could not disconnect this account. Please try again.')

    return {'message': 'Social account disconnected successfully.', 'account_id': account_id}

@app.delete('/api/auth/delete-account')
def delete_account(data: DeleteAccountIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Permanently delete the signed-in user's account after password verification."""
    if not password_hash.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Password is incorrect. Account was not deleted.')

    try:
        # Delete per-account analytics explicitly before deleting the user/creator.
        if user.creator:
            account_ids = select(SocialAccount.id).where(SocialAccount.creator_id == user.creator.id)
            db.query(AudienceSnapshot).filter(AudienceSnapshot.account_id.in_(account_ids)).delete(synchronize_session=False)
            db.query(DailyMetric).filter(DailyMetric.account_id.in_(account_ids)).delete(synchronize_session=False)
        db.query(OAuthState).filter(OAuthState.user_id == user.id).delete(synchronize_session=False)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(synchronize_session=False)
        db.delete(user)  # User.creator and Creator.accounts have ORM delete cascades.
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Could not delete your account. Please try again.')

    return {'message': 'Your account and associated data have been deleted successfully.'}

def google_get(url,token,params=None):
    r=requests.get(url,headers={'Authorization':f'Bearer {token}'},params=params,timeout=25)
    if not r.ok: raise HTTPException(502,f'Provider API returned {r.status_code}. Check API permissions and try again.')
    return r.json()
def valid_token(account:SocialAccount,db:Session):
    if account.token_expires_at and account.token_expires_at.replace(tzinfo=timezone.utc)<datetime.now(timezone.utc)+timedelta(seconds=60):
        if not account.refresh_token: raise HTTPException(401,'YouTube authorization expired. Reconnect the account.')
        r=requests.post('https://oauth2.googleapis.com/token',data={'client_id':GOOGLE_ID,'client_secret':GOOGLE_SECRET,'refresh_token':account.refresh_token,'grant_type':'refresh_token'},timeout=20)
        if not r.ok: raise HTTPException(401,'Could not refresh YouTube authorization. Reconnect the account.')
        data=r.json(); account.access_token=data['access_token']; account.token_expires_at=datetime.now(timezone.utc)+timedelta(seconds=int(data.get('expires_in',3600))); db.commit()
    return account.access_token
@app.get('/api/oauth/youtube/start')
def youtube_start(user:User=Depends(current_user),db:Session=Depends(get_db)):
    if not GOOGLE_ID or not GOOGLE_SECRET: raise HTTPException(503,'YouTube OAuth is not configured. Add Google credentials to backend/.env.')
    state=secrets.token_urlsafe(32); db.add(OAuthState(state=state,user_id=user.id,expires_at=datetime.now(timezone.utc)+timedelta(minutes=10))); db.commit()
    params={'client_id':GOOGLE_ID,'redirect_uri':GOOGLE_REDIRECT,'response_type':'code','scope':' '.join(SCOPES),'access_type':'offline','include_granted_scopes':'true','prompt':'consent','state':state}
    return {'authorization_url':'https://accounts.google.com/o/oauth2/v2/auth?'+urlencode(params)}
@app.get('/api/oauth/youtube/callback')
def youtube_callback(code:str|None=None,state:str|None=None,error:str|None=None,db:Session=Depends(get_db)):
    if error: return RedirectResponse(FRONTEND+'/?youtube=error')
    record=db.get(OAuthState,state) if state else None
    if not record or record.expires_at.replace(tzinfo=timezone.utc)<datetime.now(timezone.utc): raise HTTPException(400,'OAuth state is invalid or expired. Try connecting again.')
    user=db.get(User,record.user_id); db.delete(record); db.commit()
    if not code: raise HTTPException(400,'Authorization code missing.')
    r=requests.post('https://oauth2.googleapis.com/token',data={'code':code,'client_id':GOOGLE_ID,'client_secret':GOOGLE_SECRET,'redirect_uri':GOOGLE_REDIRECT,'grant_type':'authorization_code'},timeout=25)
    if not r.ok: raise HTTPException(502,'Could not exchange YouTube authorization code.')
    data=r.json(); access=data['access_token']; channel_data=google_get(YT+'/channels',access,{'part':'snippet,statistics','mine':'true','maxResults':1}); channels=channel_data.get('items',[])
    if not channels: return RedirectResponse(FRONTEND+'/?youtube=no-channel')
    ch=channels[0]; st=ch.get('statistics',{}); creator=user.creator
    if not creator: creator=Creator(user_id=user.id,creator_name=user.name); db.add(creator); db.flush()
    account=db.scalar(select(SocialAccount).where(SocialAccount.creator_id==creator.id,SocialAccount.platform=='youtube',SocialAccount.platform_user_id==ch['id']))
    if not account: account=SocialAccount(creator_id=creator.id,platform='youtube',platform_user_id=ch['id'],username=ch.get('snippet',{}).get('title','YouTube channel'),access_token=access); db.add(account)
    account.username=ch.get('snippet',{}).get('title','YouTube channel'); account.followers=int(st.get('subscriberCount',0)); account.channel_views=int(st.get('viewCount',0)); account.total_posts=int(st.get('videoCount',0)); account.access_token=access; account.refresh_token=data.get('refresh_token') or account.refresh_token; account.token_expires_at=datetime.now(timezone.utc)+timedelta(seconds=int(data.get('expires_in',3600))); db.commit()
    return RedirectResponse(FRONTEND+'/?youtube=connected')
@app.get('/api/social-accounts')
def social_accounts(user:User=Depends(current_user),db:Session=Depends(get_db)):
    creator=user.creator
    accounts=[] if not creator else db.scalars(select(SocialAccount).where(SocialAccount.creator_id==creator.id)).all()
    result=[{'id':a.id,'provider':a.platform.title(),'connected':True,'username':a.username,'followers':a.followers,'connectedAt':a.connected_at.isoformat(),'profileUrl':('https://open.spotify.com/user/'+a.platform_user_id if a.platform.lower()=='spotify' else ('https://www.youtube.com/channel/'+a.platform_user_id if a.platform.lower()=='youtube' else None))} for a in accounts]
    for platform,requires in [('instagram','Meta app credentials and eligible Instagram professional account'),('spotify','Spotify developer app credentials and account authorization'),('linkedin','LinkedIn developer app and approved product permissions')]:
        if not any(a.platform==platform for a in accounts): result.append({'provider':platform.title(),'connected':False,'requires':requires})
    return {'accounts':result}
@app.get('/api/oauth/spotify/start')
def spotify_start(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Begin Spotify account authorization to read the signed-in user's profile."""
    if not SPOTIFY_ID or not SPOTIFY_SECRET:
        raise HTTPException(503, 'Spotify OAuth is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to backend/.env.')
    state = secrets.token_urlsafe(32)
    db.add(OAuthState(state=state, user_id=user.id, expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)))
    db.commit()
    params = {
        'client_id': SPOTIFY_ID,
        'response_type': 'code',
        'redirect_uri': SPOTIFY_REDIRECT,
        'scope': 'user-read-private user-read-email',
        'state': state,
    }
    return {'authorization_url': 'https://accounts.spotify.com/authorize?' + urlencode(params)}


@app.get('/api/oauth/spotify/callback')
def spotify_callback(code: str | None = None, state: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    if error:
        return RedirectResponse(FRONTEND + '/?spotify=error')
    record = db.get(OAuthState, state) if state else None
    if not record or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, 'Spotify authorization state is invalid or expired. Try connecting again.')
    user = db.get(User, record.user_id)
    db.delete(record)
    db.commit()
    if not user or not user.is_active:
        raise HTTPException(401, 'The CreatorHub account that started this connection is unavailable.')
    if not code:
        raise HTTPException(400, 'Spotify authorization code is missing.')

    try:
        token_response = requests.post(
            'https://accounts.spotify.com/api/token',
            data={'grant_type': 'authorization_code', 'code': code, 'redirect_uri': SPOTIFY_REDIRECT},
            auth=(SPOTIFY_ID, SPOTIFY_SECRET),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=20,
        )
        if not token_response.ok:
            raise HTTPException(502, 'Spotify could not complete authorization. Check the app credentials and redirect URI.')
        token_data = token_response.json()
        access_token = token_data['access_token']
        profile_response = requests.get(
            'https://api.spotify.com/v1/me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=20,
        )
        if not profile_response.ok:
            raise HTTPException(502, 'Spotify authorized the app, but the profile could not be retrieved.')
        profile = profile_response.json()
    except requests.RequestException:
        raise HTTPException(502, 'Could not contact Spotify. Please try connecting again.')

    creator = user.creator
    if not creator:
        creator = Creator(user_id=user.id, creator_name=user.name)
        db.add(creator)
        db.flush()

    spotify_user_id = profile.get('id')
    if not spotify_user_id:
        raise HTTPException(502, 'Spotify did not return a profile ID for this account.')
    account = db.scalar(select(SocialAccount).where(
        SocialAccount.creator_id == creator.id,
        SocialAccount.platform == 'spotify',
        SocialAccount.platform_user_id == spotify_user_id,
    ))
    if not account:
        account = SocialAccount(
            creator_id=creator.id,
            platform='spotify',
            platform_user_id=spotify_user_id,
            username=profile.get('display_name') or spotify_user_id,
            access_token=access_token,
        )
        db.add(account)
    account.username = profile.get('display_name') or spotify_user_id
    account.followers = int((profile.get('followers') or {}).get('total') or 0)
    account.channel_views = 0
    account.total_posts = 0
    account.access_token = access_token
    account.refresh_token = token_data.get('refresh_token') or account.refresh_token
    account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(token_data.get('expires_in', 3600)))
    db.commit()
    return RedirectResponse(FRONTEND + '/?spotify=connected')


@app.get('/api/oauth/{provider}/start')
def oauth_provider_setup(provider: str, user: User = Depends(current_user)):
    provider = provider.lower()
    requirements = {
        'instagram': 'Instagram connection is not yet enabled. Configure a Meta developer app, eligible Instagram professional account, OAuth callback, and approved permissions before connecting.',
        'spotify': 'Spotify connection is not yet enabled. Configure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and the Spotify OAuth callback in backend/.env.',
        'linkedin': 'LinkedIn connection is not yet enabled. Configure a LinkedIn developer app, the required products/permissions, and OAuth callback before connecting.',
    }
    if provider not in requirements:
        raise HTTPException(404, 'Unknown social provider.')
    raise HTTPException(503, requirements[provider])

def youtube_report(token: str, params: dict):
    """Call YouTube Analytics and convert provider failures into a safe, readable API error."""
    try:
        response=requests.get(YTA,headers={'Authorization':f'Bearer {token}'},params=params,timeout=30)
        if not response.ok:
            detail='YouTube Analytics report is unavailable for this account or permission set.'
            try: detail=(response.json().get('error') or {}).get('message') or detail
            except Exception: pass
            raise RuntimeError(detail)
        return response.json()
    except requests.RequestException as exc:
        raise RuntimeError('Could not reach YouTube Analytics. Check the network and try again.') from exc


def sync_youtube_account(account: SocialAccount, db: Session):
    """Sync channel and up to 100 recent uploads plus available analytics; called only on explicit sync."""
    token=valid_token(account,db)
    channel_items=google_get(YT+'/channels',token,{'part':'snippet,statistics,contentDetails','id':account.platform_user_id,'maxResults':1}).get('items',[])
    if not channel_items:
        raise RuntimeError('YouTube did not return the authorized channel.')
    channel=channel_items[0]; stats=channel.get('statistics',{})
    account.username=channel.get('snippet',{}).get('title') or account.username
    account.followers=int(stats.get('subscriberCount') or 0)
    account.channel_views=int(stats.get('viewCount') or 0)
    account.total_posts=int(stats.get('videoCount') or 0)
    playlist_id=channel.get('contentDetails',{}).get('relatedPlaylists',{}).get('uploads')
    video_ids=[]; page_token=None
    # Fetch up to 100 recent uploads on explicit sync to limit latency and API quota.
    for _ in range(2):
        if not playlist_id: break
        params={'part':'snippet,contentDetails','playlistId':playlist_id,'maxResults':50}
        if page_token: params['pageToken']=page_token
        page=google_get(YT+'/playlistItems',token,params)
        video_ids.extend(x.get('contentDetails',{}).get('videoId') for x in page.get('items',[]) if x.get('contentDetails',{}).get('videoId'))
        page_token=page.get('nextPageToken')
        if not page_token: break
    # YouTube Analytics supports per-video shares; reach is not exposed by this integration.
    today=date.today(); since=(today-timedelta(days=30)).isoformat(); yesterday=(today-timedelta(days=1)).isoformat()
    video_analytics={}
    try:
        report=youtube_report(token,{'ids':'channel==MINE','startDate':since,'endDate':yesterday,'metrics':'views,likes,comments,shares','dimensions':'video','sort':'-views','maxResults':200})
        for row in report.get('rows',[]) or []:
            if len(row)>=5: video_analytics[str(row[0])]={'views':int(row[1] or 0),'likes':int(row[2] or 0),'comments':int(row[3] or 0),'shares':int(row[4] or 0)}
    except Exception:
        pass
    for offset in range(0,len(video_ids),50):
        vids=google_get(YT+'/videos',token,{'part':'snippet,statistics','id':','.join(video_ids[offset:offset+50])}).get('items',[])
        for video in vids:
            vid=video['id']; snippet=video.get('snippet',{}); vs=video.get('statistics',{}); analytic=video_analytics.get(vid,{})
            views=int(vs.get('viewCount') or analytic.get('views') or 0)
            likes=int(vs.get('likeCount') or analytic.get('likes') or 0)
            comments=int(vs.get('commentCount') or analytic.get('comments') or 0)
            shares=analytic.get('shares')
            engagement=(likes+comments+(shares or 0))/views*100 if views else None
            published=None
            try: published=datetime.fromisoformat(snippet.get('publishedAt','').replace('Z','+00:00')) if snippet.get('publishedAt') else None
            except ValueError: pass
            post=db.scalar(select(Post).where(Post.account_id==account.id,Post.platform_post_id==vid))
            if not post:
                post=Post(account_id=account.id,platform_post_id=vid,title=snippet.get('title') or 'Untitled')
                db.add(post)
            post.title=snippet.get('title') or 'Untitled'; post.views=views; post.likes=likes; post.comments=comments
            post.shares=shares; post.reach=None; post.engagement_rate=engagement; post.published_at=published
            post.thumbnail_url=(snippet.get('thumbnails') or {}).get('medium',{}).get('url')
            post.post_url='https://www.youtube.com/watch?v='+vid; post.fetched_at=datetime.now(timezone.utc)
    snap=db.scalar(select(AudienceSnapshot).where(AudienceSnapshot.account_id==account.id,AudienceSnapshot.date==today))
    if not snap: db.add(AudienceSnapshot(account_id=account.id,date=today,followers=account.followers))
    else: snap.followers=account.followers
    # Daily channel trend. This report may be unavailable for channels without Analytics access.
    try:
        report=youtube_report(token,{'ids':'channel==MINE','startDate':since,'endDate':yesterday,'metrics':'views,likes,comments,shares','dimensions':'day','sort':'day'})
        for row in report.get('rows',[]) or []:
            d=date.fromisoformat(row[0]); vals=[int(x or 0) for x in row[1:5]]
            daily=db.scalar(select(DailyMetric).where(DailyMetric.account_id==account.id,DailyMetric.date==d))
            if not daily: daily=DailyMetric(account_id=account.id,date=d); db.add(daily)
            daily.total_views,daily.total_likes,daily.total_comments,daily.total_shares=vals
    except Exception:
        pass
    # Audience demographic reports are best-effort; only persist data actually returned by YouTube.
    demographic_data=[]
    for dimension in ('ageGroup,gender','country'):
        try:
            report=youtube_report(token,{'ids':'channel==MINE','startDate':since,'endDate':yesterday,'metrics':'viewerPercentage','dimensions':dimension,'sort':'-viewerPercentage','maxResults':100})
            for row in report.get('rows',[]) or []:
                if len(row)>=2:
                    labels=row[:-1]; value=' / '.join(str(x) for x in labels); percentage=float(row[-1] or 0)
                    parts=dimension.split(',')
                    for key,label in zip(parts,labels):
                        existing=db.scalar(select(AudienceDemographic).where(AudienceDemographic.account_id==account.id,AudienceDemographic.date==today,AudienceDemographic.dimension==key,AudienceDemographic.dimension_value==str(label)))
                        if not existing: db.add(AudienceDemographic(account_id=account.id,date=today,dimension=key,dimension_value=str(label),percentage=percentage))
                        else: existing.percentage=percentage
                    demographic_data.append({'dimension':dimension,'label':value,'percentage':percentage})
        except Exception:
            continue
    db.commit()
    return demographic_data


@app.get('/api/analytics/overview')
def analytics_overview(user:User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='creator':
        raise HTTPException(403,'Creator analytics are available only to creator accounts.')
    creator=user.creator
    if not creator:
        return {'connected':False,'mode':'unconnected','message':'No creator profile exists yet. Connect YouTube from Social Accounts.','metrics':None,'posts':[],'growth':[],'weekly':[],'audience':None,'errors':[]}
    accounts=db.scalars(select(SocialAccount).where(SocialAccount.creator_id==creator.id)).all()
    if not accounts:
        return {'connected':False,'mode':'unconnected','message':'No social account is connected. Open Social Accounts and connect YouTube.','metrics':None,'posts':[],'growth':[],'weekly':[],'audience':None,'errors':[]}
    # GET overview must remain fast: provider synchronization runs only through POST /api/analytics/sync.
    errors=[]
    account_ids=[a.id for a in accounts]
    posts=db.scalars(select(Post).where(Post.account_id.in_(account_ids)).order_by(desc(Post.views),desc(Post.engagement_rate))).all() if account_ids else []
    account_map={a.id:a for a in accounts}; all_posts=[]
    for post in posts:
        account=account_map.get(post.account_id)
        all_posts.append({'id':post.id,'title':post.title,'type':'Video' if account and account.platform=='youtube' else 'Post','platform':'▶' if account and account.platform=='youtube' else '♪','platformName':account.platform.title() if account else 'Unknown','views':post.views or 0,'likes':post.likes or 0,'comments':post.comments or 0,'shares':post.shares,'reach':post.reach,'engagementRate':post.engagement_rate,'engagement':f'{post.engagement_rate:.2f}%' if post.engagement_rate is not None else '—','date':post.published_at.date().isoformat() if post.published_at else '—','image':post.thumbnail_url or '▶','url':post.post_url})
    growth=[]; weekly=[]
    for account in accounts:
        snapshots=db.scalars(select(AudienceSnapshot).where(AudienceSnapshot.account_id==account.id).order_by(AudienceSnapshot.date)).all()
        growth.extend([{'date':x.date.isoformat(),'youtube':x.followers if account.platform=='youtube' else None,'spotify':x.followers if account.platform=='spotify' else None,'instagram':None,'linkedin':None} for x in snapshots])
        daily=db.scalars(select(DailyMetric).where(DailyMetric.account_id==account.id).order_by(DailyMetric.date)).all()
        weekly.extend([{'date':x.date.isoformat(),'day':x.date.strftime('%a'),'views':x.total_views,'likes':x.total_likes,'comments':x.total_comments,'shares':x.total_shares} for x in daily])
    followers=sum(a.followers or 0 for a in accounts); channel_views=sum(a.channel_views or 0 for a in accounts); total_posts=sum(a.total_posts or 0 for a in accounts)
    total_views=sum(p.views or 0 for p in posts); total_likes=sum(p.likes or 0 for p in posts); total_comments=sum(p.comments or 0 for p in posts)
    metrics=[{'label':'Followers','value':f'{followers:,}','change':'—','icon':'users','tone':'violet','note':'Authorized connected profiles'},{'label':'Total Views','value':f'{channel_views:,}','change':'—','icon':'eye','tone':'blue','note':'Lifetime channel views where available'},{'label':'Published Posts','value':f'{total_posts:,}','change':'—','icon':'video','tone':'amber','note':'Provider-reported published content'},{'label':'Post Engagement','value':f'{(total_likes+total_comments)/total_views*100:.2f}%' if total_views else '—','change':'—','icon':'heart','tone':'green','note':'Likes + comments divided by fetched views'}]
    demographic_rows=db.scalars(select(AudienceDemographic).where(AudienceDemographic.account_id.in_(account_ids),AudienceDemographic.date==date.today())).all() if account_ids else []
    demographics=[{'dimension':x.dimension,'label':x.dimension_value,'percentage':x.percentage} for x in demographic_rows]
    return {'connected':True,'mode':'live' if not errors else 'partial','message':'Showing saved analytics from your connected account. Use Sync latest content to fetch fresh provider data.','metrics':metrics,'posts':all_posts,'topPosts':all_posts[:10],'growth':sorted(growth,key=lambda x:x['date']),'weekly':sorted(weekly,key=lambda x:x['date']),'audience':{'followers':followers,'demographics':demographics or None,'demographicsAvailable':bool(demographics),'note':'Demographics are included only when YouTube Analytics returns authorized age, gender, or country data. Reach is not exposed by the current YouTube API integration.'},'lastUpdated':max((p.fetched_at for p in posts if p.fetched_at),default=None).isoformat() if any(p.fetched_at for p in posts) else None,'errors':errors,'comparisonAvailable':len(all_posts)>1,'dataAvailability':{'views':True,'likes':True,'comments':True,'shares':any(p.shares is not None for p in posts),'reach':False,'demographics':bool(demographics)}}

def run_analytics_sync_job(user_id: int):
    """Run slow provider synchronization outside the request/response cycle."""
    job = SYNC_JOBS.setdefault(user_id, {})
    job.update({'status': 'running', 'message': 'Fetching channel, video and available audience analytics.', 'startedAt': datetime.now(timezone.utc).isoformat(), 'errors': []})
    db = SessionLocal()
    errors = []
    try:
        user = db.get(User, user_id)
        if not user or user.role != 'creator' or not user.creator:
            raise RuntimeError('Creator account required to synchronize analytics.')
        accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id == user.creator.id)).all()
        if not accounts:
            raise RuntimeError('No social account is connected. Connect YouTube before synchronizing.')
        for account in accounts:
            if account.platform.lower() != 'youtube':
                continue
            try:
                sync_youtube_account(account, db)
            except HTTPException as exc:
                db.rollback(); errors.append(str(exc.detail))
            except Exception as exc:
                db.rollback(); errors.append(f'{account.username}: {str(exc)[:240]}')
        status = 'partial' if errors else 'completed'
        message = 'Sync completed with provider limitations. Saved data is available.' if errors else 'YouTube content and analytics synchronized successfully.'
        job.update({'status': status, 'message': message, 'errors': errors, 'finishedAt': datetime.now(timezone.utc).isoformat()})
    except Exception as exc:
        db.rollback()
        job.update({'status': 'failed', 'message': str(exc)[:300], 'errors': [str(exc)[:300]], 'finishedAt': datetime.now(timezone.utc).isoformat()})
    finally:
        db.close()


@app.post('/api/analytics/sync')
def sync_analytics(background_tasks: BackgroundTasks, user:User=Depends(current_user),db:Session=Depends(get_db)):
    """Queue provider sync and return immediately; GET overview continues serving cached DB data."""
    if user.role != 'creator' or not user.creator:
        raise HTTPException(403, 'Creator account required to synchronize creator analytics.')
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id == user.creator.id)).all()
    if not accounts:
        raise HTTPException(400, 'No social account is connected. Connect YouTube before synchronizing.')
    existing = SYNC_JOBS.get(user.id, {})
    if existing.get('status') in ('queued', 'running'):
        return {'status': existing.get('status'), 'message': 'A synchronization is already in progress.'}
    SYNC_JOBS[user.id] = {'status': 'queued', 'message': 'Synchronization queued.', 'errors': [], 'queuedAt': datetime.now(timezone.utc).isoformat()}
    background_tasks.add_task(run_analytics_sync_job, user.id)
    return {'status': 'queued', 'message': 'Synchronization started in the background. You can continue using CreatorHub.'}


@app.get('/api/analytics/sync/status')
def analytics_sync_status(user:User=Depends(current_user)):
    if user.role != 'creator':
        raise HTTPException(403, 'Creator account required.')
    return SYNC_JOBS.get(user.id, {'status': 'idle', 'message': 'No synchronization has been started.', 'errors': []})


@app.get('/api/analytics/compare')
def compare_posts(ids:str=Query(...,description='Comma-separated post IDs'),user:User=Depends(current_user),db:Session=Depends(get_db)):
    creator=user.creator
    if not creator: raise HTTPException(403,'Creator account required.')
    try: parsed=[int(x) for x in ids.split(',') if x.strip()]
    except ValueError: raise HTTPException(422,'Post IDs must be comma-separated integers.')
    if len(parsed)<2 or len(parsed)>10: raise HTTPException(422,'Choose between 2 and 10 posts to compare.')
    posts=db.scalars(select(Post).join(SocialAccount).where(Post.id.in_(parsed),SocialAccount.creator_id==creator.id)).all()
    if len(posts)!=len(set(parsed)): raise HTTPException(404,'One or more posts were not found in your account.')
    return {'posts':[{'id':p.id,'title':p.title,'views':p.views,'likes':p.likes,'comments':p.comments,'engagementRate':p.engagement_rate,'shares':p.shares,'reach':p.reach} for p in posts]}
@app.get('/api/analytics/audience')
def audience(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if not user.creator:
        return {
            "followers": None,
            "growth": [],
            "demographics": None,
            "message": "Audience analytics are available for creator accounts."
        }

    accounts = db.scalars(
        select(SocialAccount).where(
            SocialAccount.creator_id == user.creator.id
        )
    ).all()

    if not accounts:
        return {
            "followers": 0,
            "growth": [],
            "demographics": None,
            "message": "Connect YouTube to view audience analytics."
        }

    snapshots = []

    for account in accounts:
        snapshots.extend(
            db.scalars(
                select(AudienceSnapshot)
                .where(AudienceSnapshot.account_id == account.id)
                .order_by(AudienceSnapshot.date)
            ).all()
        )

    growth = [
        {
            "date": snapshot.date.isoformat(),
            "followers": snapshot.followers
        }
        for snapshot in sorted(snapshots, key=lambda item: item.date)
    ]

    account_ids=[account.id for account in accounts]
    demographic_rows=db.scalars(
        select(AudienceDemographic).where(
            AudienceDemographic.account_id.in_(account_ids),
            AudienceDemographic.date==date.today()
        )
    ).all() if account_ids else []
    demographics=[{"dimension":row.dimension,"label":row.dimension_value,"percentage":row.percentage} for row in demographic_rows]
    return {
        "followers": sum(account.followers or 0 for account in accounts),
        "growth": growth,
        "demographics": demographics or None,
        "message": "Audience snapshots and any provider-reported demographics are available. Missing demographics are not estimated or fabricated."
    }
@app.get('/api/analytics/revenue')
def revenue(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if not user.creator:
        return {
            "available": False,
            "revenue": None,
            "currency": None,
            "message": "Revenue analytics require a creator account."
        }

    accounts = db.scalars(
        select(SocialAccount).where(
            SocialAccount.creator_id == user.creator.id
        )
    ).all()

    if not accounts:
        return {
            "available": False,
            "revenue": None,
            "currency": None,
            "message": "Connect an eligible monetization account."
        }

    return {
        "available": False,
        "revenue": None,
        "currency": None,
        "message": (
            "A connected YouTube channel was found, but revenue reporting "
            "has not yet been implemented."
        )
    }


# Agency and Marketing workspace modules. Records are scoped to the signed-in workspace owner.
def require_workspace_role(user: User, allowed: set[str]):
    if user.role not in allowed:
        raise HTTPException(403, 'This workspace feature is not available for your role.')

def campaign_dict(c: Campaign):
    return {'id':c.id,'name':c.name,'platform':c.platform,'status':c.status,'budget':c.budget,
            'start_date':c.start_date.isoformat() if c.start_date else None,
            'end_date':c.end_date.isoformat() if c.end_date else None,'notes':c.notes,
            'created_at':c.created_at.isoformat() if c.created_at else None}

def deal_dict(d: BrandDeal):
    return {'id':d.id,'brand_name':d.brand_name,'creator_name':d.creator_name,'amount':d.amount,
            'status':d.status,'due_date':d.due_date.isoformat() if d.due_date else None,
            'notes':d.notes,'created_at':d.created_at.isoformat() if d.created_at else None}

def assigned_creator_user_ids(user: User, db: Session) -> list[int]:
    """Return creator user IDs that explicitly approved this agency/marketing workspace."""
    if user.role not in {'agency', 'marketing'}:
        return []
    return list(db.scalars(
        select(CreatorAssignment.creator_user_id).where(
            CreatorAssignment.agency_user_id == user.id,
            CreatorAssignment.status == 'accepted'
        )
    ).all())


@app.post('/api/workspace/creator-assignments/{creator_user_id}')
def request_creator_assignment(creator_user_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency', 'marketing'})
    creator_user = db.get(User, creator_user_id)
    if not creator_user or creator_user.role != 'creator' or not creator_user.is_active or not creator_user.creator:
        raise HTTPException(status_code=404, detail='Active creator account not found.')
    if creator_user.id == user.id:
        raise HTTPException(status_code=400, detail='You cannot request access to your own account.')
    existing = db.scalar(select(CreatorAssignment).where(
        CreatorAssignment.agency_user_id == user.id,
        CreatorAssignment.creator_user_id == creator_user_id
    ))
    if existing:
        if existing.status == 'rejected':
            existing.status = 'pending'
            existing.created_at = datetime.now(timezone.utc)
            db.commit()
            return {'message':'Access request sent again. Waiting for creator approval.','status':'pending'}
        return {'message':f'An access request or approved relationship already exists ({existing.status}).','status':existing.status}
    db.add(CreatorAssignment(agency_user_id=user.id,creator_user_id=creator_user_id,status='pending'))
    db.commit()
    return {'message':'Access request sent. The creator must approve before their analytics are shared.','status':'pending'}


@app.get('/api/workspace/assignment-requests')
def creator_assignment_requests(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'creator'})
    # Show both pending requests and previously approved workspace connections.
    # This lets creators revoke access later without deleting their own account.
    rows = db.scalars(select(CreatorAssignment).where(
        CreatorAssignment.creator_user_id == user.id,
        CreatorAssignment.status.in_(['pending', 'accepted'])
    ).order_by(desc(CreatorAssignment.created_at))).all()
    requests_out=[]
    for row in rows:
        workspace=db.get(User,row.agency_user_id)
        requests_out.append({
            'id':row.id,
            'workspaceId':row.agency_user_id,
            'workspaceName':workspace.name if workspace else 'Workspace',
            'workspaceRole':workspace.role if workspace else 'workspace',
            'workspaceEmail':workspace.email if workspace else None,
            'agencyName':workspace.name if workspace else 'Workspace',
            'agencyEmail':workspace.email if workspace else None,
            'status':row.status,
            'createdAt':row.created_at.isoformat() if row.created_at else None
        })
    return {'requests':requests_out}


@app.patch('/api/workspace/creator-assignments/{assignment_id}')
def decide_creator_assignment(assignment_id: int, data: AssignmentDecision, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'creator'})
    assignment=db.scalar(select(CreatorAssignment).where(
        CreatorAssignment.id == assignment_id,
        CreatorAssignment.creator_user_id == user.id,
        CreatorAssignment.status == 'pending'
    ))
    if not assignment:
        raise HTTPException(status_code=404, detail='Pending workspace access request not found.')
    assignment.status=data.status
    db.commit()
    return {'message':f'Workspace access request {data.status}.','status':assignment.status}


@app.delete('/api/workspace/creator-assignments/{assignment_id}')
def end_creator_assignment(assignment_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """End a workspace relationship. Either the creator or the requesting workspace may revoke it."""
    assignment = db.get(CreatorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail='Workspace relationship not found or already ended.')

    is_creator = user.role == 'creator' and assignment.creator_user_id == user.id
    is_workspace_owner = user.role in {'agency', 'marketing'} and assignment.agency_user_id == user.id
    if not (is_creator or is_workspace_owner):
        raise HTTPException(status_code=403, detail='Only the creator or the requesting workspace can end this relationship.')

    db.delete(assignment)
    db.commit()
    return {'message': 'Workspace access has been ended. The creator account and its data have not been deleted.', 'assignmentId': assignment_id}


@app.get('/api/workspace/summary')
def workspace_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    campaigns = db.scalars(select(Campaign).where(Campaign.owner_user_id == user.id)).all()
    deals = db.scalars(select(BrandDeal).where(BrandDeal.owner_user_id == user.id)).all()
    creator_user_ids = assigned_creator_user_ids(user, db)
    creator_ids = list(db.scalars(select(Creator.id).where(Creator.user_id.in_(creator_user_ids))).all()) if creator_user_ids else []
    account_ids = list(db.scalars(select(SocialAccount.id).where(SocialAccount.creator_id.in_(creator_ids))).all()) if creator_ids else []
    posts = db.scalar(select(func.count(Post.id)).where(Post.account_id.in_(account_ids))) or 0 if account_ids else 0
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.id.in_(account_ids))).all() if account_ids else []
    post_views = db.scalar(select(func.coalesce(func.sum(Post.views),0)).where(Post.account_id.in_(account_ids))) or 0 if account_ids else 0
    return {
        'campaigns_total': len(campaigns),
        'campaigns_active': sum(1 for c in campaigns if c.status.lower() in {'active','in progress','running'}),
        'campaign_budget': sum(c.budget or 0 for c in campaigns),
        'brand_deals': len(deals),
        'deal_value': sum(d.amount or 0 for d in deals),
        'posts': posts,
        'connected_accounts': len(accounts),
        'creators': len(creator_user_ids),
        'followers': sum(a.followers or 0 for a in accounts),
        'post_views': post_views,
    }


@app.get('/api/workspace/creators')
def workspace_creators(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """List creator directory basics; reveal analytics only after creator approval."""
    require_workspace_role(user, {'agency','marketing'})
    all_creators = db.scalars(
        select(User).where(
            User.role == 'creator',
            User.is_active == True
        ).order_by(User.name)
    ).all()
    relationships = {
        row.creator_user_id: row.status
        for row in db.scalars(
            select(CreatorAssignment).where(CreatorAssignment.agency_user_id == user.id)
        ).all()
    }
    result = []
    for creator_user in all_creators:
        status = relationships.get(creator_user.id, 'not_requested')
        creator = creator_user.creator
        # Do not expose creator email, connected platforms, follower totals, or account counts
        # until that creator explicitly approves this workspace.
        accounts = []
        if status == 'accepted' and creator:
            accounts = db.scalars(
                select(SocialAccount).where(SocialAccount.creator_id == creator.id)
            ).all()
        result.append({
            'id': creator_user.id,
            'name': creator_user.name,
            'email': creator_user.email if status == 'accepted' else None,
            'joined': creator_user.created_at.isoformat() if creator_user.created_at else None,
            'platforms': [a.platform for a in accounts],
            'followers': sum(a.followers or 0 for a in accounts) if status == 'accepted' else None,
            'connected_accounts': len(accounts) if status == 'accepted' else None,
            'relationship': status,
            'assignment_id': next((row.id for row in db.scalars(select(CreatorAssignment).where(CreatorAssignment.agency_user_id == user.id, CreatorAssignment.creator_user_id == creator_user.id)).all()), None),
            'canRequest': status in {'not_requested', 'rejected'}
        })
    return {
        'creators': result,
        'note': 'Creator analytics and connected-account details are visible only after the creator approves your workspace access request.'
    }

@app.get('/api/workspace/campaigns')
def list_campaigns(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    rows = db.scalars(select(Campaign).where(Campaign.owner_user_id == user.id).order_by(Campaign.created_at.desc())).all()
    return {'campaigns':[campaign_dict(c) for c in rows]}

@app.post('/api/workspace/campaigns')
def create_campaign(data: CampaignIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    if data.end_date and data.start_date and data.end_date < data.start_date:
        raise HTTPException(422,'End date cannot be earlier than start date.')
    campaign = Campaign(owner_user_id=user.id, **data.model_dump())
    db.add(campaign); db.commit(); db.refresh(campaign)
    return {'campaign':campaign_dict(campaign)}

@app.delete('/api/workspace/campaigns/{campaign_id}')
def delete_campaign(campaign_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    campaign = db.scalar(select(Campaign).where(Campaign.id == campaign_id, Campaign.owner_user_id == user.id))
    if not campaign: raise HTTPException(404,'Campaign not found in your workspace.')
    db.delete(campaign); db.commit()
    return {'message':'Campaign deleted.'}

@app.get('/api/workspace/brand-deals')
def list_brand_deals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    rows = db.scalars(select(BrandDeal).where(BrandDeal.owner_user_id == user.id).order_by(BrandDeal.created_at.desc())).all()
    return {'deals':[deal_dict(d) for d in rows]}

@app.post('/api/workspace/brand-deals')
def create_brand_deal(data: BrandDealIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    deal = BrandDeal(owner_user_id=user.id, **data.model_dump())
    db.add(deal); db.commit(); db.refresh(deal)
    return {'deal':deal_dict(deal)}

@app.delete('/api/workspace/brand-deals/{deal_id}')
def delete_brand_deal(deal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    deal = db.scalar(select(BrandDeal).where(BrandDeal.id == deal_id, BrandDeal.owner_user_id == user.id))
    if not deal: raise HTTPException(404,'Brand deal not found in your workspace.')
    db.delete(deal); db.commit()
    return {'message':'Brand deal deleted.'}


@app.get('/api/workspace/content')
def workspace_content(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    creator_user_ids = assigned_creator_user_ids(user, db)
    creator_ids = list(db.scalars(select(Creator.id).where(Creator.user_id.in_(creator_user_ids))).all()) if creator_user_ids else []
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id.in_(creator_ids))).all() if creator_ids else []
    account_ids = [a.id for a in accounts]
    posts = db.scalars(select(Post).where(Post.account_id.in_(account_ids)).order_by(desc(Post.views)).limit(200)).all() if account_ids else []
    account_map = {a.id:a for a in accounts}
    creator_map = {u.creator.id:u for u in db.scalars(select(User).where(User.id.in_(creator_user_ids))).all() if u.creator} if creator_user_ids else {}
    rows=[]
    for p in posts:
        a=account_map.get(p.account_id)
        owner=creator_map.get(a.creator_id) if a else None
        rows.append({'id':p.id,'title':p.title,'creator':owner.name if owner else 'Creator','platform':a.platform.title() if a else 'Unknown','username':a.username if a else '',
                     'views':p.views or 0,'likes':p.likes or 0,'comments':p.comments or 0,'url':p.post_url,
                     'published_at':p.published_at.isoformat() if p.published_at else None})
    return {'posts':rows,'total_views':sum(p['views'] for p in rows),'platforms':sorted(set(p['platform'] for p in rows)), 'note':'Only creator accounts that approved this workspace are included.'}

@app.get('/api/workspace/analytics')
def workspace_analytics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    creator_user_ids = assigned_creator_user_ids(user, db)
    creator_ids = list(db.scalars(select(Creator.id).where(Creator.user_id.in_(creator_user_ids))).all()) if creator_user_ids else []
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id.in_(creator_ids))).all() if creator_ids else []
    account_ids = [a.id for a in accounts]
    posts = db.scalars(select(Post).where(Post.account_id.in_(account_ids))).all() if account_ids else []
    return {'creator_count':len(creator_user_ids),'connected_accounts':len(accounts),'posts':len(posts),
            'followers':sum(a.followers or 0 for a in accounts),'views':sum(a.channel_views or 0 for a in accounts),
            'post_views':sum(p.views or 0 for p in posts),'likes':sum(p.likes or 0 for p in posts),
            'comments':sum(p.comments or 0 for p in posts),
            'platforms':{name:sum(1 for a in accounts if a.platform.lower()==name) for name in ['youtube','instagram','spotify','linkedin']},
            'note':'Only creator accounts that approved this workspace are included.'}

