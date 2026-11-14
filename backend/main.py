import os
import secrets
from urllib.parse import urlencode
from datetime import timezone

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import delete

from models import SocialAccount, OAuthState

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Role, User, ContentPost, AudienceSnapshot
from schemas import RegisterRequest, LoginRequest, TokenResponse
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


# Initialize database tables and default roles
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        default_roles = [
            "Creator",
            "Agency",
            "Marketing Team",
            "Administrator",
        ]

        for name in default_roles:
            existing_role = db.query(Role).filter_by(
                name=name
            ).first()

            if not existing_role:
                db.add(Role(name=name))

        db.commit()

    yield


# Create FastAPI application
app = FastAPI(
    title="CreatorIQ Authentication API",
    description="CreatorIQ User Management and Analytics API",
    version="1.1.0",
    lifespan=lifespan,
)


# CORS: allow the React/Vite frontend, including port 5181
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{port}"
        for port in range(5173, 5184)
    ] + [
        f"http://127.0.0.1:{port}"
        for port in range(5173, 5184)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


bearer = HTTPBearer()
# YouTube OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/integrations/youtube/callback",
)

FERNET_KEY = os.getenv("FERNET_KEY")

YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def encrypt_social_token(token: str) -> str:
    if not FERNET_KEY:
        raise RuntimeError("FERNET_KEY is not configured")

    return Fernet(FERNET_KEY.encode()).encrypt(
        token.encode()
    ).decode()


def get_google_oauth_config():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are not configured",
        )

    if not FERNET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Token encryption is not configured",
        )

# Validate access token and return active user
def get_current_user(
    credentials: HTTPAuthorizationCredentials,
    db: Session,
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


# Require Administrator role
def require_admin(user: User, db: Session):
    role = db.get(Role, user.role_id)

    if not role or role.name != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )

    return role


# Root endpoint
@app.get("/")
def home():
    return {
        "message": "CreatorIQ API is running",
        "status": "running",
    }


# Health-check endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "application": "CreatorIQ",
    }


# Register a new user
@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    existing_user = db.query(User).filter_by(
        email=email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    role = db.query(Role).filter_by(name=data.role).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    # Public registration cannot grant Administrator access.
    if role.name == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Administrator accounts cannot be created "
                "through public registration"
            ),
        )

    user = User(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        role_id=role.id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id,
        "email": user.email,
        "role": role.name,
    }


# Log in an existing user
@app.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()

    user = db.query(User).filter_by(email=email).first()

    if not user or not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    role = db.get(Role, user.role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role not found",
        )

    token = create_access_token(user.id, role.name)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# Get the authenticated user's profile
@app.get("/profile")
def profile(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    role = db.get(Role, user.role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User role not found",
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role.name,
    }


# List registered users (Administrators only)
@app.get("/users", tags=["User Management"])
def list_users(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    require_admin(user, db)

    users = db.query(User).order_by(User.id.asc()).all()
    results = []

    for item in users:
        role = db.get(Role, item.role_id)

        results.append({
            "id": item.id,
            "name": item.name,
            "email": item.email,
            "role": role.name if role else "Unknown",
            "is_active": item.is_active,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at
                else None
            ),
        })

    return {
        "total": len(results),
        "users": results,
    }


# Database-backed analytics overview (Administrators only)
@app.get("/analytics/overview", tags=["Analytics"])
def analytics_overview(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    require_admin(user, db)

    total_users = db.query(User).count()

    active_users = db.query(User).filter(
        User.is_active.is_(True)
    ).count()

    role_counts = {}

    for role in db.query(Role).order_by(Role.name).all():
        role_counts[role.name] = (
            db.query(User)
            .filter(User.role_id == role.id)
            .count()
        )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "users_by_role": role_counts,
    }

@app.post("/analytics/demo-data", tags=["Analytics"])
def create_analytics_demo_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)

    existing = db.query(ContentPost).filter(
        ContentPost.user_id == user.id
    ).first()

    if existing:
        return {
            "message": "Analytics data already exists",
            "created": False,
        }

    platforms = ["Instagram", "YouTube", "TikTok"]

    sample_posts = [
        ("Behind the scenes", 1200, 145, 18, 12),
        ("Daily routine", 1800, 210, 25, 17),
        ("Product review", 2500, 310, 42, 28),
        ("Quick tutorial", 3200, 390, 51, 34),
        ("Weekend vlog", 2100, 270, 31, 20),
        ("Tips and tricks", 4100, 520, 63, 45),
        ("Latest update", 5000, 650, 80, 55),
    ]

    today = date.today()

    for index, item in enumerate(sample_posts):
        title, views, likes, comments, shares = item
        day = today - timedelta(days=6 - index)

        db.add(
            ContentPost(
                user_id=user.id,
                title=title,
                platform=platforms[index % len(platforms)],
                published_at=datetime.combine(day, datetime.min.time()),
                views=views,
                likes=likes,
                comments=comments,
                shares=shares,
            )
        )

    base_followers = {
        "Instagram": 1200,
        "YouTube": 850,
        "TikTok": 1600,
    }

    for index in range(7):
        snapshot_day = today - timedelta(days=6 - index)

        for platform_index, platform in enumerate(platforms):
            followers = (
                base_followers[platform]
                + index * (25 + platform_index * 8)
            )

            db.add(
                AudienceSnapshot(
                    user_id=user.id,
                    platform=platform,
                    snapshot_date=snapshot_day,
                    followers=followers,
                )
            )

    db.commit()

    return {
        "message": "Sample analytics data created",
        "created": True,
    }

