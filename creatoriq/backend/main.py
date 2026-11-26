
import os
import re
import html
import base64
import hashlib
import secrets
from urllib.parse import urlencode
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal, List, Optional

import jwt
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse, PlainTextResponse
from cryptography.fernet import Fernet, InvalidToken
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
MAX_YOUTUBE_VIDEOS = max(
    1, int(os.getenv("MAX_YOUTUBE_VIDEOS", "200"))
)

X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID")
META_GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v27.0")
LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
LINKEDIN_ORG_ID = os.getenv("LINKEDIN_ORG_ID")
LINKEDIN_VERSION = os.getenv("LINKEDIN_VERSION", "202605")

app = FastAPI(title="CreatorIQ API", version="2.1.0")


# ============================================================
# INSTAGRAM WEBHOOK VERIFICATION
# ============================================================
# Set INSTAGRAM_WEBHOOK_VERIFY_TOKEN in Render environment variables.
# Enter the same value in Meta > Configure webhooks > Verify Token.

INSTAGRAM_WEBHOOK_VERIFY_TOKEN = os.getenv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN")


@app.get("/webhooks/instagram", tags=["Instagram Webhooks"])
def verify_instagram_webhook(
    mode: Optional[str] = Query(default=None, alias="hub.mode"),
    token: Optional[str] = Query(default=None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(default=None, alias="hub.challenge"),
):
    """Handle Meta's GET webhook verification challenge."""
    if (
        mode == "subscribe"
        and INSTAGRAM_WEBHOOK_VERIFY_TOKEN
        and secrets.compare_digest(
            token or "",
            INSTAGRAM_WEBHOOK_VERIFY_TOKEN
        )
        and challenge is not None
    ):
        return PlainTextResponse(content=challenge, status_code=200)

    raise HTTPException(
        status_code=403,
        detail="Instagram webhook verification failed."
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

engine = (
    create_engine(DATABASE_URL, pool_pre_ping=True)
    if DATABASE_URL
    else None
)


# ============================================================
# REQUEST MODELS
# ============================================================

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    # Public signup must never grant admin/agency privileges.
    role: Literal["creator"] = "creator"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class FollowerSnapshot(BaseModel):
    platform: Literal["instagram", "youtube", "x", "linkedin"]
    followers: int = Field(ge=0)


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    platform: Literal["instagram", "youtube", "x", "linkedin", "multi-platform"]
    description: str = Field(default="", max_length=5000)
    budget: Optional[Decimal] = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    status: Literal["planning", "active", "paused", "completed"] = "planning"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @staticmethod
    def validate_dates(start_date, end_date):
        if start_date and end_date and end_date < start_date:
            raise ValueError("End date cannot be before start date.")

    def model_post_init(self, __context):
        self.validate_dates(self.start_date, self.end_date)


class CampaignUpdate(CampaignCreate):
    pass


# ============================================================
# DATABASE AND AUTHENTICATION HELPERS
# ============================================================

def get_engine():
    if engine is None:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL is missing from .env.",
        )
    return engine


def create_access_token(user_id: int, email: str) -> str:
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is missing from .env.",
        )

    now = datetime.now(timezone.utc)

    return jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
            "iat": now,
            "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
        },
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
        with get_engine().connect() as conn:
            user = conn.execute(
                text("""
                    SELECT user_id, name, email, role, is_active
                    FROM public.users
                    WHERE user_id = :uid
                """),
                {"uid": user_id},
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


def require_roles(*roles):
    def check_role(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this resource.",
            )
        return user

    return check_role


def iso_value(value):
    return value.isoformat() if hasattr(value, "isoformat") else value


def serialize_rows(rows):
    result = []
    for row in rows:
        item = dict(row)
        for key, value in item.items():
            if isinstance(value, (datetime,)):
                item[key] = value.isoformat()
        result.append(item)
    return result


# ============================================================
# BASIC SYSTEM ROUTES
# ============================================================

@app.get("/")
def home():
    return {"message": "CreatorIQ API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def database_check():
    try:
        with get_engine().connect() as conn:
            version = conn.execute(text("SELECT version()")).scalar_one()

        return {"database": "connected", "version": version}

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed. Check DATABASE_URL and SSL settings.",
        )


# ============================================================
# SIGNUP, LOGIN, PROFILE
# ============================================================

@app.post("/signup", status_code=201)
def signup(data: SignupRequest):
    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(status_code=422, detail="Name is required.")

    try:
        with get_engine().begin() as conn:
            user = conn.execute(
                text("""
                    INSERT INTO public.users
                        (name, email, password_hash, role)
                    VALUES
                        (:name, :email, :password_hash, 'creator')
                    RETURNING user_id, name, email, role, is_active
                """),
                {
                    "name": name,
                    "email": email,
                    "password_hash": password_hash.hash(data.password),
                },
            ).mappings().one()

        return {
            "message": "Registration successful.",
            "user": public_user(user),
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


@app.post("/login")
def login(data: LoginRequest):
    email = str(data.email).strip().lower()

    try:
        with get_engine().connect() as conn:
            user = conn.execute(
                text("""
                    SELECT user_id, name, email, password_hash, role, is_active
                    FROM public.users
                    WHERE email = :email
                """),
                {"email": email},
            ).mappings().first()

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database connection failed.")

    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    try:
        valid = password_hash.verify(data.password, user["password_hash"])
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="This account is inactive.")

    return {
        "message": "Login successful.",
        "access_token": create_access_token(user["user_id"], user["email"]),
        "token_type": "bearer",
        "expires_in": TOKEN_EXPIRE_MINUTES * 60,
        "user": public_user(user),
    }


@app.get("/me")
def my_profile(user=Depends(get_current_user)):
    return {"user": user}


# ============================================================
# AUDIENCE ANALYTICS AND FOLLOWER GROWTH
# ============================================================

@app.get("/dashboard/analytics")
def dashboard_analytics(user=Depends(get_current_user)):
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT DISTINCT ON (platform)
                        platform, followers, recorded_at
                    FROM public.follower_snapshots
                    WHERE user_id = :uid
                    ORDER BY platform, recorded_at DESC
                """),
                {"uid": user["user_id"]},
            ).mappings().all()

        # Keep missing platform snapshots as null rather than presenting them
        # as a genuine zero-follower reading in the dashboard.
        platforms = {
            r["platform"]: (
                int(r["followers"]) if r["followers"] is not None else None
            )
            for r in rows
        }
        total_followers = sum(
            value for value in platforms.values() if value is not None
        )

        return {
            "demo_mode": False,
            "total_followers": total_followers,
            "platforms": platforms,
        }

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load dashboard analytics.")


@app.post("/dashboard/snapshots", status_code=201)
def save_follower_snapshot(data: FollowerSnapshot, user=Depends(get_current_user)):
    try:
        with get_engine().begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO public.follower_snapshots
                        (user_id, platform, followers)
                    VALUES (:uid, :platform, :followers)
                """),
                {
                    "uid": user["user_id"],
                    "platform": data.platform,
                    "followers": data.followers,
                },
            )

        return {"message": "Follower snapshot saved."}

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not save follower snapshot.")


@app.get("/dashboard/growth")
def dashboard_growth(user=Depends(get_current_user)):
    """Return recent daily follower totals using each platform's latest known count as of that day."""
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text("""
                    WITH snapshot_dates AS (
                        SELECT DISTINCT DATE(recorded_at) AS snapshot_date
                        FROM public.follower_snapshots
                        WHERE user_id = :uid
                        ORDER BY snapshot_date DESC
                        LIMIT 7
                    ),
                    platforms AS (
                        SELECT DISTINCT platform
                        FROM public.follower_snapshots
                        WHERE user_id = :uid
                    )
                    SELECT
                        dates.snapshot_date,
                        COALESCE(SUM(latest.followers), 0)::BIGINT AS total_followers
                    FROM snapshot_dates AS dates
                    CROSS JOIN platforms
                    LEFT JOIN LATERAL (
                        SELECT fs.followers
                        FROM public.follower_snapshots AS fs
                        WHERE fs.user_id = :uid
                          AND fs.platform = platforms.platform
                          AND fs.recorded_at < dates.snapshot_date + INTERVAL '1 day'
                        ORDER BY fs.recorded_at DESC
                        LIMIT 1
                    ) AS latest ON TRUE
                    GROUP BY dates.snapshot_date
                    ORDER BY dates.snapshot_date ASC
                """),
                {"uid": user["user_id"]},
            ).mappings().all()

        return {
            "demo_mode": False,
            "growth": [
                {
                    "date": r["snapshot_date"].isoformat(),
                    "followers": int(r["total_followers"]),
                }
                for r in rows
            ],
        }

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load growth history.")


# ============================================================
# CONTENT ANALYTICS
# ============================================================

@app.get("/analytics/content/overview", tags=["Content Analytics"])
def get_content_overview(user=Depends(get_current_user)):
    uid = user["user_id"]

    try:
        with get_engine().connect() as conn:
            total_posts = conn.execute(
                text("""
                    SELECT COUNT(*)
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                """),
                {"uid": uid},
            ).scalar_one()

            totals = conn.execute(
                text("""
                    SELECT
                        COALESCE(SUM(views), 0) AS total_views,
                        COALESCE(SUM(likes), 0) AS total_likes,
                        COALESCE(SUM(comments), 0) AS total_comments
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                """),
                {"uid": uid},
            ).mappings().one()

            top_views = conn.execute(
                text("""
                    SELECT video_id, title, views, likes, comments,
                           thumbnail_url, published_at
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                    ORDER BY views DESC NULLS LAST, published_at DESC NULLS LAST
                    LIMIT 5
                """),
                {"uid": uid},
            ).mappings().all()

            top_engagement = conn.execute(
                text("""
                    SELECT video_id, title, views, likes, comments,
                           thumbnail_url, published_at,
                           (COALESCE(likes, 0) + COALESCE(comments, 0))
                               AS total_engagement,
                           ROUND(
                               CASE WHEN views > 0
                               THEN (
                                   (COALESCE(likes, 0) + COALESCE(comments, 0))
                                   ::numeric / views
                               ) * 100
                               ELSE 0 END,
                               2
                           ) AS engagement_rate
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                    ORDER BY total_engagement DESC, views DESC
                    LIMIT 5
                """),
                {"uid": uid},
            ).mappings().all()

            posts = conn.execute(
                text("""
                    SELECT video_id, title, views, likes, comments,
                           thumbnail_url, published_at
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                    ORDER BY published_at DESC NULLS LAST
                """),
                {"uid": uid},
            ).mappings().all()

        return {
            "total_posts": total_posts,
            "metrics": dict(totals),
            "top_by_views": serialize_rows(top_views),
            "top_by_engagement": serialize_rows(top_engagement),
            "posts_list": serialize_rows(posts),
        }

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not retrieve content analytics.")


