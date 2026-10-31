"""FastAPI backend for CreatorHub. PostgreSQL persistence, JWT auth and YouTube OAuth."""
import os, secrets, json
from datetime import datetime, timezone, timedelta, date
from urllib.parse import urlencode
from typing import Optional

import jwt, requests
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Header, Query
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
class OAuthState(Base):
    __tablename__='oauth_states'; state: Mapped[str]=mapped_column(String(128),primary_key=True); user_id: Mapped[int]=mapped_column(ForeignKey('users.id',ondelete='CASCADE')); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

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
app.add_middleware(CORSMiddleware,allow_origins=[ "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", ],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])

def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()
def create_token(user:User):
    now=datetime.now(timezone.utc); return jwt.encode({'sub':str(user.id),'email':user.email,'role':user.role,'iat':now,'exp':now+timedelta(minutes=TOKEN_MINUTES)},JWT_SECRET,algorithm=JWT_ALG)
def current_user(authorization:Optional[str]=Header(default=None),db:Session=Depends(get_db)):
    if not authorization or not authorization.lower().startswith('bearer '): raise HTTPException(401,'Please sign in to continue.')
    try: payload=jwt.decode(authorization.split(' ',1)[1],JWT_SECRET,algorithms=[JWT_ALG]); user=db.get(User,int(payload['sub']))
    except Exception: raise HTTPException(401,'Session expired or invalid. Please sign in again.')
    if not user or not user.is_active: raise HTTPException(401,'Account is unavailable.')
    return user
class SignupIn(BaseModel): name:str=Field(min_length=1,max_length=100); email:EmailStr; role:str; password:str=Field(min_length=8,max_length=128)
class LoginIn(BaseModel): email:EmailStr; password:str
class ForgotIn(BaseModel): email:EmailStr; new_password:str=Field(min_length=8,max_length=128)

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
    platform_counts = {p: sum(1 for a in accounts if a.platform.lower() == p) for p in ('youtube','instagram','spotify','linkedin')}
    return {'totalUsers':len(users),'creators':sum(u.role.lower()=='creator' for u in users),'agencies':sum(u.role.lower()=='agency' for u in users),'marketingTeams':sum(u.role.lower()=='marketing' for u in users),'admins':sum(u.role.lower()=='admin' for u in users),'activeUsers':sum(bool(u.is_active) for u in users),'connectedAccounts':len(accounts),'connectedCreators':len({a.creator.user_id for a in accounts if a.creator and a.creator.user_id}),'totalPosts':posts_count,'platforms':platform_counts,'database':'postgresql' if DATABASE_URL.startswith('postgresql') else 'sqlite','lastUpdated':datetime.now(timezone.utc).isoformat()}

@app.get('/api/admin/users')
def admin_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_admin(user)
    users = db.scalars(select(User).order_by(desc(User.created_at))).all()
    result=[]
    for u in users:
        accounts=u.creator.accounts if u.creator else []
        result.append({'id':u.id,'name':u.name,'email':u.email,'role':u.role,'isActive':u.is_active,'createdAt':u.created_at.isoformat() if u.created_at else None,'connectedAccounts':len(accounts),'platforms':sorted({a.platform.title() for a in accounts})})
    return {'users':result}

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
def health(): return {'status':'ok','service':'creatorhub-fastapi','database':'configured' if DATABASE_URL.startswith('postgresql') else 'local-development-sqlite','youtube_oauth_configured':bool(GOOGLE_ID and GOOGLE_SECRET),'timestamp':datetime.now(timezone.utc).isoformat()}
@app.post('/api/auth/signup')
def signup(data:SignupIn,db:Session=Depends(get_db)):
    role=data.role.lower()
    if role not in {'creator','agency','marketing','admin'}: raise HTTPException(422,'Choose a valid role.')
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
    return {'access_token':create_token(user),'token_type':'bearer','user':{'id':user.id,'name':user.name,'email':user.email,'role':user.role}}
@app.post('/api/auth/forgot-password')
def forgot(data:ForgotIn,db:Session=Depends(get_db)):
    # Demo-friendly reset endpoint. Production should replace this with expiring emailed reset links.
    user=db.scalar(select(User).where(User.email==str(data.email).lower()))
    if not user: raise HTTPException(404,'No account found with this email address.')
    user.password_hash=password_hash.hash(data.new_password); db.commit(); return {'message':'Password updated. Please sign in.'}
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

