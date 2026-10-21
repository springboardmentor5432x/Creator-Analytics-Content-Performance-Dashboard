
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

# CONFIGURATION
load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

app = FastAPI(title="CreatorIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

engine = (
    create_engine(DATABASE_URL, pool_pre_ping=True)
    if DATABASE_URL
    else None
)



# MODELS
UserRole = Literal["creator", "admin", "agency", "marketing_team"]

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "creator"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class FollowerSnapshot(BaseModel):
    platform: Literal["instagram", "youtube", "x", "linkedin"]
    followers: int = Field(ge=0)



# DATABASE AND AUTHENTICATION HELPERS
def get_engine():
    if engine is None:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL is missing from backend/.env.",
        )
    return engine


def create_access_token(user_id: int, email: str) -> str:
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is missing from backend/.env.",
        )

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def public_user(user) -> dict:
    return {
        "user_id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is not configured.",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        with get_engine().connect() as connection:
            user = connection.execute(
                text("""
                    SELECT user_id, name, email, role, is_active
                    FROM public.users
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id},
            ).mappings().first()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed.",
        )

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=401,
            detail="Your account is unavailable.",
        )

    return public_user(user)



# BASIC ROUTES


@app.get("/")
def home():
    return {
        "message": "CreatorIQ API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def database_check():
    try:
        with get_engine().connect() as connection:
            version = connection.execute(
                text("SELECT version()")
            ).scalar_one()

        return {
            "database": "connected",
            "version": version,
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check DATABASE_URL and SSL settings.",
        )



# SIGNUP


@app.post("/signup", status_code=201)
def signup(data: SignupRequest):
    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Name is required.",
        )

    try:
        with get_engine().begin() as connection:
            user = connection.execute(
                text("""
                    INSERT INTO public.users
                        (name, email, password_hash, role)
                    VALUES
                        (:name, :email, :password_hash, :role)
                    RETURNING
                        user_id, name, email, role, is_active, created_at
                """),
                {
                    "name": name,
                    "email": email,
                    "password_hash": password_hash.hash(data.password),
                    "role": data.role,
                },
            ).mappings().one()

        return {
            "message": "Registration successful.",
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "is_active": user["is_active"],
            },
        }

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not complete registration. Check the users table and database.",
        )



# LOGIN


@app.post("/login")
def login(data: LoginRequest):
    email = str(data.email).strip().lower()

    try:
        with get_engine().connect() as connection:
            user = connection.execute(
                text("""
                    SELECT
                        user_id,
                        name,
                        email,
                        password_hash,
                        role,
                        is_active
                    FROM public.users
                    WHERE email = :email
                """),
                {"email": email},
            ).mappings().first()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed.",
        )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    try:
        valid_password = password_hash.verify(
            data.password,
            user["password_hash"],
        )
    except Exception:
        valid_password = False

    if not valid_password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    return {
        "message": "Login successful.",
        "access_token": create_access_token(
            user["user_id"],
            user["email"],
        ),
        "token_type": "bearer",
        "expires_in": TOKEN_EXPIRE_MINUTES * 60,
        "user": public_user(user),
    }



# CURRENT USER PROFILE
@app.get("/me")
def my_profile(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


# DASHBOARD ANALYTIC
@app.get("/dashboard/analytics")
def dashboard_analytics(
    current_user: dict = Depends(get_current_user),
):
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(
                text("""
                    SELECT DISTINCT ON (platform)
                        platform,
                        followers,
                        recorded_at
                    FROM public.follower_snapshots
                    WHERE user_id = :user_id
                    ORDER BY platform, recorded_at DESC
                """),
                {"user_id": current_user["user_id"]},
            ).mappings().all()

        platforms = {
            row["platform"]: row["followers"]
            for row in rows
        }

        return {
            "demo_mode": False,
            "total_followers": sum(platforms.values()),
            "platforms": platforms,
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not load dashboard analytics. Check the follower_snapshots table.",
        )


# SAVE FOLLOWER SNAPSHOT
@app.post("/dashboard/snapshots", status_code=201)
def save_follower_snapshot(
    data: FollowerSnapshot,
    current_user: dict = Depends(get_current_user),
):
    try:
        with get_engine().begin() as connection:
            connection.execute(
                text("""
                    INSERT INTO public.follower_snapshots
                        (user_id, platform, followers)
                    VALUES
                        (:user_id, :platform, :followers)
                """),
                {
                    "user_id": current_user["user_id"],
                    "platform": data.platform,
                    "followers": data.followers,
                },
            )

        return {"message": "Follower snapshot saved."}

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not save follower snapshot.",
        )


# DASHBOARD GROWTH HISTORY
@app.get("/dashboard/growth")
def dashboard_growth(
    current_user: dict = Depends(get_current_user),
):
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(
                text("""
                    SELECT
                        recorded_at,
                        SUM(followers) AS total_followers
                    FROM public.follower_snapshots
                    WHERE user_id = :user_id
                    GROUP BY recorded_at
                    ORDER BY recorded_at ASC
                """),
                {"user_id": current_user["user_id"]},
            ).mappings().all()

        return {
            "demo_mode": False,
            "growth": [
                {
                    "date": row["recorded_at"].isoformat(),
                    "followers": row["total_followers"],
                }
                for row in rows
            ],
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not load growth history.",
        )