@app.get("/analytics/content/compare", tags=["Content Analytics"])
def compare_posts(
    post_id_1: str = Query(min_length=1),
    post_id_2: str = Query(min_length=1),
    user=Depends(get_current_user),
):
    if post_id_1 == post_id_2:
        raise HTTPException(status_code=422, detail="Select two distinct videos.")

    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT video_id, title, views, likes, comments,
                           thumbnail_url, published_at,
                           (COALESCE(likes, 0) + COALESCE(comments, 0))
                               AS engagement,
                           ROUND(
                               CASE WHEN views > 0
                               THEN (
                                   (COALESCE(likes, 0) + COALESCE(comments, 0))
                                   ::numeric / views
                               ) * 100
                               ELSE 0 END,
                               2
                           ) AS engagement_rate
                    FROM public.youtube_videos
                    WHERE user_id = :uid
                      AND video_id IN (:p1, :p2)
                """),
                {
                    "uid": user["user_id"],
                    "p1": post_id_1,
                    "p2": post_id_2,
                },
            ).mappings().all()

        by_id = {r["video_id"]: r for r in rows}

        if len(by_id) != 2:
            raise HTTPException(
                status_code=404,
                detail="One or both videos were not found in your account.",
            )

        return {
            "comparison": [
                dict(by_id[post_id_1]),
                dict(by_id[post_id_2]),
            ]
        }

    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Error fetching comparison data.")


@app.get("/analytics/audience/demographics", tags=["Audience Analytics"])
def get_audience_demographics(user=Depends(get_current_user)):
    """Return stored demographics only. Never invent audience percentages."""
    try:
        with get_engine().connect() as conn:
            exists = conn.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'audience_demographics'
                    )
                """)
            ).scalar_one()

            if not exists:
                return {
                    "source": "unavailable",
                    "message": "Audience demographics have not been configured.",
                    "records": [],
                }

            rows = conn.execute(
                text("""
                    SELECT dimension_type, dimension_value, percentage
                    FROM public.audience_demographics
                    WHERE user_id = :uid
                    ORDER BY dimension_type, dimension_value
                """),
                {"uid": user["user_id"]},
            ).mappings().all()

        if not rows:
            return {
                "source": "unavailable",
                "message": "No verified demographic data is available.",
                "records": [],
            }

        return {"source": "stored", "records": serialize_rows(rows)}

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load demographics data.")


# ============================================================
# ROLE-BASED AGGREGATE STATS
# ============================================================

@app.get("/dashboard/role-data")
def get_role_data(user=Depends(get_current_user)):
    """Return database-backed aggregates appropriate to the signed-in role.

    No campaign spend, ROI, campaign counts, or demographic percentages are
    fabricated: those require separate tables/data sources.
    """
    role = user["role"]
    try:
        with get_engine().connect() as conn:
            if role == "admin":
                counts = conn.execute(text("""
                    SELECT role, COUNT(*) AS count,
                           COUNT(*) FILTER (WHERE is_active = TRUE) AS active_count
                    FROM public.users
                    GROUP BY role
                """)).mappings().all()
                users_by_role = {r["role"]: int(r["count"]) for r in counts}
                active_by_role = {r["role"]: int(r["active_count"]) for r in counts}
                user_rows = conn.execute(text("""
                    SELECT user_id, name, email, role, is_active
                    FROM public.users
                    ORDER BY user_id DESC
                    LIMIT 500
                """)).mappings().all()
                users = [
                    {
                        "user_id": int(row["user_id"]),
                        "name": row["name"],
                        "email": row["email"],
                        "role": row["role"],
                        "is_active": bool(row["is_active"]),
                        "status": "Active" if row["is_active"] else "Inactive",
                    }
                    for row in user_rows
                ]
                totals = conn.execute(text("""
                    WITH latest_followers AS (
                        SELECT DISTINCT ON (user_id, platform)
                               user_id, platform, followers
                        FROM public.follower_snapshots
                        ORDER BY user_id, platform, recorded_at DESC
                    )
                    SELECT
                        (SELECT COUNT(*) FROM public.youtube_channels) AS total_channels,
                        (SELECT COUNT(*) FROM public.youtube_videos) AS total_videos,
                        (SELECT COALESCE(SUM(views), 0) FROM public.youtube_videos) AS total_views,
                        (SELECT COALESCE(SUM(likes), 0) FROM public.youtube_videos) AS total_likes,
                        (SELECT COALESCE(SUM(comments), 0) FROM public.youtube_videos) AS total_comments,
                        (SELECT COALESCE(SUM(followers), 0) FROM latest_followers) AS total_followers
                """)).mappings().one()
                return {
                    "role": role,
                    "source": "database",
                    "total_users": sum(users_by_role.values()),
                    "active_users": sum(active_by_role.values()),
                    "users_by_role": users_by_role,
                    "active_by_role": active_by_role,
                    "users": users,
                    **{k: int(v or 0) for k, v in totals.items()},
                }

            if role in ("agency", "marketing_team"):
                # There is currently no agency-to-creator assignment table in
                # this schema. Return aggregate metrics only, not other users'
                # names/emails or row-level creator data.
                totals = conn.execute(text("""
                    WITH latest_followers AS (
                        SELECT DISTINCT ON (fs.user_id, fs.platform)
                               fs.user_id, fs.platform, fs.followers
                        FROM public.follower_snapshots fs
                        JOIN public.users u ON u.user_id = fs.user_id
                        WHERE u.role = 'creator'
                        ORDER BY fs.user_id, fs.platform, fs.recorded_at DESC
                    )
                    SELECT
                        (SELECT COUNT(*) FROM public.users WHERE role = 'creator') AS total_creators,
                        (SELECT COUNT(*) FROM public.youtube_channels yc
                         JOIN public.users u ON u.user_id = yc.user_id
                         WHERE u.role = 'creator') AS total_channels,
                        (SELECT COUNT(*) FROM public.youtube_videos yv
                         JOIN public.users u ON u.user_id = yv.user_id
                         WHERE u.role = 'creator') AS total_videos,
                        (SELECT COALESCE(SUM(yv.views), 0) FROM public.youtube_videos yv
                         JOIN public.users u ON u.user_id = yv.user_id
                         WHERE u.role = 'creator') AS total_views,
                        (SELECT COALESCE(SUM(yv.likes), 0) FROM public.youtube_videos yv
                         JOIN public.users u ON u.user_id = yv.user_id
                         WHERE u.role = 'creator') AS total_likes,
                        (SELECT COALESCE(SUM(yv.comments), 0) FROM public.youtube_videos yv
                         JOIN public.users u ON u.user_id = yv.user_id
                         WHERE u.role = 'creator') AS total_comments,
                        (SELECT COALESCE(SUM(followers), 0) FROM latest_followers) AS total_followers
                """)).mappings().one()
                return {
                    "role": role,
                    "source": "database",
                    **{k: int(v or 0) for k, v in totals.items()},
                }

            raise HTTPException(status_code=403, detail="Unsupported role for role dashboard.")

    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load role dashboard metrics from the database.")

# ============================================================
# YOUTUBE DATA API HELPERS
# ============================================================

def youtube_api_get(endpoint: str, params: dict) -> dict:
    if not YOUTUBE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="YOUTUBE_API_KEY is missing from .env.",
        )

    try:
        response = requests.get(
            f"{YOUTUBE_API_BASE}/{endpoint}",
            params={**params, "key": YOUTUBE_API_KEY},
            timeout=20,
        )
        payload = response.json()

    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Could not connect to YouTube API.")
    except ValueError:
        raise HTTPException(status_code=502, detail="YouTube API returned invalid JSON.")

    if not response.ok:
        message = payload.get("error", {}).get(
            "message", "YouTube API request failed."
        )
        raise HTTPException(status_code=502, detail=f"YouTube API: {message}")

    return payload


def fetch_youtube_channel(identifier: str) -> dict:
    identifier = identifier.strip()

    if not identifier:
        raise HTTPException(status_code=422, detail="Enter a YouTube channel ID or @handle.")

    params = {"part": "snippet,statistics,contentDetails"}

    if identifier.startswith("@"):
        params["forHandle"] = identifier[1:]
    else:
        params["id"] = identifier

    items = youtube_api_get("channels", params).get("items", [])

    if not items:
        raise HTTPException(
            status_code=404,
            detail="Channel not found. Check the channel ID or @handle.",
        )

    return items[0]


def fetch_upload_video_ids(playlist_id: str, limit: int) -> List[str]:
    """Fetch upload IDs using pagination, up to the configured limit."""
    ids = []
    page_token = None

    while len(ids) < limit:
        params = {
            "part": "snippet,contentDetails",
            "playlistId": playlist_id,
            "maxResults": min(50, limit - len(ids)),
        }

        if page_token:
            params["pageToken"] = page_token

        payload = youtube_api_get("playlistItems", params)

        for item in payload.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId")
            if video_id and video_id not in ids:
                ids.append(video_id)

        page_token = payload.get("nextPageToken")

        if not page_token:
            break

    return ids


def fetch_youtube_videos(video_ids: List[str], user_id: int, channel_id: str, now):
    """YouTube videos.list accepts at most 50 IDs per request."""
    videos = []

    for start in range(0, len(video_ids), 50):
        batch = video_ids[start:start + 50]

        payload = youtube_api_get(
            "videos",
            {
                "part": "snippet,statistics",
                "id": ",".join(batch),
            },
        )

        for video in payload.get("items", []):
            snippet = video.get("snippet", {})
            stats = video.get("statistics", {})
            thumbnails = snippet.get("thumbnails", {})

            thumbnail = (
                thumbnails.get("high")
                or thumbnails.get("medium")
                or thumbnails.get("default")
                or {}
            )

            videos.append({
                "user_id": user_id,
                "channel_id": channel_id,
                "video_id": video["id"],
                "title": snippet.get("title", "Untitled"),
                "published_at": snippet.get("publishedAt"),
                "thumbnail_url": thumbnail.get("url"),
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0)),
                "last_synced_at": now,
            })

    return videos


# ============================================================
# YOUTUBE CHANNEL SYNC
# ============================================================