@app.get('/api/analytics/overview')
def analytics_overview(user:User=Depends(current_user),db:Session=Depends(get_db)):
    creator=user.creator
    if not creator: return {'connected':False,'mode':'unconnected','message':'This role has no creator analytics account. Connect a creator account to view platform analytics.','metrics':None,'posts':[],'growth':[],'weekly':[],'audience':None}
    accounts=db.scalars(select(SocialAccount).where(SocialAccount.creator_id==creator.id)).all()
    if not accounts: return {'connected':False,'mode':'unconnected','message':'No social account is connected. Open Social Accounts and connect YouTube.','metrics':None,'posts':[],'growth':[],'weekly':[],'audience':None}
    all_posts=[]; growth=[]; weekly=[]; totals={'views':0,'likes':0,'comments':0,'shares':0}; errors=[]
    for a in accounts:
        try:
            token=valid_token(a,db); ch=google_get(YT+'/channels',token,{'part':'snippet,statistics,contentDetails','id':a.platform_user_id,'maxResults':1}).get('items',[])
            if ch:
                channel=ch[0]; stats=channel.get('statistics',{}); a.followers=int(stats.get('subscriberCount',a.followers)); a.channel_views=int(stats.get('viewCount',a.channel_views)); a.total_posts=int(stats.get('videoCount',a.total_posts))
                playlist_id=channel.get('contentDetails',{}).get('relatedPlaylists',{}).get('uploads'); ids=[]
                if playlist_id:
                    page=google_get(YT+'/playlistItems',token,{'part':'snippet,contentDetails','playlistId':playlist_id,'maxResults':50})
                    ids=[x.get('contentDetails',{}).get('videoId') for x in page.get('items',[]) if x.get('contentDetails',{}).get('videoId')]
                for start in range(0,len(ids),50):
                    vids=google_get(YT+'/videos',token,{'part':'snippet,statistics','id':','.join(ids[start:start+50])}).get('items',[])
                    for v in vids:
                        vs=v.get('statistics',{}); views=int(vs.get('viewCount',0)); likes=int(vs.get('likeCount',0)); comments=int(vs.get('commentCount',0)); engagement=(likes+comments)/views*100 if views else None
                        pub=v.get('snippet',{}).get('publishedAt',''); published=None
                        try: published=datetime.fromisoformat(pub.replace('Z','+00:00')) if pub else None
                        except ValueError: pass
                        p=db.scalar(select(Post).where(Post.account_id==a.id,Post.platform_post_id==v['id']))
                        if not p: p=Post(account_id=a.id,platform_post_id=v['id'],title=v.get('snippet',{}).get('title','Untitled'),views=views,likes=likes,comments=comments); db.add(p)
                        p.title=v.get('snippet',{}).get('title','Untitled'); p.views=views; p.likes=likes; p.comments=comments; p.engagement_rate=engagement; p.published_at=published; p.thumbnail_url=v.get('snippet',{}).get('thumbnails',{}).get('medium',{}).get('url'); p.post_url='https://www.youtube.com/watch?v='+v['id']; p.fetched_at=datetime.now(timezone.utc)
                today=date.today(); snap=db.scalar(select(AudienceSnapshot).where(AudienceSnapshot.account_id==a.id,AudienceSnapshot.date==today))
                if not snap: snap=AudienceSnapshot(account_id=a.id,date=today,followers=a.followers); db.add(snap)
                else: snap.followers=a.followers
                # YouTube Analytics daily report requires analytics scope and may be unavailable for new channels.
                try:
                    report=google_get(YTA,token,{'ids':'channel==MINE','startDate':(today-timedelta(days=30)).isoformat(),'endDate':(today-timedelta(days=1)).isoformat(),'metrics':'views,likes,comments,shares','dimensions':'day','sort':'day'})
                    for row in report.get('rows',[]):
                        d=date.fromisoformat(row[0]); vals=[int(x or 0) for x in row[1:5]]
                        daily=db.scalar(select(DailyMetric).where(DailyMetric.account_id==a.id,DailyMetric.date==d))
                        if not daily: daily=DailyMetric(account_id=a.id,date=d); db.add(daily)
                        daily.total_views,daily.total_likes,daily.total_comments,daily.total_shares=vals
                except Exception as e: errors.append('Historical YouTube Analytics unavailable; channel/video totals are still available.')
                db.commit()
        except HTTPException as e: errors.append(e.detail)
    posts=db.scalars(select(Post).join(SocialAccount).where(SocialAccount.creator_id==creator.id).order_by(desc(Post.views))).all()
    for p in posts:
        totals['views']+=p.views or 0; totals['likes']+=p.likes or 0; totals['comments']+=p.comments or 0; totals['shares']+=p.shares or 0
        all_posts.append({'id':p.id,'title':p.title,'type':'Video','platform':'▶','platformName':'YouTube','views':p.views,'likes':p.likes,'comments':p.comments,'shares':p.shares,'reach':p.reach,'engagement':f'{p.engagement_rate:.2f}%' if p.engagement_rate is not None else '—','date':p.published_at.date().isoformat() if p.published_at else '—','image':'▶','url':p.post_url})
    for a in accounts:
        rows=db.scalars(select(DailyMetric).where(DailyMetric.account_id==a.id).order_by(DailyMetric.date)).all()
        weekly.extend([{'date':r.date.isoformat(),'day':r.date.strftime('%a'),'views':r.total_views,'likes':r.total_likes,'comments':r.total_comments,'shares':r.total_shares} for r in rows])
        snaps=db.scalars(select(AudienceSnapshot).where(AudienceSnapshot.account_id==a.id).order_by(AudienceSnapshot.date)).all()
        growth.extend([{'date':s.date.isoformat(),'youtube':s.followers,'instagram':None,'spotify':None,'linkedin':None} for s in snaps])
    followers=sum(a.followers for a in accounts); count=sum(a.total_posts for a in accounts)
    metrics=[{'label':'Followers','value':f'{followers:,}','change':'—','icon':'users','tone':'violet','note':'Authorized channel total'},{'label':'Total Views','value':f'{sum(a.channel_views for a in accounts):,}','change':'—','icon':'eye','tone':'blue','note':'Lifetime channel views'},{'label':'Published Posts','value':f'{count:,}','change':'—','icon':'video','tone':'amber','note':'Channel video count'},{'label':'Views (fetched videos)','value':f"{totals['views']:,}",'change':'—','icon':'eye','tone':'green','note':f'{len(all_posts)} videos synchronized'}]
    return {'connected':True,'mode':'live','message':'Live YouTube data synchronized.' if not errors else 'Live channel/video data loaded. '+errors[0],'metrics':metrics,'posts':all_posts,'growth':growth,'weekly':weekly,'audience':{'followers':followers,'demographics':None,'note':'YouTube does not expose audience age/gender/location through this API integration.'},'lastUpdated':datetime.now(timezone.utc).isoformat(),'errors':errors,'comparisonAvailable':len(all_posts)>1}
