import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt
from dotenv import load_dotenv

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

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

Base.metadata.create_all(bind=engine)

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

@app.post("/api/auth/register", response_model=UserOutput, status_code=201)
def register(payload: RegisterInput, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first(): raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
    # Admin registration is only permitted for explicitly allow-listed emails.
    requested_role = payload.role if payload.role in {"Creator", "Agency", "Marketing Team", "Admin"} else "Creator"
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
    return {"profile_complete": bool(profile and profile.handle and profile.display_name), "metrics": [
        {"label": "Total followers", "value": "—", "change": "Connect a social platform to load data"},
        {"label": "Engagement rate", "value": "—", "change": "Waiting for connected account data"},
        {"label": "Content published", "value": "—", "change": "Content metrics will appear here"},
        {"label": "Total reach", "value": "—", "change": "Audience metrics will appear here"},
    ], "note": "Social platform OAuth integrations are not configured yet."}


@app.get("/api/admin/users")
def admin_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "Admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    accounts = db.query(User).order_by(User.created_at.desc()).all()
    return {"users": [{"id": item.id, "name": item.name, "email": item.email, "role": item.role, "is_active": item.is_active, "created_at": item.created_at.isoformat() if item.created_at else None} for item in accounts]}