@app.get("/youtube/channel", tags=["YouTube"])
def connect_youtube_channel(
    identifier: str,
    user=Depends(get_current_user),
    limit: int = Query(default=None, ge=1, le=10000),
):
    channel = fetch_youtube_channel(identifier)

    channel_id = channel["id"]
    snippet = channel.get("snippet", {})
    stats = channel.get("statistics", {})
    content = channel.get("contentDetails", {})

    uid = user["user_id"]
    now = datetime.now(timezone.utc)

    subscribers = (
        int(stats["subscriberCount"])
        if "subscriberCount" in stats
        else None
    )

    channel_record = {
        "user_id": uid,
        "channel_id": channel_id,
        "title": snippet.get("title", "Unknown channel"),
        "custom_url": snippet.get("customUrl"),
        "thumbnail_url": (
            snippet.get("thumbnails", {}).get("default", {}).get("url")
        ),
        "subscriber_count": subscribers,
        "view_count": int(stats.get("viewCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "last_synced_at": now,
    }

    uploads_playlist = content.get("relatedPlaylists", {}).get("uploads")
    fetch_limit = min(limit or MAX_YOUTUBE_VIDEOS, 10000)

    videos = []

    if uploads_playlist:
        ids = fetch_upload_video_ids(uploads_playlist, fetch_limit)
        videos = fetch_youtube_videos(ids, uid, channel_id, now)

    try:
        with get_engine().begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO public.youtube_channels
                        (user_id, channel_id, title, custom_url,
                         thumbnail_url, subscriber_count, view_count,
                         video_count, last_synced_at)
                    VALUES
                        (:user_id, :channel_id, :title, :custom_url,
                         :thumbnail_url, :subscriber_count, :view_count,
                         :video_count, :last_synced_at)
                    ON CONFLICT (user_id, channel_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        custom_url = EXCLUDED.custom_url,
                        thumbnail_url = EXCLUDED.thumbnail_url,
                        subscriber_count = EXCLUDED.subscriber_count,
                        view_count = EXCLUDED.view_count,
                        video_count = EXCLUDED.video_count,
                        last_synced_at = EXCLUDED.last_synced_at
                """),
                channel_record,
            )

            for video in videos:
                conn.execute(
                    text("""
                        INSERT INTO public.youtube_videos
                            (user_id, channel_id, video_id, title,
                             published_at, thumbnail_url, views, likes,
                             comments, last_synced_at)
                        VALUES
                            (:user_id, :channel_id, :video_id, :title,
                             :published_at, :thumbnail_url, :views, :likes,
                             :comments, :last_synced_at)
                        ON CONFLICT (user_id, video_id) DO UPDATE SET
                            channel_id = EXCLUDED.channel_id,
                            title = EXCLUDED.title,
                            published_at = EXCLUDED.published_at,
                            thumbnail_url = EXCLUDED.thumbnail_url,
                            views = EXCLUDED.views,
                            likes = EXCLUDED.likes,
                            comments = EXCLUDED.comments,
                            last_synced_at = EXCLUDED.last_synced_at
                    """),
                    video,
                )

            if subscribers is not None:
                conn.execute(
                    text("""
                        INSERT INTO public.follower_snapshots
                            (user_id, platform, followers)
                        VALUES (:uid, 'youtube', :followers)
                    """),
                    {"uid": uid, "followers": subscribers},
                )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="YouTube data was fetched but could not be saved to the database.",
        )

    return {
        "success": True,
        "platform": "youtube",
        "channel": {
            **channel_record,
            "last_synced_at": now.isoformat(),
        },
        "videos": [
            {**video, "last_synced_at": now.isoformat()}
            for video in videos
        ],
        "fetched_video_count": len(videos),
        "configured_video_limit": fetch_limit,
        "data_source": "YouTube Data API v3",
        "is_public_data": True,
    }


@app.get("/youtube/my-channel", tags=["YouTube"])
def get_my_saved_youtube_channel(user=Depends(get_current_user)):
    """Return the signed-in creator's latest saved YouTube channel and videos."""
    try:
        with get_engine().connect() as conn:
            channel = conn.execute(text("""
                SELECT user_id, channel_id, title, custom_url, thumbnail_url,
                       subscriber_count, view_count, video_count, last_synced_at
                FROM public.youtube_channels
                WHERE user_id = :uid
                ORDER BY last_synced_at DESC NULLS LAST
                LIMIT 1
            """), {"uid": user["user_id"]}).mappings().first()
            if channel is None:
                return {"success": True, "channel": None, "videos": []}
            videos = conn.execute(text("""
                SELECT video_id, channel_id, title, published_at, thumbnail_url,
                       views, likes, comments, last_synced_at
                FROM public.youtube_videos
                WHERE user_id = :uid AND channel_id = :channel_id
                ORDER BY published_at DESC NULLS LAST
                LIMIT 50
            """), {"uid": user["user_id"], "channel_id": channel["channel_id"]}).mappings().all()
        return {"success": True, "channel": serialize_rows([channel])[0],
                "videos": serialize_rows(videos), "data_source": "Saved database records"}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load your saved YouTube channel.")


@app.get("/youtube/videos", tags=["YouTube"])
def get_saved_youtube_videos(
    channel_id: str,
    limit: int = Query(default=50, ge=1, le=500),
    user=Depends(get_current_user),
):
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT video_id, channel_id, title, published_at,
                           thumbnail_url, views, likes, comments, last_synced_at
                    FROM public.youtube_videos
                    WHERE user_id = :uid AND channel_id = :channel_id
                    ORDER BY published_at DESC NULLS LAST
                    LIMIT :limit
                """),
                {
                    "uid": user["user_id"],
                    "channel_id": channel_id,
                    "limit": limit,
                },
            ).mappings().all()

        return {"success": True, "videos": serialize_rows(rows)}

    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load saved YouTube videos.")




# ============================================================
# PUBLIC ACCOUNT SEARCH
# Search public metrics without saving another account's data
# into the signed-in user's own follower history.
# ============================================================

@app.get("/public-search", tags=["Public Account Search"])
def public_account_search(
    platform: Literal["youtube", "x", "instagram", "linkedin"],
    identifier: str = Query(min_length=1, max_length=300),
    user=Depends(get_current_user),
):
    identifier = identifier.strip()
    if not identifier:
        raise HTTPException(
            status_code=422,
            detail="Enter a public account handle, channel ID, or URL.",
        )

    # YouTube: public channel metrics and up to 10 latest public videos.
    if platform == "youtube":
        channel_identifier = identifier

        if "youtube.com/" in identifier:
            from urllib.parse import urlparse

            parsed = urlparse(
                identifier if "://" in identifier else "https://" + identifier
            )
            parts = [part for part in parsed.path.split("/") if part]

            if parts and parts[0].startswith("@"):
                channel_identifier = parts[0]
            elif len(parts) >= 2 and parts[0] == "channel":
                channel_identifier = parts[1]
            elif len(parts) >= 2 and parts[0] in ("c", "user"):
                channel_identifier = "@" + parts[1]
            else:
                raise HTTPException(
                    status_code=422,
                    detail="Use a YouTube channel ID, @handle, or supported channel URL.",
                )

        channel = fetch_youtube_channel(channel_identifier)
        snippet = channel.get("snippet", {})
        statistics = channel.get("statistics", {})
        uploads_playlist = (
            channel.get("contentDetails", {})
            .get("relatedPlaylists", {})
            .get("uploads")
        )

        posts = []
        if uploads_playlist:
            playlist_data = youtube_api_get(
                "playlistItems",
                {
                    "part": "snippet,contentDetails",
                    "playlistId": uploads_playlist,
                    "maxResults": 10,
                },
            )
            video_ids = [
                item.get("contentDetails", {}).get("videoId")
                for item in playlist_data.get("items", [])
                if item.get("contentDetails", {}).get("videoId")
            ]

            if video_ids:
                video_data = youtube_api_get(
                    "videos",
                    {
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids),
                    },
                )
                for video in video_data.get("items", []):
                    video_snippet = video.get("snippet", {})
                    video_statistics = video.get("statistics", {})
                    thumbnails = video_snippet.get("thumbnails", {})
                    thumbnail = (
                        thumbnails.get("high")
                        or thumbnails.get("medium")
                        or thumbnails.get("default")
                        or {}
                    )
                    posts.append({
                        "id": video.get("id"),
                        "title": video_snippet.get("title", "Untitled"),
                        "url": "https://www.youtube.com/watch?v=" + video.get("id", ""),
                        "published_at": video_snippet.get("publishedAt"),
                        "thumbnail_url": thumbnail.get("url"),
                        "views": (
                            int(video_statistics["viewCount"])
                            if "viewCount" in video_statistics else None
                        ),
                        "likes": (
                            int(video_statistics["likeCount"])
                            if "likeCount" in video_statistics else None
                        ),
                        "comments": (
                            int(video_statistics["commentCount"])
                            if "commentCount" in video_statistics else None
                        ),
                    })

        return {
            "platform": "youtube",
            "account": {
                "id": channel.get("id"),
                "name": snippet.get("title"),
                "handle": snippet.get("customUrl"),
                "url": "https://www.youtube.com/channel/" + channel.get("id", ""),
                "thumbnail_url": (
                    snippet.get("thumbnails", {}).get("default", {}).get("url")
                ),
                "followers": (
                    int(statistics["subscriberCount"])
                    if "subscriberCount" in statistics else None
                ),
                "total_views": (
                    int(statistics["viewCount"])
                    if "viewCount" in statistics else None
                ),
                "posts": (
                    int(statistics["videoCount"])
                    if "videoCount" in statistics else None
                ),
            },
            "posts": posts,
            "source": "YouTube Data API v3",
            "note": (
                "Only metrics returned by YouTube are shown. Subscriber counts "
                "may be hidden, and like/comment counts may be unavailable."
            ),
        }

    # X: public profile and recent public posts. Impression counts depend
    # on the user's X API product/access tier and returned fields.
    if platform == "x":
        if not X_BEARER_TOKEN:
            raise HTTPException(
                status_code=503,
                detail="X_BEARER_TOKEN is missing from .env.",
            )

        username = identifier.rstrip("/").split("/")[-1].lstrip("@")
        if not username or any(char.isspace() for char in username):
            raise HTTPException(status_code=422, detail="Enter a valid X username or profile URL.")

        headers = {"Authorization": f"Bearer {X_BEARER_TOKEN}"}
        try:
            profile_response = requests.get(
                f"https://api.twitter.com/2/users/by/username/{username}",
                headers=headers,
                params={"user.fields": "public_metrics,profile_image_url,description"},
                timeout=20,
            )
            profile_data = profile_response.json()
        except (requests.RequestException, ValueError):
            raise HTTPException(status_code=502, detail="Could not connect to the X API.")

        if not profile_response.ok or not profile_data.get("data"):
            message = profile_data.get("detail") or profile_data.get("title")
            raise HTTPException(
                status_code=404 if profile_response.status_code == 404 else 502,
                detail=f"X API could not return this account: {message or 'check username and API access.'}",
            )

        profile = profile_data["data"]
        post_results = []
        try:
            posts_response = requests.get(
                f"https://api.twitter.com/2/users/{profile['id']}/tweets",
                headers=headers,
                params={
                    "max_results": 10,
                    "tweet.fields": "created_at,public_metrics",
                },
                timeout=20,
            )
            posts_data = posts_response.json()
            if posts_response.ok:
                for post in posts_data.get("data", []):
                    metrics = post.get("public_metrics", {})
                    post_results.append({
                        "id": post.get("id"),
                        "title": post.get("text", ""),
                        "url": f"https://x.com/{username}/status/{post.get('id', '')}",
                        "published_at": post.get("created_at"),
                        "views": metrics.get("impression_count"),
                        "likes": metrics.get("like_count"),
                        "comments": metrics.get("reply_count"),
                    })
        except (requests.RequestException, ValueError):
            # Profile data can still be returned when post lookup fails.
            post_results = []

        profile_metrics = profile.get("public_metrics", {})
        return {
            "platform": "x",
            "account": {
                "id": profile.get("id"),
                "name": profile.get("name"),
                "handle": "@" + username,
                "url": f"https://x.com/{username}",
                "thumbnail_url": profile.get("profile_image_url"),
                "followers": profile_metrics.get("followers_count"),
                "total_views": None,
                "posts": profile_metrics.get("tweet_count"),
            },
            "posts": post_results,
            "source": "X API v2",
            "note": (
                "Post impressions are shown only if your X API access level "
                "returns impression_count. API permissions and rate limits apply."
            ),
        }

    # Business Discovery uses the Facebook Login API surface and a
    # Facebook User token. Instagram Login tokens must not be sent to
    # graph.facebook.com, so this capability is intentionally unavailable here.
    if platform == "instagram":
        raise HTTPException(
            status_code=501,
            detail=(
                "Instagram public-account discovery is not supported by Instagram Login. "
                "Meta's Business Discovery edge requires the Facebook Login API and a "
                "Facebook User token. Your own connected Instagram account can still "
                "be synced through Instagram Login. No scraping is used."
            ),
        )

    if platform == "linkedin":
        raise HTTPException(
            status_code=501,
            detail=(
                "Arbitrary public LinkedIn profile analytics are not supported "
                "by the current configuration. LinkedIn APIs require approved "
                "products, scopes and authorized access."
            ),
        )


# ============================================================
# OTHER SOCIAL PLATFORM SYNC
# ============================================================

def save_social_snapshot(user_id: int, platform: str, followers: int):
    try:
        with get_engine().begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO public.follower_snapshots
                        (user_id, platform, followers)
                    VALUES (:uid, :platform, :followers)
                """),
                {
                    "uid": user_id,
                    "platform": platform,
                    "followers": followers,
                },
            )
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not save follower snapshot.")


@app.post("/social/sync/x")
def sync_x(username: str, user=Depends(get_current_user)):
    """
    Fetch public metrics for an X username using the configured Bearer Token.
    This is public-profile lookup, not OAuth connection to a user's private account.
    """
    if not X_BEARER_TOKEN:
        raise HTTPException(status_code=503, detail="X_BEARER_TOKEN missing from .env")

    clean_user = username.strip().lstrip("@")
    if not clean_user:
        raise HTTPException(status_code=422, detail="Enter your X username without or with @.")

    try:
        response = requests.get(
            f"https://api.x.com/2/users/by/username/{clean_user}",
            params={"user.fields": "public_metrics,description,profile_image_url,verified"},
            headers={"Authorization": f"Bearer {X_BEARER_TOKEN}"},
            timeout=20,
        )
        data = response.json()
    except (requests.RequestException, ValueError):
        raise HTTPException(status_code=502, detail="Failed to reach X API.")

    if not response.ok or "data" not in data:
        api_error = data.get("detail") or data.get("title") or data.get("errors")
        raise HTTPException(
            status_code=502,
            detail=api_error or f"X API request failed (HTTP {response.status_code}). Check token, API access tier, and rate limits.",
        )

    profile = data["data"]
    metrics = profile.get("public_metrics") or {}
    followers = int(metrics.get("followers_count", 0))
    save_social_snapshot(user["user_id"], "x", followers)

    return {
        "platform": "x",
        "username": profile.get("username", clean_user),
        "name": profile.get("name"),
        "followers": followers,
        "posts": int(metrics.get("tweet_count", 0)),
        "following": int(metrics.get("following_count", 0)),
        "verified": profile.get("verified"),
        "profile_image_url": profile.get("profile_image_url"),
        "description": profile.get("description"),
        "data_source": "X API v2 public profile metrics",
    }


@app.post("/social/sync/instagram", tags=["Social Sync"])
def sync_instagram(user=Depends(get_current_user)):
    """Sync this CreatorIQ user's own professional account through Instagram Login."""
    ensure_social_oauth_tables()
    try:
        with get_engine().connect() as conn:
            connection = conn.execute(text("""
                SELECT platform_user_id, username, access_token_encrypted,
                       token_expires_at, auth_method
                FROM public.social_connections
                WHERE user_id = :uid AND platform = 'instagram'
            """), {"uid": user["user_id"]}).mappings().first()
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load your saved Instagram connection.")
    if not connection:
        raise HTTPException(status_code=409, detail="Instagram is not connected to this CreatorIQ account. Select Connect Instagram first.")
    if connection.get("auth_method") != "instagram_login":
        raise HTTPException(
            status_code=409,
            detail=(
                "This Instagram connection was created with the previous Facebook Login flow. "
                "Disconnect it and reconnect using Instagram Login."
            ),
        )

    try:
        access_token = get_token_cipher().decrypt(
            connection["access_token_encrypted"].encode()
        ).decode()
    except (InvalidToken, ValueError, TypeError):
        raise HTTPException(status_code=500, detail="The saved Instagram token could not be decrypted. Check SOCIAL_TOKEN_ENCRYPTION_KEY.")

    # Instagram long-lived tokens can be refreshed before expiration. Never
    # send an Instagram User token to graph.facebook.com.
    expires_at = connection.get("token_expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc) + timedelta(days=7):
            try:
                refreshed = refresh_instagram_long_lived_token(access_token)
                if refreshed.get("access_token"):
                    access_token = refreshed["access_token"]
                    refreshed_expires = refreshed.get("expires_in")
                    with get_engine().begin() as conn:
                        conn.execute(text("""
                            UPDATE public.social_connections
                            SET access_token_encrypted = :token,
                                token_expires_at = :expires_at,
                                updated_at = NOW()
                            WHERE user_id = :uid AND platform = 'instagram'
                        """), {
                            "token": get_token_cipher().encrypt(access_token.encode()).decode(),
                            "expires_at": (
                                datetime.now(timezone.utc) + timedelta(seconds=int(refreshed_expires))
                                if refreshed_expires else None
                            ),
                            "uid": user["user_id"],
                        })
            except HTTPException:
                # The existing token is still tried; if expired, Meta's profile
                # response below supplies the actionable error.
                pass

    profile = get_instagram_login_profile(access_token)
    instagram_user_id = str(profile.get("user_id") or profile.get("id") or connection["platform_user_id"] or "")
    username = profile.get("username") or connection["username"]
    if not instagram_user_id or not username:
        raise HTTPException(status_code=502, detail="Instagram did not return the connected account ID and username.")

    # Follower count is read from the IG User profile field. The separate
    # Insights edge documented for graph.facebook.com is not called here.
    followers = profile.get("followers_count")
    recent_media = []
    media_error = None
    try:
        media_data = oauth_json_request(
            "GET", f"https://graph.instagram.com/{META_GRAPH_API_VERSION}/{instagram_user_id}/media",
            params={
                "fields": "id,caption,media_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url",
                "limit": 10,
                "access_token": access_token,
            },
        )
        recent_media = [
            {
                "id": item.get("id"),
                "caption": item.get("caption") or "",
                "title": (item.get("caption") or "")[:120] or item.get("media_type") or "Instagram post",
                "media_type": item.get("media_type"),
                "url": item.get("permalink"),
                "permalink": item.get("permalink"),
                "published_at": item.get("timestamp"),
                "thumbnail_url": item.get("thumbnail_url") or item.get("media_url"),
                "media_url": item.get("media_url"),
                "likes": item.get("like_count"),
                "comments": item.get("comments_count"),
            }
            for item in (media_data.get("data") or [])
        ]
    except HTTPException as exc:
        media_error = exc.detail

    try:
        with get_engine().begin() as conn:
            conn.execute(text("""
                UPDATE public.social_connections
                SET platform_user_id = :ig_id,
                    username = :username,
                    display_name = :display_name,
                    profile_image_url = :profile_image_url,
                    instagram_synced_at = NOW(),
                    updated_at = NOW()
                WHERE user_id = :uid AND platform = 'instagram'
            """), {
                "ig_id": instagram_user_id,
                "username": username,
                "display_name": profile.get("name") or username,
                "profile_image_url": profile.get("profile_picture_url"),
                "uid": user["user_id"],
            })

            for item in recent_media:
                conn.execute(text("""
                    INSERT INTO public.instagram_media_cache
                        (user_id, media_id, caption, media_type, permalink,
                         published_at, media_url, like_count, comments_count, synced_at)
                    VALUES
                        (:uid, :media_id, :caption, :media_type, :permalink,
                         CAST(:published_at AS TIMESTAMPTZ), :media_url,
                         :likes, :comments, NOW())
                    ON CONFLICT (user_id, media_id) DO UPDATE SET
                        caption = EXCLUDED.caption,
                        media_type = EXCLUDED.media_type,
                        permalink = EXCLUDED.permalink,
                        published_at = EXCLUDED.published_at,
                        media_url = EXCLUDED.media_url,
                        like_count = EXCLUDED.like_count,
                        comments_count = EXCLUDED.comments_count,
                        synced_at = NOW()
                """), {
                    "uid": user["user_id"],
                    "media_id": str(item["id"]),
                    "caption": item["caption"],
                    "media_type": item["media_type"],
                    "permalink": item["permalink"],
                    "published_at": item["published_at"],
                    "media_url": item["media_url"] or item["thumbnail_url"],
                    "likes": item["likes"],
                    "comments": item["comments"],
                })

            # Keep a small rolling cache per CreatorIQ user.
            conn.execute(text("""
                DELETE FROM public.instagram_media_cache
                WHERE user_id = :uid
                  AND media_id NOT IN (
                      SELECT media_id FROM public.instagram_media_cache
                      WHERE user_id = :uid
                      ORDER BY published_at DESC NULLS LAST, synced_at DESC
                      LIMIT 30
                  )
            """), {"uid": user["user_id"]})
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Instagram data was fetched, but could not be saved to the CreatorIQ database.")

    if followers is not None:
        save_social_snapshot(user["user_id"], "instagram", int(followers))

    return {
        "platform": "instagram",
        "connected": True,
        "username": username,
        "account_type": profile.get("account_type"),
        "profile_image_url": profile.get("profile_picture_url"),
        "followers": int(followers) if followers is not None else None,
        "following": profile.get("follows_count"),
        "media_count": int(profile.get("media_count", 0) or 0),
        "posts": int(profile.get("media_count", 0) or 0),
        "recent_media": recent_media,
        "media_error": media_error,
        "followers_error": None if followers is not None else "Instagram did not return followers_count for this account.",
        "data_source": "Instagram API with Instagram Login (graph.instagram.com)",
        "note": (
            "Only fields returned by Instagram are displayed. Followers come from "
            "the IG User followers_count field; recent media is saved for the dashboard."
        ),
    }


@app.get("/social/instagram/overview", tags=["Social Sync"])
def instagram_dashboard_overview(user=Depends(get_current_user)):
    """Return the saved Instagram connection and the last synced media for this CreatorIQ user."""
    ensure_social_oauth_tables()
    try:
        with get_engine().connect() as conn:
            connection = conn.execute(text("""
                SELECT platform_user_id, username, display_name, profile_image_url,
                       auth_method, instagram_synced_at, connected_at, updated_at
                FROM public.social_connections
                WHERE user_id = :uid AND platform = 'instagram'
            """), {"uid": user["user_id"]}).mappings().first()
            if not connection:
                return {"connected": False, "account": None, "posts": []}
            if connection.get("auth_method") != "instagram_login":
                return {
                    "connected": True,
                    "legacy_connection": True,
                    "account": {"username": connection.get("username")},
                    "posts": [],
                    "message": "Reconnect this account using Instagram Login to sync dashboard data.",
                }

            snapshot = conn.execute(text("""
                SELECT followers FROM public.follower_snapshots
                WHERE user_id = :uid AND platform = 'instagram'
                ORDER BY recorded_at DESC LIMIT 1
            """), {"uid": user["user_id"]}).mappings().first()
            rows = conn.execute(text("""
                SELECT media_id, caption, media_type, permalink, published_at,
                       media_url, like_count, comments_count, synced_at
                FROM public.instagram_media_cache
                WHERE user_id = :uid
                ORDER BY published_at DESC NULLS LAST, synced_at DESC
                LIMIT 10
            """), {"uid": user["user_id"]}).mappings().all()

        posts = []
        for row in rows:
            post = dict(row)
            post["id"] = post.pop("media_id")
            post["title"] = (post.get("caption") or "")[:120] or post.get("media_type") or "Instagram post"
            post["url"] = post.get("permalink")
            post["thumbnail_url"] = post.get("media_url")
            post["likes"] = post.pop("like_count")
            post["comments"] = post.pop("comments_count")
            post["views"] = None
            posts.append(post)

        return {
            "connected": True,
            "legacy_connection": False,
            "account": {
                "id": connection.get("platform_user_id"),
                "username": connection.get("username"),
                "display_name": connection.get("display_name"),
                "profile_image_url": connection.get("profile_image_url"),
                "followers": snapshot.get("followers") if snapshot else None,
                "last_synced_at": connection.get("instagram_synced_at"),
                "connected_at": connection.get("connected_at"),
            },
            "posts": posts,
            "posts_synced": len(posts),
        }
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load saved Instagram dashboard data.")


@app.post("/social/sync/linkedin")
def sync_linkedin(user=Depends(get_current_user)):
    """
    Fetch follower count for the configured LinkedIn organization page.
    Requires approved LinkedIn API access and an OAuth token with the
    appropriate organization permission. This is for a company page, not a
    personal LinkedIn profile.
    """
    if not LINKEDIN_ACCESS_TOKEN or not LINKEDIN_ORG_ID:
        raise HTTPException(
            status_code=503,
            detail="LinkedIn credentials missing from .env (LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_ID).",
        )

    org_id = LINKEDIN_ORG_ID.strip()
    # Accept either a numeric organization ID or a full organization URN.
    if org_id.startswith("urn:li:organization:"):
        org_id = org_id.rsplit(":", 1)[-1]

    url = (
        f"https://api.linkedin.com/rest/networkSizes/urn:li:organization:{org_id}"
        "?edgeType=COMPANY_FOLLOWED_BY_MEMBER"
    )
    headers = {
        "Authorization": f"Bearer {LINKEDIN_ACCESS_TOKEN}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": LINKEDIN_VERSION,
        "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        try:
            data = response.json()
        except ValueError:
            data = {}
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Failed to connect to LinkedIn API.")

    if not response.ok:
        detail = data.get("message") or data.get("serviceErrorCode") or data.get("error_description")
        raise HTTPException(
            status_code=502,
            detail=f"LinkedIn API request failed (HTTP {response.status_code}). "
                   f"{detail or 'Check app product access, token permissions, organization ID, and LinkedIn API version.'}",
        )

    if "firstDegreeSize" not in data:
        raise HTTPException(
            status_code=502,
            detail="LinkedIn API did not return firstDegreeSize. Confirm the organization ID and API permissions.",
        )

    followers = int(data["firstDegreeSize"])
    save_social_snapshot(user["user_id"], "linkedin", followers)

    return {
        "platform": "linkedin",
        "organization_id": org_id,
        "followers": followers,
        "data_source": "LinkedIn Organization Network Size API",
    }


# ============================================================
# CAMPAIGNS
# Requires the SQL migration provided with this file:
# campaigns.owner_user_id references users.user_id, and creator_id
# is nullable so marketing-team users can own campaigns directly.
# ============================================================

def campaign_access_sql():
    # Current users can see their own campaigns. Legacy creator-owned
    # campaigns remain visible to the user linked to that creator profile.
    return """
        (c.owner_user_id = :uid OR c.creator_id IN (
            SELECT cr.creator_id
            FROM public.creators cr
            WHERE cr.user_id = :uid
        ))
    """


def campaign_payload(row):
    return {
        "campaign_id": row["campaign_id"],
        "name": row["title"],
        "platform": row["platform"] or row["source"],
        "description": row["description"] or "",
        "budget": str(row["budget"]) if row["budget"] is not None else None,
        "status": row["status"],
        "start_date": row["start_date"].isoformat() if row["start_date"] else None,
        "end_date": row["end_date"].isoformat() if row["end_date"] else None,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@app.get("/campaigns", tags=["Campaigns"])
def list_campaigns(user=Depends(get_current_user)):
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f"""
                    SELECT c.campaign_id, c.title, c.source, c.platform,
                           c.description, c.budget, c.status,
                           c.start_date, c.end_date, c.created_at
                    FROM public.campaigns c
                    WHERE {campaign_access_sql()}
                    ORDER BY c.created_at DESC, c.campaign_id DESC
                """),
                {"uid": user["user_id"]},
            ).mappings().all()
        return {"campaigns": [campaign_payload(row) for row in rows]}
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not load campaigns. Check that the campaign database migration has been applied.",
        )


@app.post("/campaigns", status_code=201, tags=["Campaigns"])
def create_campaign(data: CampaignCreate, user=Depends(get_current_user)):
    if data.start_date and data.end_date and data.end_date < data.start_date:
        raise HTTPException(status_code=422, detail="End date cannot be before start date.")

    try:
        with get_engine().begin() as conn:
            creator_id = None
            if user["role"] == "creator":
                creator_id = conn.execute(
                    text("""
                        SELECT creator_id
                        FROM public.creators
                        WHERE user_id = :uid
                        LIMIT 1
                    """),
                    {"uid": user["user_id"]},
                ).scalar_one_or_none()

            row = conn.execute(
                text("""
                    INSERT INTO public.campaigns
                        (creator_id, owner_user_id, title, source, platform,
                         description, budget, status, start_date, end_date)
                    VALUES
                        (:creator_id, :owner_user_id, :title, :source, :platform,
                         :description, :budget, :status, :start_date, :end_date)
                    RETURNING campaign_id, title, source, platform, description,
                              budget, status, start_date, end_date, created_at
                """),
                {
                    "creator_id": creator_id,
                    "owner_user_id": user["user_id"],
                    "title": data.name.strip(),
                    "source": data.platform,
                    "platform": data.platform,
                    "description": data.description.strip(),
                    "budget": data.budget,
                    "status": data.status,
                    "start_date": data.start_date,
                    "end_date": data.end_date,
                },
            ).mappings().one()
        return {"message": "Campaign created successfully.", "campaign": campaign_payload(row)}
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Could not create campaign because of a database constraint.")
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not create campaign. Confirm the campaign SQL migration has been applied.",
        )