@app.get('/api/analytics/compare')
def compare_posts(ids:str=Query(...,description='Comma-separated post IDs'),user:User=Depends(current_user),db:Session=Depends(get_db)):
    creator=user.creator
    if not creator: raise HTTPException(403,'Creator account required.')
    try: parsed=[int(x) for x in ids.split(',') if x.strip()]
    except ValueError: raise HTTPException(422,'Post IDs must be comma-separated integers.')
    if len(parsed)<2 or len(parsed)>10: raise HTTPException(422,'Choose between 2 and 10 posts to compare.')
    posts=db.scalars(select(Post).join(SocialAccount).where(Post.id.in_(parsed),SocialAccount.creator_id==creator.id)).all()
    if len(posts)!=len(set(parsed)): raise HTTPException(404,'One or more posts were not found in your account.')
    return {'posts':[{'id':p.id,'title':p.title,'views':p.views,'likes':p.likes,'comments':p.comments,'engagementRate':p.engagement_rate,'reach':p.reach} for p in posts]}
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

    return {
        "followers": sum(account.followers for account in accounts),
        "growth": growth,
        "demographics": None,
        "message": (
            "Subscriber and growth data are available. "
            "Audience demographics require an eligible analytics report."
        )
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

@app.get('/api/workspace/summary')
def workspace_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    campaigns = db.scalars(select(Campaign).where(Campaign.owner_user_id == user.id)).all()
    deals = db.scalars(select(BrandDeal).where(BrandDeal.owner_user_id == user.id)).all()
    posts = db.scalar(select(func.count(Post.id)).join(SocialAccount).join(Creator).where(Creator.user_id == user.id)) or 0
    return {
        'campaigns_total': len(campaigns),
        'campaigns_active': sum(1 for c in campaigns if c.status.lower() in {'active','in progress','running'}),
        'campaign_budget': sum(c.budget or 0 for c in campaigns),
        'brand_deals': len(deals),
        'deal_value': sum(d.amount or 0 for d in deals),
        'posts': posts,
        'connected_accounts': db.scalar(select(func.count(SocialAccount.id)).join(Creator).where(Creator.user_id == user.id)) or 0,
        'creators': db.scalar(select(func.count(User.id)).where(User.role == 'creator', User.is_active == True)) or 0,
        'followers': db.scalar(select(func.coalesce(func.sum(SocialAccount.followers),0))) or 0,
        'post_views': db.scalar(select(func.coalesce(func.sum(Post.views),0))) or 0,
    }

@app.get('/api/workspace/creators')
def workspace_creators(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency'})
    creators = db.scalars(select(User).where(User.role == 'creator', User.is_active == True).order_by(User.name)).all()
    result = []
    for creator_user in creators:
        creator = creator_user.creator
        accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id == creator.id)).all() if creator else []
        result.append({'id':creator_user.id,'name':creator_user.name,'email':creator_user.email,
                       'joined':creator_user.created_at.isoformat() if creator_user.created_at else None,
                       'platforms':[a.platform for a in accounts],
                       'followers':sum(a.followers or 0 for a in accounts),
                       'connected_accounts':len(accounts),
                       'relationship':'Not assigned'})
    return {'creators':result}

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
    creator_users = db.scalars(select(User).where(User.role == 'creator')).all()
    creator_ids = [u.creator.id for u in creator_users if u.creator]
    if not creator_ids:
        return {'posts':[],'total_views':0,'platforms':[]}
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id.in_(creator_ids))).all()
    account_ids = [a.id for a in accounts]
    if not account_ids:
        return {'posts':[],'total_views':0,'platforms':[]}
    posts = db.scalars(select(Post).where(Post.account_id.in_(account_ids)).order_by(desc(Post.views)).limit(200)).all()
    account_map = {a.id:a for a in accounts}
    creator_map = {u.creator.id:u for u in creator_users if u.creator}
    rows=[]
    for p in posts:
        a=account_map.get(p.account_id)
        owner=creator_map.get(a.creator_id) if a else None
        rows.append({'id':p.id,'title':p.title,'creator':owner.name if owner else 'Creator','platform':a.platform.title() if a else 'Unknown','username':a.username if a else '',
                     'views':p.views or 0,'likes':p.likes or 0,'comments':p.comments or 0,'url':p.post_url,
                     'published_at':p.published_at.isoformat() if p.published_at else None})
    return {'posts':rows,'total_views':sum(p['views'] for p in rows),'platforms':sorted(set(p['platform'] for p in rows))}

@app.get('/api/workspace/analytics')
def workspace_analytics(user: User = Depends(current_user), db: Session = Depends(get_db)):
    require_workspace_role(user, {'agency','marketing'})
    creator_users = db.scalars(select(User).where(User.role == 'creator')).all()
    creator_ids = [u.creator.id for u in creator_users if u.creator]
    accounts = db.scalars(select(SocialAccount).where(SocialAccount.creator_id.in_(creator_ids))).all() if creator_ids else []
    account_ids = [a.id for a in accounts]
    posts = db.scalars(select(Post).where(Post.account_id.in_(account_ids))).all() if account_ids else []
    return {'creator_count':len(creator_users),'connected_accounts':len(accounts),'posts':len(posts),
            'followers':sum(a.followers or 0 for a in accounts),'views':sum(a.views if hasattr(a,'views') else a.channel_views or 0 for a in accounts),
            'post_views':sum(p.views or 0 for p in posts),'likes':sum(p.likes or 0 for p in posts),
            'comments':sum(p.comments or 0 for p in posts),
            'platforms':{name:sum(1 for a in accounts if a.platform.lower()==name) for name in ['youtube','instagram','spotify','linkedin']}}