@app.get("/analytics/creator", tags=["Analytics"])
def get_creator_analytics(
    days: str = "7",
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Return analytics for 7, 30, 90 days, or the current calendar year.

    Use days=7, days=30, days=90, or days=year.
    """
    user = get_current_user(credentials, db)

    today = date.today()
    if days == "year":
        start_date = date(today.year, 1, 1)
        selected_range = "year"
    else:
        try:
            days_count = int(days)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="days must be 7, 30, 90, or year",
            )

        if days_count not in [7, 30, 90]:
            raise HTTPException(
                status_code=400,
                detail="days must be 7, 30, 90, or year",
            )

        start_date = today - timedelta(days=days_count - 1)
        selected_range = days_count

    cutoff = datetime.combine(start_date, datetime.min.time())

    posts = (
        db.query(ContentPost)
        .filter(
            ContentPost.user_id == user.id,
            ContentPost.published_at >= cutoff,
        )
        .order_by(ContentPost.published_at.desc())
        .all()
    )

    snapshots = (
        db.query(AudienceSnapshot)
        .filter(
            AudienceSnapshot.user_id == user.id,
            AudienceSnapshot.snapshot_date >= start_date,
        )
        .order_by(AudienceSnapshot.snapshot_date.asc())
        .all()
    )

    total_views = sum(post.views for post in posts)
    total_likes = sum(post.likes for post in posts)
    total_comments = sum(post.comments for post in posts)
    total_shares = sum(post.shares for post in posts)

    interactions = total_likes + total_comments + total_shares
    engagement_rate = (
        round(interactions / total_views * 100, 2)
        if total_views else 0
    )

    daily = {}

    for post in posts:
        key = post.published_at.date().isoformat()

        if key not in daily:
            daily[key] = {
                "date": key,
                "views": 0,
                "likes": 0,
                "comments": 0,
            }

        daily[key]["views"] += post.views
        daily[key]["likes"] += post.likes
        daily[key]["comments"] += post.comments

    platforms = {}

    for post in posts:
        if post.platform not in platforms:
            platforms[post.platform] = {
                "platform": post.platform,
                "views": 0,
                "likes": 0,
                "comments": 0,
                "shares": 0,
            }

        platforms[post.platform]["views"] += post.views
        platforms[post.platform]["likes"] += post.likes
        platforms[post.platform]["comments"] += post.comments
        platforms[post.platform]["shares"] += post.shares

    latest_followers = {}

    for snapshot in snapshots:
        latest_followers[snapshot.platform] = snapshot.followers

    return {
        "sample_data": True,
        "days": selected_range,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "summary": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "engagement_rate": engagement_rate,
            "total_posts": len(posts),
            "total_followers": sum(latest_followers.values()),
        },
        "daily_trend": sorted(
            daily.values(), key=lambda item: item["date"]
        ),
        "platform_breakdown": list(platforms.values()),
        "audience_growth": [
            {
                "date": snapshot.snapshot_date.isoformat(),
                "platform": snapshot.platform,
                "followers": snapshot.followers,
            }
            for snapshot in snapshots
        ],
        "top_posts": [
            {
                "id": post.id,
                "title": post.title,
                "platform": post.platform,
                "views": post.views,
                "likes": post.likes,
                "comments": post.comments,
                "shares": post.shares,
            }
            for post in sorted(
                posts, key=lambda item: item.views, reverse=True
            )[:10]
        ],
    }

@app.post("/analytics/demo-data/extend", tags=["Analytics"])
def extend_analytics_demo_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Add historical demo records for date-filter testing."""
    user = get_current_user(credentials, db)

    today = date.today()
    platforms = ["Instagram", "YouTube", "TikTok"]

    # Dates already containing posts for this user.
    existing_post_dates = {
        post.published_at.date()
        for post in db.query(ContentPost)
        .filter(ContentPost.user_id == user.id)
        .all()
    }

    # Existing audience snapshot dates by platform.
    existing_snapshots = {
        (snapshot.snapshot_date, snapshot.platform)
        for snapshot in db.query(AudienceSnapshot)
        .filter(AudienceSnapshot.user_id == user.id)
        .all()
    }

    posts_added = 0
    snapshots_added = 0

    for days_ago in range(364, -1, -1):
        day = today - timedelta(days=days_ago)

        # Add a demo post only when that date has no post.
        if day not in existing_post_dates:
            index = days_ago

            db.add(
                ContentPost(
                    user_id=user.id,
                    title=f"Demo Content {day.isoformat()}",
                    platform=platforms[index % len(platforms)],
                    published_at=datetime.combine(
                        day, datetime.min.time()
                    ),
                    views=500 + ((index * 137) % 4500),
                    likes=30 + ((index * 17) % 500),
                    comments=5 + ((index * 7) % 80),
                    shares=3 + ((index * 5) % 60),
                )
            )
            posts_added += 1

        # Add missing follower snapshots for each platform.
        for platform_index, platform in enumerate(platforms):
            if (day, platform) not in existing_snapshots:
                base_followers = [1200, 850, 1600][platform_index]
                daily_growth = [25, 33, 41][platform_index]

                db.add(
                    AudienceSnapshot(
                        user_id=user.id,
                        platform=platform,
                        snapshot_date=day,
                        followers=base_followers
                        + (364 - days_ago) * daily_growth,
                    )
                )
                snapshots_added += 1

    db.commit()

    return {
        "message": "Historical demo data added successfully",
        "posts_added": posts_added,
        "snapshots_added": snapshots_added,
        "note": "These are generated demo metrics, not live social data.",
    }
from datetime import date, datetime, timedelta

@app.post("/analytics/demo-data/extend", tags=["Analytics"])
def extend_analytics_demo_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)

    today = date.today()
    platforms = ["Instagram", "YouTube", "TikTok"]

    existing_posts = (
        db.query(ContentPost)
        .filter(ContentPost.user_id == user.id)
        .all()
    )

    existing_post_dates = {
        post.published_at.date()
        for post in existing_posts
        if post.published_at is not None
    }

    existing_snapshots = (
        db.query(AudienceSnapshot)
        .filter(AudienceSnapshot.user_id == user.id)
        .all()
    )

    existing_snapshot_keys = {
        (snapshot.snapshot_date, snapshot.platform)
        for snapshot in existing_snapshots
    }

    posts_added = 0
    snapshots_added = 0

    for days_ago in range(364, -1, -1):
        day = today - timedelta(days=days_ago)
        index = 364 - days_ago

        if day not in existing_post_dates:
            db.add(
                ContentPost(
                    user_id=user.id,
                    title=f"Demo Content {day.isoformat()}",
                    platform=platforms[index % 3],
                    published_at=datetime.combine(
                        day, datetime.min.time()
                    ),
                    views=500 + ((index * 137) % 4500),
                    likes=30 + ((index * 17) % 500),
                    comments=5 + ((index * 7) % 80),
                    shares=3 + ((index * 5) % 60),
                )
            )
            posts_added += 1

        for platform_index, platform in enumerate(platforms):
            key = (day, platform)

            if key not in existing_snapshot_keys:
                base_followers = [1200, 850, 1600][platform_index]
                daily_growth = [25, 33, 41][platform_index]

                db.add(
                    AudienceSnapshot(
                        user_id=user.id,
                        platform=platform,
                        snapshot_date=day,
                        followers=base_followers + index * daily_growth,
                    )
                )
                snapshots_added += 1

    db.commit()

    return {
        "message": "Historical demo data added",
        "posts_added": posts_added,
        "snapshots_added": snapshots_added,
        "note": "Generated demo data, not live social media metrics.",
    }