@app.put("/campaigns/{campaign_id}", tags=["Campaigns"])
def update_campaign(
    campaign_id: int,
    data: CampaignUpdate,
    user=Depends(get_current_user),
):
    if data.start_date and data.end_date and data.end_date < data.start_date:
        raise HTTPException(status_code=422, detail="End date cannot be before start date.")

    try:
        with get_engine().begin() as conn:
            row = conn.execute(
                text(f"""
                    UPDATE public.campaigns AS c
                    SET title = :title,
                        source = :source,
                        platform = :platform,
                        description = :description,
                        budget = :budget,
                        status = :status,
                        start_date = :start_date,
                        end_date = :end_date,
                        updated_at = NOW()
                    WHERE c.campaign_id = :campaign_id
                      AND {campaign_access_sql()}
                    RETURNING c.campaign_id, c.title, c.source, c.platform,
                              c.description, c.budget, c.status,
                              c.start_date, c.end_date, c.created_at
                """),
                {
                    "campaign_id": campaign_id,
                    "uid": user["user_id"],
                    "title": data.name.strip(),
                    "source": data.platform,
                    "platform": data.platform,
                    "description": data.description.strip(),
                    "budget": data.budget,
                    "status": data.status,
                    "start_date": data.start_date,
                    "end_date": data.end_date,
                },
            ).mappings().first()
            if row is None:
                raise HTTPException(status_code=404, detail="Campaign not found.")
        return {"message": "Campaign updated successfully.", "campaign": campaign_payload(row)}
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not update campaign.")


