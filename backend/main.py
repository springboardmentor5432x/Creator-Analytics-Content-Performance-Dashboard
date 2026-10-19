
import os
import traceback
from pathlib import Path
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
import jwt
from pwdlib import PasswordHash
from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from database import engine, test_database_connection


app = FastAPI(title="CreatorIQ API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is missing. Add it to backend/.env."
    )


# -------------------- REQUEST MODELS --------------------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "creator"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# -------------------- HOME ENDPOINT --------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to CreatorIQ API!",
        "status": "running",
    }


# -------------------- DATABASE HEALTH --------------------

@app.get("/health/database")
def database_health():
    try:
        result = test_database_connection()
        return {
            "database": "connected",
            "test_query_result": result,
        }
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed.",
        )



# -------------------- REGISTRATION --------------------

@app.post(
    "/api/auth/register",
    status_code=status.HTTP_201_CREATED,
)
def register_user(user: RegisterRequest):
    name = user.name.strip()
    email = str(user.email).strip().lower()
    role = user.role.strip().lower()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name cannot be empty.",
        )

    if role not in {"creator", "agency", "marketing_team", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role must be creator, agency, marketing_team, or admin.",
        )

    hashed_password = password_hash.hash(user.password)

    try:
        with engine.begin() as connection:
            existing_user = connection.execute(
                text("""
                    SELECT user_id
                    FROM users
                    WHERE email = :email
                """),
                {"email": email},
            ).first()

            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists.",
                )

            result = connection.execute(
                text("""
                    INSERT INTO users
                        (name, email, password_hash, role)
                    VALUES
                        (:name, :email, :password_hash, :role)
                    RETURNING
                        user_id, name, email, role, created_at
                """),
                {
                    "name": name,
                    "email": email,
                    "password_hash": hashed_password,
                    "role": role,
                },
            )

            new_user = result.mappings().one()

            # Create a creator profile automatically for creator accounts.
            if role == "creator":
                connection.execute(
                    text("""
                        INSERT INTO creators (user_id, creator_name)
                        VALUES (:user_id, :creator_name)
                    """),
                    {
                        "user_id": new_user["user_id"],
                        "creator_name": name,
                    },
                )

        return {
            "message": "User registered successfully.",
            "user": {
                "user_id": new_user["user_id"],
                "name": new_user["name"],
                "email": new_user["email"],
                "role": new_user["role"],
                "created_at": new_user["created_at"],
            },
        }

    except HTTPException:
        raise

    except IntegrityError as exc:
        print("REGISTRATION INTEGRITY ERROR:", str(exc.orig), flush=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflict. Check the backend terminal for the database constraint.",
            )

    except SQLAlchemyError:
        print("REGISTRATION DATABASE ERROR:", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save the user. Check the VS Code terminal.",
        )

# -------------------- LOGIN WITH JWT --------------------

@app.post("/api/auth/login")
def login_user(user: LoginRequest):
    email = str(user.email).strip().lower()

    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("""
                    SELECT
                        user_id, name, email,
                        password_hash, role, is_active
                    FROM users
                    WHERE email = :email
                """),
                {"email": email},
            )

            db_user = result.mappings().first()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error. Please try again.",
        )

    # Use the same generic error for unknown emails and wrong passwords.
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        password_is_valid = password_hash.verify(
            user.password,
            db_user["password_hash"],
        )
    except (ValueError, TypeError):
        password_is_valid = False

    if not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not db_user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(db_user["user_id"]),
        "email": db_user["email"],
        "role": db_user["role"],
        "iat": now,
        "exp": now + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    access_token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "user_id": db_user["user_id"],
            "name": db_user["name"],
            "email": db_user["email"],
            "role": db_user["role"],
        },
    }


# -------------------- AUTHENTICATED DASHBOARD API --------------------