# Start YouTube OAuth connection
@app.get("/integrations/youtube/connect", tags=["Integrations"])
def connect_youtube(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)
    get_google_oauth_config()

    state = secrets.token_urlsafe(32)

    db.add(
        OAuthState(
            state=state,
            user_id=user.id,
            platform="YouTube",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(YOUTUBE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }

    return {
        "authorization_url": (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            + urlencode(params)
        )
    }


# Google redirects here after authorization
@app.get("/integrations/youtube/callback", tags=["Integrations"])
def youtube_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        raise HTTPException(
            status_code=400,
            detail="YouTube authorization was not completed",
        )

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Missing OAuth code or state",
        )

    state_record = db.get(OAuthState, state)

    if not state_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or already-used OAuth state",
        )

    # Consume the state so it cannot be reused.
    user_id = state_record.user_id
    expires_at = state_record.expires_at

    db.delete(state_record)
    db.commit()

    if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="OAuth session expired. Please connect again.",
        )

    get_google_oauth_config()

    try:
        with httpx.Client(timeout=20.0) as client:
            token_response = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

            access_token = token_data["access_token"]

            channel_response = client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={
                    "part": "snippet",
                    "mine": "true",
                },
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
            )
            channel_response.raise_for_status()
            channel_data = channel_response.json()

    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not retrieve your YouTube channel. "
                "Check OAuth permissions and Google API configuration."
            ),
        )

    channels = channel_data.get("items", [])

    if not channels:
        raise HTTPException(
            status_code=404,
            detail="No YouTube channel was found for this Google account",
        )

    channel = channels[0]
    channel_id = channel["id"]
    channel_name = channel["snippet"]["title"]

    expires_in = int(token_data.get("expires_in", 3600))
    token_expiry = datetime.now(timezone.utc) + timedelta(
        seconds=expires_in
    )

    account = (
        db.query(SocialAccount)
        .filter_by(user_id=user_id, platform="YouTube")
        .first()
    )

    refresh_token = token_data.get("refresh_token")

    if account:
        account.external_account_id = channel_id
        account.account_name = channel_name
        account.access_token_encrypted = encrypt_social_token(
            access_token
        )
        account.token_expires_at = token_expiry
        account.scopes = token_data.get(
            "scope", " ".join(YOUTUBE_SCOPES)
        )

        # Google may omit a refresh token on subsequent authorizations.
        if refresh_token:
            account.refresh_token_encrypted = encrypt_social_token(
                refresh_token
            )
    else:
        account = SocialAccount(
            user_id=user_id,
            platform="YouTube",
            external_account_id=channel_id,
            account_name=channel_name,
            access_token_encrypted=encrypt_social_token(
                access_token
            ),
            refresh_token_encrypted=(
                encrypt_social_token(refresh_token)
                if refresh_token else None
            ),
            token_expires_at=token_expiry,
            scopes=token_data.get(
                "scope", " ".join(YOUTUBE_SCOPES)
            ),
        )
        db.add(account)

    db.commit()

    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:5173"
    )

    from fastapi.responses import RedirectResponse

    return RedirectResponse(
        url=frontend_url + "/dashboard?youtube=connected",
        status_code=303,
    )


# Show the logged-in user's connected social accounts
@app.get("/integrations/accounts", tags=["Integrations"])
def list_social_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user = get_current_user(credentials, db)

    accounts = (
        db.query(SocialAccount)
        .filter(SocialAccount.user_id == user.id)
        .order_by(SocialAccount.id.asc())
        .all()
    )

    return {
        "accounts": [
            {
                "id": account.id,
                "platform": account.platform,
                "account_name": account.account_name,
                "external_account_id": account.external_account_id,
                "connected_at": (
                    account.created_at.isoformat()
                    if account.created_at else None
                ),
            }
            for account in accounts
        ]
    }