@app.delete("/campaigns/{campaign_id}", tags=["Campaigns"])
def delete_campaign(campaign_id: int, user=Depends(get_current_user)):
    try:
        with get_engine().begin() as conn:
            result = conn.execute(
                text(f"""
                    DELETE FROM public.campaigns AS c
                    WHERE c.campaign_id = :campaign_id
                      AND {campaign_access_sql()}
                    RETURNING c.campaign_id
                """),
                {"campaign_id": campaign_id, "uid": user["user_id"]},
            ).first()
            if result is None:
                raise HTTPException(status_code=404, detail="Campaign not found.")
        return {"message": "Campaign deleted successfully."}
    except HTTPException:
        raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not delete campaign.")

# ============================================================
# AGENCY AND ADMIN WORKSPACES (requires CreatorIQ_workspace.sql)
# ============================================================

class CreatorAssignment(BaseModel):
    creator_user_id: int = Field(gt=0)


@app.get("/agency/workspace", tags=["Agency"])
def agency_workspace(user=Depends(require_roles("agency"))):
    uid = user["user_id"]
    try:
        with get_engine().connect() as conn:
            creators = conn.execute(text("""
                WITH latest AS (
                    SELECT DISTINCT ON (user_id, platform) user_id, platform, followers
                    FROM public.follower_snapshots ORDER BY user_id, platform, recorded_at DESC
                ), followers AS (
                    SELECT user_id, SUM(followers) AS total_followers FROM latest GROUP BY user_id
                ), videos AS (
                    SELECT user_id, COUNT(*) AS video_count, COALESCE(SUM(views),0) AS views,
                           COALESCE(SUM(likes),0) AS likes FROM public.youtube_videos GROUP BY user_id
                )
                SELECT u.user_id, u.name, u.email, u.is_active,
                       COALESCE(f.total_followers,0) AS followers,
                       COALESCE(v.views,0) AS views, COALESCE(v.likes,0) AS likes,
                       COALESCE(v.video_count,0) AS videos
                FROM public.creatoriq_agency_assignments a
                JOIN public.users u ON u.user_id=a.creator_user_id AND u.role='creator'
                LEFT JOIN followers f ON f.user_id=u.user_id
                LEFT JOIN videos v ON v.user_id=u.user_id
                WHERE a.agency_user_id=:uid ORDER BY u.name
            """), {"uid":uid}).mappings().all()
            campaigns = conn.execute(text("""
                SELECT c.campaign_id, c.title AS name, c.platform, c.status, c.budget,
                       c.start_date, c.end_date
                FROM public.campaigns c
                JOIN public.creators cr ON cr.creator_id=c.creator_id
                JOIN public.creatoriq_agency_assignments a ON a.creator_user_id=cr.user_id
                WHERE a.agency_user_id=:uid ORDER BY c.created_at DESC LIMIT 100
            """), {"uid":uid}).mappings().all()
            content = conn.execute(text("""
                SELECT v.video_id, v.title, v.views, v.likes, v.comments,
                       v.published_at, u.name AS creator
                FROM public.youtube_videos v
                JOIN public.creatoriq_agency_assignments a ON a.creator_user_id=v.user_id
                JOIN public.users u ON u.user_id=v.user_id
                WHERE a.agency_user_id=:uid
                ORDER BY v.published_at DESC NULLS LAST LIMIT 30
            """), {"uid":uid}).mappings().all()
            team = conn.execute(text("""
                SELECT t.member_id, t.name, t.email, t.job_title
                FROM public.creatoriq_agency_team t
                WHERE t.agency_user_id=:uid ORDER BY t.member_id DESC
            """), {"uid":uid}).mappings().all()
        return {"creators":serialize_rows(creators), "campaigns":serialize_rows(campaigns),
                "content":serialize_rows(content), "team":serialize_rows(team)}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Agency workspace unavailable. Run CreatorIQ_workspace.sql in Supabase first.")