@app.get("/api/dashboard")
def get_dashboard(authorization: str | None = Header(default=None)):
    # Require a Bearer token.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:].strip()

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        with engine.connect() as connection:
            user_result = connection.execute(
                text("""
                    SELECT user_id, name, email, role
                    FROM users
                    WHERE user_id = :user_id
                      AND is_active = TRUE
                """),
                {"user_id": user_id},
            )
            user = user_result.mappings().first()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive.",
                )

            creator_result = connection.execute(
                text("""
                    SELECT creator_id, creator_name
                    FROM creators
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id},
            )
            creator = creator_result.mappings().first()

            accounts = []
            stats = {
                "total_followers": 0,
                "total_views": 0,
                "total_likes": 0,
                "total_comments": 0,
                "total_shares": 0,
                "engagement_rate": 0,
                "recorded_revenue": 0,
            }
            top_content = []

            if creator:
                creator_id = creator["creator_id"]

                account_result = connection.execute(
                    text("""
                        SELECT account_id, platform, username, followers,
                               is_active, connected_at
                        FROM social_accounts
                        WHERE creator_id = :creator_id
                          AND is_active = TRUE
                        ORDER BY account_id
                    """),
                    {"creator_id": creator_id},
                )
                accounts = [
                    dict(row)
                    for row in account_result.mappings().all()
                ]

                metrics_result = connection.execute(
                    text("""
                        SELECT
                            COALESCE(SUM(sa.followers), 0) AS total_followers,
                            COALESCE(SUM(pa.views), 0) AS total_views,
                            COALESCE(SUM(pa.likes), 0) AS total_likes,
                            COALESCE(SUM(pa.comments), 0) AS total_comments,
                            COALESCE(SUM(pa.shares), 0) AS total_shares,
                            COALESCE(AVG(pa.engagement_rate), 0)
                                AS engagement_rate
                        FROM social_accounts sa
                        LEFT JOIN posts p
                            ON p.account_id = sa.account_id
                        LEFT JOIN post_analytics pa
                            ON pa.post_id = p.post_id
                        WHERE sa.creator_id = :creator_id
                          AND sa.is_active = TRUE
                    """),
                    {"creator_id": creator_id},
                )
                metrics = metrics_result.mappings().one()

                # Followers are stored per account, so calculate them
                # separately to avoid counting them once per post.
                follower_result = connection.execute(
                    text("""
                        SELECT COALESCE(SUM(followers), 0)
                        FROM social_accounts
                        WHERE creator_id = :creator_id
                          AND is_active = TRUE
                    """),
                    {"creator_id": creator_id},
                )

                revenue_result = connection.execute(
                    text("""
                        SELECT COALESCE(SUM(amount), 0)
                        FROM revenue
                        WHERE creator_id = :creator_id
                    """),
                    {"creator_id": creator_id},
                )

                content_result = connection.execute(
                    text("""
                        SELECT
                            p.post_id,
                            p.caption,
                            p.content_type,
                            p.post_url,
                            COALESCE(pa.views, 0) AS views,
                            COALESCE(pa.likes, 0) AS likes,
                            COALESCE(pa.comments, 0) AS comments,
                            COALESCE(pa.engagement_rate, 0)
                                AS engagement_rate
                        FROM posts p
                        JOIN social_accounts sa
                            ON sa.account_id = p.account_id
                        LEFT JOIN post_analytics pa
                            ON pa.post_id = p.post_id
                        WHERE sa.creator_id = :creator_id
                          AND sa.is_active = TRUE
                        ORDER BY COALESCE(pa.views, 0) DESC
                        LIMIT 5
                    """),
                    {"creator_id": creator_id},
                )

                stats = {
                    "total_followers": int(follower_result.scalar_one()),
                    "total_views": int(metrics["total_views"]),
                    "total_likes": int(metrics["total_likes"]),
                    "total_comments": int(metrics["total_comments"]),
                    "total_shares": int(metrics["total_shares"]),
                    "engagement_rate": float(metrics["engagement_rate"]),
                    "recorded_revenue": float(revenue_result.scalar_one()),
                }
                top_content = [
                    dict(row)
                    for row in content_result.mappings().all()
                ]

    except HTTPException:
        raise
    except SQLAlchemyError:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not retrieve dashboard data.",
        )

    return {
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
        "creator_profile_exists": creator is not None,
        "stats": stats,
        "social_accounts": accounts,
        "top_content": top_content,
    }
