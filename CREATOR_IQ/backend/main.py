import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt
from dotenv import load_dotenv

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import PyJWTError as JWTError
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import Boolean, inspect, text, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

import social  # noqa: E402  (needs .env loaded first)

DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{(BASE_DIR / 'creator_iq.db').as_posix()}"
SECRET_KEY = os.getenv("SECRET_KEY", "development-only-change-this-secret-before-deployment")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
app = FastAPI(title="CreatorIQ API", version="1.0.0", description="Authentication and creator profile API for CreatorIQ")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in origins if x.strip()],
    # Allow Vite on any local port (5173, 5174, ...) so sign-up never fails with a CORS error.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single source of truth for roles. Add a role here and it appears in sign-up, the admin console and routing.
ROLES = [
    {"name": "Creator", "description": "Individual creator profiles and content insights.", "signup": True, "color": "#7657e8"},
    {"name": "Agency", "description": "Agency teams managing creator portfolios.", "signup": True, "color": "#0ea5e9"},
    {"name": "Marketing Team", "description": "Campaign planning and performance views.", "signup": True, "color": "#f59e0b"},
    {"name": "Admin", "description": "Administrative access to accounts, roles and system health.", "signup": True, "color": "#10b981"},
]
ROLE_NAMES = {r["name"] for r in ROLES}
TEAM_ROLES = {"Agency", "Marketing Team"}

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(40), default="Creator", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    profile: Mapped[Optional["CreatorProfile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")

class CreatorProfile(Base):
    __tablename__ = "creator_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    handle: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    niche: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    website: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user: Mapped[User] = relationship(back_populates="profile")

class TrackedAccount(Base):
    """A social account (YouTube channel / Instagram profile) whose live stats a user follows."""
    __tablename__ = "tracked_accounts"
    __table_args__ = (UniqueConstraint("owner_id", "platform", "identifier"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)

class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    platform: Mapped[str] = mapped_column(String(40), default="Multi-platform", nullable=False)
    budget: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Planning", nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), default="", nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), default="", nullable=False)
    spent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revenue: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

class FollowerSnapshot(Base):
    """Recorded totals so the dashboards can chart real growth over time."""
    __tablename__ = "follower_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    followers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

Base.metadata.create_all(bind=engine)

def _migrate():  # add new columns to an existing campaigns table (create_all does not alter tables)
    cols = {c["name"] for c in inspect(engine).get_columns("campaigns")}
    with engine.begin() as conn:
        for col in ("spent", "revenue"):
            if col not in cols:
                conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN {col} INTEGER NOT NULL DEFAULT 0"))
_migrate()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = Field(default="Creator", max_length=40)

    @field_validator("password")
    @classmethod
    def password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long (max 72 bytes).")
        return v

class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

class UserOutput(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    model_config = ConfigDict(from_attributes=True)

class TokenOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOutput

class ProfileInput(BaseModel):
    handle: str = Field(min_length=2, max_length=60, pattern=r"^@?[A-Za-z0-9._]+$")
    display_name: str = Field(min_length=1, max_length=120)
    niche: str = Field(default="", max_length=100)
    bio: str = Field(default="", max_length=500)
    country: str = Field(default="", max_length=100)
    website: str = Field(default="", max_length=500)

class ProfileOutput(ProfileInput):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

def create_access_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": str(user.id), "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is invalid or expired. Please sign in again.", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError): raise error
    user = db.get(User, user_id)
    if not user or not user.is_active: raise error
    return user

@app.get("/")
def root(): return {"name": "CreatorIQ API", "status": "running", "docs": "/docs"}

@app.get("/api/health")
def health(): return {"status": "ok"}

@app.get("/api/meta/roles")
def meta_roles(): return {"roles": ROLES}

@app.post("/api/auth/register", response_model=UserOutput, status_code=201)
def register(payload: RegisterInput, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first(): raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
    # Admin registration is only permitted for explicitly allow-listed emails.
    requested_role = payload.role if payload.role in ROLE_NAMES else "Creator"
    admin_emails = {item.strip().lower() for item in os.getenv("ADMIN_EMAILS", "").split(",") if item.strip()}
    if requested_role == "Admin" and email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin signup is restricted. Ask the system administrator to add your email to ADMIN_EMAILS.")
    role = requested_role
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role=role)
    db.add(user)
    try: db.commit(); db.refresh(user)
    except Exception: db.rollback(); raise HTTPException(status_code=500, detail="Could not create the account. Please try again.")
    return user

@app.post("/api/auth/login", response_model=TokenOutput)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(status_code=401, detail="Incorrect email or password. If you are new, please sign up first.")
    if not user.is_active: raise HTTPException(status_code=403, detail="This account has been deactivated. Contact an administrator.")
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user}

@app.get("/api/auth/me", response_model=UserOutput)
def me(user: User = Depends(current_user)): return user

@app.get("/api/creator/profile", response_model=Optional[ProfileOutput])
def get_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()

@app.put("/api/creator/profile", response_model=ProfileOutput)
def save_profile(payload: ProfileInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    handle = payload.handle.strip().lstrip("@").lower()
    duplicate = db.query(CreatorProfile).filter(CreatorProfile.handle == handle, CreatorProfile.user_id != user.id).first()
    if duplicate: raise HTTPException(status_code=409, detail="That creator handle is already taken. Please choose another.")
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
    if profile is None: profile = CreatorProfile(user_id=user.id, handle=handle, display_name=payload.display_name.strip()); db.add(profile)
    profile.handle = handle
    profile.display_name = payload.display_name.strip()
    profile.niche = payload.niche.strip()
    profile.bio = payload.bio.strip()
    profile.country = payload.country.strip()
    profile.website = payload.website.strip()
    db.commit(); db.refresh(profile)
    return profile

@app.get("/api/creator/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
    rows = db.query(TrackedAccount).filter(TrackedAccount.owner_id == user.id).all()
    ok = [r["data"] for r in social.get_many([(r.platform, r.identifier) for r in rows]) if r["data"]]
    followers = sum(d["followers"] or 0 for d in ok)
    eng = [d["engagement"] for d in ok if d["engagement"] is not None]
    return {"profile_complete": bool(profile and profile.handle and profile.display_name), "metrics": [
        {"label": "Total followers", "value": followers if ok else None, "change": f"{len(ok)} of {len(rows)} accounts live"},
        {"label": "Engagement rate", "value": round(sum(eng) / len(eng), 2) if eng else None, "change": "Average on latest posts"},
        {"label": "Content published", "value": sum(d["posts"] or 0 for d in ok) if ok else None, "change": "Across connected accounts"},
        {"label": "Total views", "value": sum(d["views"] or 0 for d in ok) if ok else None, "change": "Lifetime views (YouTube)"},
    ], "note": "Live data from connected YouTube / Instagram accounts."}


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "Admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user

def _user_json(item: User) -> dict:
    return {"id": item.id, "name": item.name, "email": item.email, "role": item.role, "is_active": item.is_active, "created_at": item.created_at.isoformat() if item.created_at else None}

@app.get("/api/admin/users")
def admin_users(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    accounts = db.query(User).order_by(User.created_at.desc()).all()
    tracked = {}
    for r in db.query(TrackedAccount).all(): tracked[r.owner_id] = tracked.get(r.owner_id, 0) + 1
    camps = {}
    for c in db.query(Campaign).all(): camps[c.owner_id] = camps.get(c.owner_id, 0) + 1
    out = []
    for item in accounts:
        row = _user_json(item); row["tracked_accounts"] = tracked.get(item.id, 0); row["campaigns"] = camps.get(item.id, 0); out.append(row)
    return {"users": out}

class AdminUserUpdate(BaseModel):
    role: Optional[str] = Field(default=None, max_length=40)
    is_active: Optional[bool] = None

@app.patch("/api/admin/users/{user_id}")
def admin_update_user(user_id: int, payload: AdminUserUpdate, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target: raise HTTPException(status_code=404, detail="Account not found.")
    if payload.role is not None and payload.role not in ROLE_NAMES: raise HTTPException(status_code=400, detail="Unknown role.")
    admins_left = db.query(User).filter(User.role == "Admin", User.is_active == True, User.id != target.id).count()  # noqa: E712
    if target.id == admin.id and ((payload.role and payload.role != "Admin") or payload.is_active is False):
        raise HTTPException(status_code=400, detail="You cannot demote or deactivate your own admin account.")
    if target.role == "Admin" and not admins_left and ((payload.role and payload.role != "Admin") or payload.is_active is False):
        raise HTTPException(status_code=400, detail="At least one active administrator must remain.")
    if payload.role is not None: target.role = payload.role
    if payload.is_active is not None: target.is_active = payload.is_active
    db.commit(); db.refresh(target)
    return _user_json(target)

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target: raise HTTPException(status_code=404, detail="Account not found.")
    if target.id == admin.id: raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    if target.role == "Admin" and not db.query(User).filter(User.role == "Admin", User.is_active == True, User.id != target.id).count():  # noqa: E712
        raise HTTPException(status_code=400, detail="At least one active administrator must remain.")
    db.query(TrackedAccount).filter(TrackedAccount.owner_id == target.id).delete()
    db.query(Campaign).filter(Campaign.owner_id == target.id).delete()
    db.query(FollowerSnapshot).filter(FollowerSnapshot.owner_id == target.id).delete()
    db.delete(target); db.commit()
    return {"ok": True}

@app.get("/api/admin/stats")
def admin_stats(admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    now = datetime.now(timezone.utc)
    day = lambda d: d.date().isoformat()
    signups = {}
    for u in users:
        if u.created_at:
            k = day(u.created_at); signups[k] = signups.get(k, 0) + 1
    trend = [{"date": day(now - timedelta(days=i)), "count": signups.get(day(now - timedelta(days=i)), 0)} for i in range(13, -1, -1)]
    by_role = {r["name"]: {"total": 0, "active": 0, "tracked_accounts": 0, "campaigns": 0, "budget": 0, "spent": 0, "revenue": 0, "last_signup": None} for r in ROLES}
    role_of = {u.id: u.role for u in users}
    for u in users:
        b = by_role.setdefault(u.role, {"total": 0, "active": 0, "tracked_accounts": 0, "campaigns": 0, "budget": 0, "spent": 0, "revenue": 0, "last_signup": None})
        b["total"] += 1; b["active"] += 1 if u.is_active else 0
        if u.created_at and (not b["last_signup"] or u.created_at.isoformat() > b["last_signup"]): b["last_signup"] = u.created_at.isoformat()
    tracked = db.query(TrackedAccount).all()
    plat = {}
    for t in tracked:
        plat[t.platform] = plat.get(t.platform, 0) + 1
        if t.owner_id in role_of: by_role[role_of[t.owner_id]]["tracked_accounts"] += 1
    camps = db.query(Campaign).all()
    for c in camps:
        if c.owner_id in role_of:
            b = by_role[role_of[c.owner_id]]; b["campaigns"] += 1; b["budget"] += c.budget; b["spent"] += c.spent; b["revenue"] += c.revenue
    return {
        "totals": {"users": len(users), "active": sum(1 for u in users if u.is_active), "signups_7d": sum(x["count"] for x in trend[-7:]),
                   "tracked_accounts": len(tracked), "campaigns": len(camps), "budget": sum(c.budget for c in camps), "spent": sum(c.spent for c in camps),
                   "revenue": sum(c.revenue for c in camps), "snapshots": db.query(FollowerSnapshot).count()},
        "signup_trend": trend, "by_role": by_role, "accounts_by_platform": plat, "roles": ROLES,
    }

@app.get("/api/admin/social")
def admin_social(refresh: bool = False, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.query(TrackedAccount).order_by(TrackedAccount.id).all()
    results = social.get_many([(r.platform, r.identifier) for r in rows], force=refresh)
    owners = {u.id: u for u in db.query(User).all()}
    out = []
    for r, res in zip(rows, results):
        o = owners.get(r.owner_id)
        out.append({**_account_json(r, res), "owner": {"id": r.owner_id, "name": o.name if o else "—", "email": o.email if o else "", "role": o.role if o else ""}})
    return {"status": social.status(), "accounts": out}

@app.get("/api/admin/health")
def admin_health(refresh: bool = False, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    try: db.execute(text("SELECT 1")); db_ok = True
    except Exception: db_ok = False
    st = social.status()
    ig_info = None
    if st["instagram"]:
        ig_info = social.instagram_default()
        if refresh and ig_info["error"]:
            try: social.instagram_own(force=True); ig_info = social.instagram_default()
            except Exception: pass
    return {"database": {"ok": db_ok, "engine": "PostgreSQL" if DATABASE_URL.startswith("postgres") else "SQLite"},
            "social": {**st, "instagram_account": ig_info}, "config": {"admin_emails": len([x for x in os.getenv("ADMIN_EMAILS", "").split(",") if x.strip()]),
            "snapshot_minutes": int(os.getenv("SNAPSHOT_MINUTES", "5")), "token_minutes": ACCESS_TOKEN_MINUTES,
            "secret_key_default": SECRET_KEY.startswith("development-only") or SECRET_KEY.startswith("replace-with")}}


# ---------------------------------------------------------------- social data
class AccountInput(BaseModel):
    platform: str = Field(max_length=30)
    identifier: str = Field(min_length=1, max_length=255)
    label: str = Field(default="", max_length=120)

def _account_json(row: TrackedAccount, res: dict) -> dict:
    return {"id": row.id, "platform": row.platform, "identifier": row.identifier, "label": row.label, "data": res["data"], "error": res["error"]}

@app.get("/api/social/live")
def social_live(refresh: bool = False, user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(TrackedAccount).filter(TrackedAccount.owner_id == user.id).order_by(TrackedAccount.id).all()
    results = social.get_many([(r.platform, r.identifier) for r in rows], force=refresh)
    ok = [r["data"] for r in results if r["data"]]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if ok:  # record a snapshot at most every SNAPSHOT_MINUTES (default 5)
        gap = max(1, int(os.getenv("SNAPSHOT_MINUTES", "5"))) * 60
        last = db.query(FollowerSnapshot).filter(FollowerSnapshot.owner_id == user.id).order_by(FollowerSnapshot.ts.desc()).first()
        if not last or (now - last.ts).total_seconds() > gap:
            db.add(FollowerSnapshot(owner_id=user.id, ts=now, followers=sum(d["followers"] or 0 for d in ok), views=sum(d["views"] or 0 for d in ok)))
            db.commit()
    snaps = db.query(FollowerSnapshot).filter(FollowerSnapshot.owner_id == user.id).order_by(FollowerSnapshot.ts.desc()).limit(60).all()
    history = [{"ts": x.ts.isoformat() + "Z", "followers": x.followers, "views": x.views} for x in reversed(snaps)]
    defaults = {"instagram": social.instagram_default()} if social.status()["instagram"] else {}
    return {"status": social.status(), "defaults": defaults, "history": history, "accounts": [_account_json(r, res) for r, res in zip(rows, results)]}

@app.post("/api/social/accounts", status_code=201)
def add_account(payload: AccountInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    platform, ident = payload.platform.lower().strip(), payload.identifier.strip()
    if platform not in social.PLATFORMS:
        raise HTTPException(status_code=400, detail="Supported platforms: YouTube and Instagram.")
    if db.query(TrackedAccount).filter(TrackedAccount.owner_id == user.id, TrackedAccount.platform == platform, TrackedAccount.identifier == ident).first():
        raise HTTPException(status_code=409, detail="You are already tracking this account.")
    try:  # verify with the real API before saving
        social.get_live(platform, ident, force=True)
    except social.SocialError as e:
        raise HTTPException(status_code=400, detail=str(e))
    row = TrackedAccount(owner_id=user.id, platform=platform, identifier=ident, label=payload.label.strip())
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id}

@app.delete("/api/social/accounts/{account_id}")
def remove_account(account_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(TrackedAccount, account_id)
    if not row or row.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found.")
    db.delete(row); db.commit()
    return {"ok": True}

# ------------------------------------------------------------------ campaigns
class CampaignInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    platform: str = Field(default="Multi-platform", max_length=40)
    budget: int = Field(default=0, ge=0, le=2_000_000_000)
    spent: int = Field(default=0, ge=0, le=2_000_000_000)
    revenue: int = Field(default=0, ge=0, le=2_000_000_000)
    status: str = Field(default="Planning", pattern=r"^(Planning|Running|Completed)$")
    start_date: str = Field(default="", max_length=10)
    end_date: str = Field(default="", max_length=10)

def team_user(user: User = Depends(current_user)) -> User:
    if user.role not in TEAM_ROLES:
        raise HTTPException(status_code=403, detail="Agency or Marketing Team access required.")
    return user

def _campaign_json(c: Campaign) -> dict:
    return {k: getattr(c, k) for k in ("id", "name", "platform", "budget", "spent", "revenue", "status", "start_date", "end_date")}

@app.get("/api/campaigns")
def list_campaigns(user: User = Depends(team_user), db: Session = Depends(get_db)):
    rows = db.query(Campaign).filter(Campaign.owner_id == user.id).order_by(Campaign.id.desc()).all()
    return {"campaigns": [_campaign_json(c) for c in rows]}

@app.post("/api/campaigns", status_code=201)
def create_campaign(payload: CampaignInput, user: User = Depends(team_user), db: Session = Depends(get_db)):
    c = Campaign(owner_id=user.id, **payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return _campaign_json(c)

@app.put("/api/campaigns/{campaign_id}")
def update_campaign(campaign_id: int, payload: CampaignInput, user: User = Depends(team_user), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or c.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return _campaign_json(c)

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, user: User = Depends(team_user), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or c.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    db.delete(c); db.commit()
    return {"ok": True}