@app.post("/agency/creators", status_code=201, tags=["Agency"])
def assign_creator(data: CreatorAssignment, user=Depends(require_roles("agency"))):
    try:
        with get_engine().begin() as conn:
            found=conn.execute(text("SELECT 1 FROM public.users WHERE user_id=:id AND role='creator' AND is_active=TRUE"),{"id":data.creator_user_id}).first()
            if not found:
                raise HTTPException(status_code=404, detail="Active creator account not found")
            conn.execute(text("""
                INSERT INTO public.creatoriq_agency_assignments(agency_user_id,creator_user_id)
                VALUES (:agency,:creator) ON CONFLICT DO NOTHING
            """), {"agency":user["user_id"],"creator":data.creator_user_id})
        return {"message":"Creator assigned"}
    except HTTPException: raise
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not assign creator. Apply workspace migration.")


@app.delete("/agency/creators/{creator_user_id}", tags=["Agency"])
def unassign_creator(creator_user_id:int, user=Depends(require_roles("agency"))):
    with get_engine().begin() as conn:
        conn.execute(text("DELETE FROM public.creatoriq_agency_assignments WHERE agency_user_id=:agency AND creator_user_id=:creator"),
                     {"agency":user["user_id"],"creator":creator_user_id})
    return {"message":"Creator unassigned"}


@app.get("/admin/workspace", tags=["Admin"])
def admin_workspace(user=Depends(require_roles("admin"))):
    try:
        with get_engine().connect() as conn:
            activity=conn.execute(text("""
                SELECT 'YouTube sync' AS event_type, u.name AS actor, yc.last_synced_at AS occurred_at
                FROM public.youtube_channels yc JOIN public.users u ON u.user_id=yc.user_id
                WHERE yc.last_synced_at IS NOT NULL ORDER BY yc.last_synced_at DESC LIMIT 20
            """)).mappings().all()
            accounts=conn.execute(text("""
                SELECT user_id, name, email, role, is_active FROM public.users
                WHERE role IN ('agency','marketing_team') ORDER BY user_id DESC
            """)).mappings().all()
            campaign_totals=conn.execute(text("""
                SELECT COUNT(*) AS total_campaigns,
                COUNT(*) FILTER (WHERE status='active') AS active_campaigns,
                COALESCE(SUM(budget),0) AS planned_budget FROM public.campaigns
            """)).mappings().one()
        return {"activity":serialize_rows(activity), "accounts":serialize_rows(accounts),
                "campaign_summary":dict(campaign_totals),
                "settings":{"mode":"read-only", "message":"Server configuration is managed through the backend .env and deployment settings."}}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not load admin workspace")

class AgencyTeamMember(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    job_title: str = Field(default="Member", max_length=100)

@app.post('/agency/team', status_code=201, tags=['Agency'])
def add_agency_team_member(data: AgencyTeamMember, user=Depends(require_roles('agency'))):
    try:
        with get_engine().begin() as conn:
            row = conn.execute(text('''INSERT INTO public.creatoriq_agency_team
              (agency_user_id,name,email,job_title) VALUES (:uid,:name,:email,:job)
              RETURNING member_id'''), {'uid':user['user_id'],'name':data.name.strip(),
              'email':str(data.email) if data.email else None,'job':data.job_title}).scalar_one()
        return {'member_id':row,'message':'Team member saved'}
    except SQLAlchemyError:
        raise HTTPException(status_code=503,detail='Could not save team member')

@app.delete('/agency/team/{member_id}', tags=['Agency'])
def remove_agency_team_member(member_id:int, user=Depends(require_roles('agency'))):
    with get_engine().begin() as conn:
        result=conn.execute(text('''DELETE FROM public.creatoriq_agency_team
          WHERE member_id=:member AND agency_user_id=:uid'''),{'member':member_id,'uid':user['user_id']})
        if not result.rowcount: raise HTTPException(status_code=404,detail='Member not found')
    return {'message':'Member removed'}

# ============================================================
# PER-USER SOCIAL OAUTH (INSTAGRAM, X, LINKEDIN)
# ============================================================
# Required Render environment variables:
# APP_BASE_URL=https://my-creatoriq.onrender.com
# SOCIAL_TOKEN_ENCRYPTION_KEY=<Fernet key; generate once and keep unchanged>
# INSTAGRAM_OAUTH_CLIENT_ID, INSTAGRAM_OAUTH_CLIENT_SECRET
# INSTAGRAM_REDIRECT_URI=https://my-creatoriq.onrender.com/auth/instagram/callback
# X_CLIENT_ID, X_CLIENT_SECRET (secret optional for public PKCE clients)
# LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
#
# OAuth state and X PKCE verifier are stored server-side. Access and refresh
# tokens are encrypted before being stored in PostgreSQL. Tokens are scoped
# to the CreatorIQ user who initiated the authorization.

APP_BASE_URL = os.getenv(
    "APP_BASE_URL",
    os.getenv("RENDER_EXTERNAL_URL", "https://my-creatoriq.onrender.com"),
).rstrip("/")
SOCIAL_TOKEN_ENCRYPTION_KEY = os.getenv("SOCIAL_TOKEN_ENCRYPTION_KEY")
# Instagram API with Instagram Login (Business Login for Instagram).
# These are the Instagram App ID and Instagram App Secret shown in the
# Instagram product's "API setup with Instagram login" settings.
INSTAGRAM_OAUTH_CLIENT_ID = os.getenv("INSTAGRAM_OAUTH_CLIENT_ID")
INSTAGRAM_OAUTH_CLIENT_SECRET = os.getenv("INSTAGRAM_OAUTH_CLIENT_SECRET")
INSTAGRAM_REDIRECT_URI = os.getenv(
    "INSTAGRAM_REDIRECT_URI",
    f"{APP_BASE_URL}/auth/instagram/callback",
)
INSTAGRAM_OAUTH_SCOPES = os.getenv(
    "INSTAGRAM_OAUTH_SCOPES",
    "instagram_business_basic,instagram_business_manage_insights",
)
FRONTEND_DASHBOARD_URL = os.getenv(
    "FRONTEND_DASHBOARD_URL",
    "http://127.0.0.1:5500/dashboard.html",
)
X_CLIENT_ID = os.getenv("X_CLIENT_ID")
X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")

OAUTH_PLATFORMS = {"instagram", "x", "linkedin"}
OAUTH_STATE_TTL_MINUTES = 10


def oauth_redirect_uri(platform: str) -> str:
    # Register this exact URL in the Instagram API with Instagram Login settings.
    if platform == "instagram" and INSTAGRAM_REDIRECT_URI:
        return INSTAGRAM_REDIRECT_URI.rstrip("/")
    return f"{APP_BASE_URL}/auth/{platform}/callback"


def get_token_cipher():
    if not SOCIAL_TOKEN_ENCRYPTION_KEY:
        raise HTTPException(
            status_code=503,
            detail="SOCIAL_TOKEN_ENCRYPTION_KEY is not configured in Render Environment.",
        )
    try:
        return Fernet(SOCIAL_TOKEN_ENCRYPTION_KEY.encode("ascii"))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="SOCIAL_TOKEN_ENCRYPTION_KEY is invalid. Use a valid Fernet key.",
        )


def ensure_social_oauth_tables():
    """Create the OAuth tables safely if they do not exist yet."""
    try:
        with get_engine().begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.social_oauth_states (
                    state_hash TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
                    platform TEXT NOT NULL CHECK (platform IN ('instagram','x','linkedin')),
                    code_verifier TEXT,
                    target_username TEXT,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.social_connections (
                    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
                    platform TEXT NOT NULL CHECK (platform IN ('instagram','x','linkedin')),
                    platform_user_id TEXT,
                    username TEXT,
                    display_name TEXT,
                    profile_image_url TEXT,
                    access_token_encrypted TEXT NOT NULL,
                    refresh_token_encrypted TEXT,
                    auth_method TEXT,
                    token_expires_at TIMESTAMPTZ,
                    scopes TEXT,
                    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (user_id, platform)
                )
            """))
            conn.execute(text("ALTER TABLE public.social_oauth_states ADD COLUMN IF NOT EXISTS target_username TEXT"))
            conn.execute(text("ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS auth_method TEXT"))
            conn.execute(text("ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS instagram_synced_at TIMESTAMPTZ"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.instagram_media_cache (
                    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
                    media_id TEXT NOT NULL,
                    caption TEXT,
                    media_type TEXT,
                    permalink TEXT,
                    published_at TIMESTAMPTZ,
                    media_url TEXT,
                    like_count BIGINT,
                    comments_count BIGINT,
                    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (user_id, media_id)
                )
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_instagram_media_cache_recent
                ON public.instagram_media_cache (user_id, published_at DESC NULLS LAST)
            """))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Could not prepare social OAuth tables. Check database permissions and connectivity.",
        )


def oauth_app_config(platform: str):
    if platform == "instagram":
        if not INSTAGRAM_OAUTH_CLIENT_ID or not INSTAGRAM_OAUTH_CLIENT_SECRET:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Configure INSTAGRAM_OAUTH_CLIENT_ID and "
                    "INSTAGRAM_OAUTH_CLIENT_SECRET from Instagram > API setup "
                    "with Instagram login in the backend environment."
                ),
            )
    elif platform == "x":
        if not X_CLIENT_ID:
            raise HTTPException(status_code=503, detail="Configure X_CLIENT_ID in Render Environment.")
    elif platform == "linkedin":
        if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
            raise HTTPException(status_code=503, detail="Configure LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in Render Environment.")


def oauth_json_request(method: str, url: str, **kwargs) -> dict:
    try:
        response = requests.request(method, url, timeout=25, **kwargs)
        try:
            payload = response.json()
        except ValueError:
            payload = {}
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Could not connect to the social platform OAuth service.")
    if not response.ok:
        # Expose only stable error codes, never provider payloads or access tokens.
        provider_error = payload.get("error", {}) if isinstance(payload, dict) else {}
        error_code = provider_error.get("code") if isinstance(provider_error, dict) else None
        error_subcode = provider_error.get("error_subcode") if isinstance(provider_error, dict) else None
        if error_code == 190 or error_subcode in {463, 467}:
            detail = "The social-platform access token expired or was revoked. Reconnect the account to continue."
        elif error_code in {10, 200}:
            detail = "The social-platform app does not have the required permission or asset access. Check the Meta login configuration and app review status."
        else:
            detail = (
                f"OAuth provider rejected the request (HTTP {response.status_code}; "
                f"code {error_code if error_code is not None else 'unavailable'}). "
                "Check app settings, redirect URI, permissions, and account eligibility."
            )
        raise HTTPException(status_code=502, detail=detail)
    return payload if isinstance(payload, dict) else {}


def store_social_connection(
    user_id: int,
    platform: str,
    token_data: dict,
    profile: dict,
    scopes: str,
    auth_method: Optional[str] = None,
):
    cipher = get_token_cipher()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="The platform did not return an access token.")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    expires_at = None
    if expires_in:
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
        except (TypeError, ValueError):
            expires_at = None
    try:
        with get_engine().begin() as conn:
            conn.execute(text("""
                INSERT INTO public.social_connections
                    (user_id, platform, platform_user_id, username, display_name,
                     profile_image_url, access_token_encrypted, refresh_token_encrypted,
                     auth_method, token_expires_at, scopes, connected_at, updated_at)
                VALUES
                    (:uid, :platform, :platform_user_id, :username, :display_name,
                     :profile_image_url, :access_token, :refresh_token,
                     :auth_method, :expires_at, :scopes, NOW(), NOW())
                ON CONFLICT (user_id, platform) DO UPDATE SET
                    platform_user_id = EXCLUDED.platform_user_id,
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name,
                    profile_image_url = EXCLUDED.profile_image_url,
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    auth_method = EXCLUDED.auth_method,
                    token_expires_at = EXCLUDED.token_expires_at,
                    scopes = EXCLUDED.scopes,
                    updated_at = NOW()
            """), {
                "uid": user_id,
                "platform": platform,
                "platform_user_id": str(profile.get("id") or profile.get("user_id") or profile.get("sub") or ""),
                "username": profile.get("username") or profile.get("name") or profile.get("email"),
                "display_name": profile.get("name") or profile.get("username"),
                "profile_image_url": profile.get("profile_image_url") or profile.get("picture"),
                "access_token": cipher.encrypt(access_token.encode()).decode(),
                "refresh_token": cipher.encrypt(refresh_token.encode()).decode() if refresh_token else None,
                "auth_method": auth_method,
                "expires_at": expires_at,
                "scopes": scopes,
            })
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="OAuth succeeded but the connection could not be saved to the database.")


def normalize_instagram_username(value: str) -> str:
    """Normalize a username or public instagram.com profile URL."""
    username = (value or "").strip()
    if "instagram.com/" in username.lower():
        from urllib.parse import urlparse
        parsed = urlparse(username if "://" in username else "https://" + username)
        if parsed.netloc.lower() not in {"instagram.com", "www.instagram.com"}:
            raise HTTPException(status_code=422, detail="Use an Instagram username or instagram.com profile URL.")
        segments = [part for part in parsed.path.split("/") if part]
        if not segments:
            raise HTTPException(status_code=422, detail="Enter an Instagram username.")
        username = segments[0]
    username = username.lstrip("@").strip().lower()
    if not username or len(username) > 30 or not re.fullmatch(r"[a-z0-9._]+", username):
        raise HTTPException(status_code=422, detail="Enter a valid Instagram username, such as @nasa.")
    return username


def get_instagram_login_profile(access_token: str, expected_username: Optional[str] = None) -> dict:
    """Read the signed-in Instagram professional account using Instagram Login."""
    graph_base = f"https://graph.instagram.com/{META_GRAPH_API_VERSION}"
    base_profile = oauth_json_request(
        "GET", f"{graph_base}/me",
        params={
            "fields": "user_id,username,account_type,media_count",
            "access_token": access_token,
        },
    )

    # Fetch account counts independently from optional presentation fields,
    # so a profile-picture/bio field issue cannot suppress followers_count.
    try:
        account_metrics = oauth_json_request(
            "GET", f"{graph_base}/me",
            params={
                "fields": "followers_count,follows_count",
                "access_token": access_token,
            },
        )
        base_profile.update(account_metrics)
    except HTTPException:
        pass

    try:
        profile_details = oauth_json_request(
            "GET", f"{graph_base}/me",
            params={
                "fields": "profile_picture_url,biography,website",
                "access_token": access_token,
            },
        )
        base_profile.update(profile_details)
    except HTTPException:
        # Basic identity, media count, and any account metrics remain useful.
        pass

    returned_username = str(base_profile.get("username") or "").strip().lower()
    if not base_profile.get("user_id") or not returned_username:
        raise HTTPException(
            status_code=502,
            detail="Instagram authorized the app, but did not return an Instagram user ID and username. Check Instagram Login and instagram_business_basic.",
        )
    if expected_username and returned_username != expected_username.lower():
        raise HTTPException(
            status_code=403,
            detail=(
                f"You signed in to Instagram as @{returned_username}, but "
                f"CreatorIQ was expecting @{expected_username}. Reconnect using "
                "the correct Instagram account."
            ),
        )
    base_profile["id"] = str(base_profile["user_id"])
    return base_profile


def refresh_instagram_long_lived_token(access_token: str) -> dict:
    """Refresh a still-valid Instagram long-lived token using Instagram Login."""
    return oauth_json_request(
        "GET",
        "https://graph.instagram.com/refresh_access_token",
        params={
            "grant_type": "ig_refresh_token",
            "access_token": access_token,
        },
    )


def consume_oauth_state(state: str, platform: str):
    if not state or len(state) > 300:
        raise HTTPException(status_code=400, detail="Missing or invalid OAuth state.")
    state_hash = hashlib.sha256(state.encode()).hexdigest()
    ensure_social_oauth_tables()
    try:
        with get_engine().begin() as conn:
            row = conn.execute(text("""
                DELETE FROM public.social_oauth_states
                WHERE state_hash = :state_hash AND platform = :platform
                  AND expires_at > NOW()
                RETURNING user_id, code_verifier, target_username
            """), {"state_hash": state_hash, "platform": platform}).mappings().first()
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not validate OAuth state.")
    if not row:
        raise HTTPException(status_code=400, detail="OAuth state is invalid, expired, or already used. Start the connection again.")
    return int(row["user_id"]), row["code_verifier"], row.get("target_username")


@app.get("/auth/{platform}/connect", tags=["Social OAuth"])
def start_social_oauth(
    platform: str,
    username: Optional[str] = None,
    user=Depends(get_current_user),
):
    """Return the provider authorization URL for the signed-in CreatorIQ user."""
    if platform not in OAUTH_PLATFORMS:
        raise HTTPException(status_code=404, detail="Supported platforms: instagram, x, linkedin.")
    oauth_app_config(platform)
    ensure_social_oauth_tables()

    state = secrets.token_urlsafe(32)
    code_verifier = None
    target_username = normalize_instagram_username(username) if platform == "instagram" and username else None
    redirect_uri = oauth_redirect_uri(platform)
    if platform == "instagram":
        # Instagram Login identifies the account after the user signs in.
        # Username is optional for compatibility with older callers.
        params = {
            "client_id": INSTAGRAM_OAUTH_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": INSTAGRAM_OAUTH_SCOPES,
            "state": state,
            "force_reauth": "true",
            "enable_fb_login": "false",
        }
        authorize_url = "https://www.instagram.com/oauth/authorize?" + urlencode(params)
        scopes = INSTAGRAM_OAUTH_SCOPES
    elif platform == "x":
        code_verifier = secrets.token_urlsafe(64)[:96]
        challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")
        scopes = "users.read tweet.read offline.access"
        params = {
            "response_type": "code",
            "client_id": X_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        authorize_url = "https://twitter.com/i/oauth2/authorize?" + urlencode(params)
    else:
        scopes = "openid profile email"
        params = {
            "response_type": "code",
            "client_id": LINKEDIN_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": state,
        }
        authorize_url = "https://www.linkedin.com/oauth/v2/authorization?" + urlencode(params)

    try:
        with get_engine().begin() as conn:
            conn.execute(text("""
                INSERT INTO public.social_oauth_states
                    (state_hash, user_id, platform, code_verifier, target_username, expires_at)
                VALUES (:state_hash, :uid, :platform, :verifier, :target_username, :expires_at)
            """), {
                "state_hash": hashlib.sha256(state.encode()).hexdigest(),
                "uid": user["user_id"],
                "platform": platform,
                "verifier": code_verifier,
                "target_username": target_username,
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OAUTH_STATE_TTL_MINUTES),
            })
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not create OAuth session in the database.")

    return {
        "platform": platform,
        "authorization_url": authorize_url,
        "redirect_uri": redirect_uri,
        "state_expires_in_seconds": OAUTH_STATE_TTL_MINUTES * 60,
        "instruction": "Open authorization_url in the user's browser to continue.",
    }


@app.get("/auth/{platform}/callback", tags=["Social OAuth"])
def social_oauth_callback(platform: str, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """OAuth redirect endpoint. State maps the callback to its initiating user."""
    if platform not in OAUTH_PLATFORMS:
        raise HTTPException(status_code=404, detail="Unsupported social platform.")
    if error:
        raise HTTPException(status_code=400, detail=f"{platform} authorization was declined: {error_description or error}")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code is missing. Restart the connection.")

    user_id, code_verifier, target_username = consume_oauth_state(state or "", platform)
    redirect_uri = oauth_redirect_uri(platform)

    if platform == "instagram":
        oauth_app_config(platform)
        # Instagram may append a trailing #_ marker to the redirect code.
        code = code[:-2] if code.endswith("#_") else code
        # Instagram Login code exchange: the code is sent as form data to
        # api.instagram.com, then exchanged for a long-lived Instagram token.
        token_data = oauth_json_request(
            "POST",
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": INSTAGRAM_OAUTH_CLIENT_ID,
                "client_secret": INSTAGRAM_OAUTH_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        short_lived_token = token_data.get("access_token")
        if not short_lived_token:
            raise HTTPException(status_code=502, detail="Instagram did not return an access token.")

        try:
            long_lived_data = oauth_json_request(
                "GET",
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": INSTAGRAM_OAUTH_CLIENT_SECRET,
                    "access_token": short_lived_token,
                },
            )
            if long_lived_data.get("access_token"):
                token_data.update(long_lived_data)
        except HTTPException:
            # Retain the short-lived token only as a fallback. The stored
            # expires_in value remains the short token's actual lifetime.
            token_data.setdefault("expires_in", 3600)

        access_token = token_data.get("access_token") or short_lived_token
        profile = get_instagram_login_profile(
            access_token,
            expected_username=target_username,
        )
        granted_permissions = token_data.get("permissions") or token_data.get("scope") or INSTAGRAM_OAUTH_SCOPES
        scopes = ",".join(granted_permissions) if isinstance(granted_permissions, list) else str(granted_permissions)

    elif platform == "x":
        oauth_app_config(platform)
        if not code_verifier:
            raise HTTPException(status_code=400, detail="X PKCE verifier is missing. Restart the connection.")
        form = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier,
            "client_id": X_CLIENT_ID,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        auth = (X_CLIENT_ID, X_CLIENT_SECRET) if X_CLIENT_SECRET else None
        token_data = oauth_json_request("POST", "https://api.x.com/2/oauth2/token", data=form, headers=headers, auth=auth)
        profile_payload = oauth_json_request(
            "GET", "https://api.x.com/2/users/me",
            headers={"Authorization": f"Bearer {token_data.get('access_token', '')}"},
            params={"user.fields": "profile_image_url,public_metrics,description"},
        )
        profile = profile_payload.get("data") or {}
        scopes = token_data.get("scope", "users.read tweet.read offline.access")

    else:
        oauth_app_config(platform)
        token_data = oauth_json_request(
            "POST", "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        profile = oauth_json_request(
            "GET", "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data.get('access_token', '')}"},
        )
        scopes = "openid profile email"

    store_social_connection(
        user_id,
        platform,
        token_data,
        profile,
        scopes,
        auth_method="instagram_login" if platform == "instagram" else None,
    )

    sync_notice = ""
    if platform == "instagram":
        try:
            initial_sync = sync_instagram(user={"user_id": user_id})
            sync_notice = (
                "<p><strong>Initial sync complete.</strong> "
                + html.escape(str(initial_sync.get("followers") if initial_sync.get("followers") is not None else "Follower count unavailable"))
                + " followers; "
                + html.escape(str(len(initial_sync.get("recent_media") or [])))
                + " recent posts saved for your dashboard.</p>"
            )
        except HTTPException as sync_error:
            sync_notice = (
                "<p><strong>Your account is connected, but the first data sync did not finish.</strong> "
                + html.escape(str(sync_error.detail))
                + " You can retry with Sync connected account on the dashboard.</p>"
            )

    account_name = profile.get("username") or profile.get("name") or profile.get("email") or "account"
    safe_platform = html.escape(platform.capitalize())
    safe_account = html.escape(str(account_name))
    safe_dashboard_url = html.escape(FRONTEND_DASHBOARD_URL, quote=True)
    return HTMLResponse(
        content=f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CreatorIQ connection</title>
<style>
body{{font-family:Segoe UI,Arial,sans-serif;background:#f5f6fc;color:#191936;display:grid;place-items:center;min-height:100vh;margin:0}}
main{{background:#fff;border:1px solid #e7e8f3;border-radius:14px;padding:28px;max-width:480px;margin:20px;box-shadow:0 4px 20px #19193612}}
h2{{margin-top:0;color:#12a875}}a{{display:inline-block;background:#6847f5;color:white;text-decoration:none;padding:11px 16px;border-radius:8px;margin-top:12px}}
</style></head><body><main>
<h2>{safe_platform} connected successfully</h2>
<p>Your {safe_platform} account <strong>{safe_account}</strong> has been securely connected to your CreatorIQ user.</p>
<p>Your access token was encrypted before it was saved. It has not been sent to the browser.</p>
{sync_notice}
<a href="{safe_dashboard_url}">Return to CreatorIQ dashboard</a>
</main></body></html>""",
        status_code=200,
    )


@app.get("/auth/{platform}/status", tags=["Social OAuth"])
def social_oauth_status(platform: str, user=Depends(get_current_user)):
    if platform not in OAUTH_PLATFORMS:
        raise HTTPException(status_code=404, detail="Unsupported social platform.")
    ensure_social_oauth_tables()
    try:
        with get_engine().connect() as conn:
            row = conn.execute(text("""
                SELECT platform, platform_user_id, username, display_name,
                       profile_image_url, auth_method, token_expires_at, scopes, connected_at, updated_at
                FROM public.social_connections
                WHERE user_id = :uid AND platform = :platform
            """), {"uid": user["user_id"], "platform": platform}).mappings().first()
        if not row:
            return {"platform": platform, "connected": False}
        return {"platform": platform, "connected": True, **serialize_rows([row])[0]}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not read social connection status.")


@app.get("/auth/connections", tags=["Social OAuth"])
def list_social_connections(user=Depends(get_current_user)):
    ensure_social_oauth_tables()
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(text("""
                SELECT platform, platform_user_id, username, display_name,
                       profile_image_url, auth_method, token_expires_at, scopes, connected_at, updated_at
                FROM public.social_connections
                WHERE user_id = :uid ORDER BY platform
            """), {"uid": user["user_id"]}).mappings().all()
        return {"connections": serialize_rows(rows)}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not list social connections.")


@app.delete("/auth/{platform}/disconnect", tags=["Social OAuth"])
def disconnect_social_account(platform: str, user=Depends(get_current_user)):
    if platform not in OAUTH_PLATFORMS:
        raise HTTPException(status_code=404, detail="Unsupported social platform.")
    ensure_social_oauth_tables()
    try:
        with get_engine().begin() as conn:
            result = conn.execute(text("""
                DELETE FROM public.social_connections
                WHERE user_id = :uid AND platform = :platform
            """), {"uid": user["user_id"], "platform": platform})
        return {"platform": platform, "disconnected": bool(result.rowcount)}
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not disconnect social account.")

@app.get("/social/oauth/{platform}/profile", tags=["Social OAuth"])
def get_connected_social_profile(platform: str, user=Depends(get_current_user)):
    """Validate and read the signed-in user's own connected social profile."""
    if platform not in OAUTH_PLATFORMS:
        raise HTTPException(status_code=404, detail="Supported platforms: instagram, x, linkedin.")
    ensure_social_oauth_tables()
    try:
        with get_engine().connect() as conn:
            row = conn.execute(text("""
                SELECT access_token_encrypted, auth_method
                FROM public.social_connections
                WHERE user_id = :uid AND platform = :platform
            """), {"uid": user["user_id"], "platform": platform}).mappings().first()
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Could not read the saved social connection.")
    if not row:
        raise HTTPException(status_code=404, detail=f"No {platform} account is connected to this CreatorIQ user.")
    try:
        access_token = get_token_cipher().decrypt(row["access_token_encrypted"].encode()).decode()
    except (InvalidToken, ValueError, TypeError):
        raise HTTPException(status_code=500, detail="Saved social token could not be decrypted. Check SOCIAL_TOKEN_ENCRYPTION_KEY.")

    if platform == "instagram":
        if row.get("auth_method") != "instagram_login":
            raise HTTPException(
                status_code=409,
                detail="This Instagram connection used the previous Facebook Login flow. Select Connect Instagram to authorize through Instagram Login.",
            )
        profile = get_instagram_login_profile(access_token)
        return {
            "platform": platform,
            "connected": True,
            "account": profile,
            "available_metrics": ["username", "account_type", "media_count"],
            "note": (
                "This is the signed-in Instagram professional account. Follower "
                "counts and insights are fetched separately and require "
                "instagram_business_manage_insights."
            ),
        }

    if platform == "x":
        payload = oauth_json_request(
            "GET", "https://api.x.com/2/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"user.fields": "profile_image_url,public_metrics,description"},
        )
        profile = payload.get("data") or {}
        metrics = profile.get("public_metrics") or {}
        followers = metrics.get("followers_count")
        if followers is not None:
            save_social_snapshot(user["user_id"], "x", int(followers))
        return {"platform": platform, "connected": True, "account": profile,
                "followers_snapshot_saved": followers is not None,
                "note": "X metrics depend on the scopes and API access tier granted to the app."}

    profile = oauth_json_request(
        "GET", "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    return {"platform": platform, "connected": True, "account": profile,
            "available_metrics": ["member profile fields returned by LinkedIn OpenID Connect"],
            "note": "Personal LinkedIn follower counts and organization analytics require separate approved LinkedIn API products and permissions."}

@app.get("/data-deletion", response_class=HTMLResponse)
def data_deletion():
    return """
    <html>
    <head>
        <title>CreatorIQ - Data Deletion</title>
    </head>
    <body>
        <h1>CreatorIQ Data Deletion Instructions</h1>

        <p>Users can request deletion of their CreatorIQ account
        and associated personal data.</p>

        <h2>How to request deletion</h2>
        <ol>
            <li>Contact the CreatorIQ support team using the
            email address listed on our website.</li>
            <li>Include your registered email address.</li>
            <li>Request deletion of your account and associated data.</li>
        </ol>

        <p>We will verify your request and process eligible
        deletion requests in accordance with applicable laws.</p>
    </body>
    </html>
    """

@app.get("/privacy-policy", response_class=HTMLResponse)
def privacy_policy():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>CreatorIQ Privacy Policy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
        <h1>CreatorIQ Privacy Policy</h1>
        <p>Last updated: November 12, 2026</p>

        <h2>1. Introduction</h2>
        <p>CreatorIQ provides social media analytics and creator
        management services. This policy explains how we collect,
        use, store and protect user information.</p>

        <h2>2. Information We Collect</h2>
        <p>Depending on the services and permissions you use,
        we may collect your name, email address, social media
        account identifiers, profile information, posts and
        available analytics data.</p>

        <h2>3. How We Use Information</h2>
        <p>We use information to authenticate users, connect
        social media accounts, display analytics, provide
        dashboard features and improve our services.</p>

        <h2>4. Data Storage and Security</h2>
        <p>CreatorIQ uses its database infrastructure to store
        application information. We apply reasonable security
        measures to protect user data.</p>

        <h2>5. Sharing of Information</h2>
        <p>We do not sell personal information. Information may
        be processed by service providers necessary to operate
        CreatorIQ or disclosed when legally required.</p>

        <h2>6. Data Retention and Deletion</h2>
        <p>We retain information only as needed to provide our
        services and meet legal obligations. Users may request
        deletion of their account and associated data through
        our data deletion process.</p>

        <h2>7. Third-Party Services</h2>
        <p>CreatorIQ may connect with Meta and Instagram APIs.
        Data obtained through these services is handled in
        accordance with applicable platform policies.</p>

        <h2>8. Contact</h2>
        <p>For privacy questions or data deletion requests,
        contact: [salunkey104@gmail.com]</p>
    </body>
    </html>
    """
