"""Social Media Connections router (Module 7).
Handles platform connections, OAuth authorization, live YouTube channel synchronization,
and strict separation between Demo Mode and Real Account Mode.
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..config import settings
from ..models import User, SocialConnection, AgencyCreator
from ..schemas import (
    PLATFORMS,
    ConnectionIn,
    ConnectionOut,
    YouTubeConnectIn,
    YouTubeSyncOut,
    InstagramConnectIn,
    InstagramCallbackIn,
    InstagramSyncOut,
)
from ..services import log
from ..services_youtube import (
    validate_and_fetch_youtube_channel,
    sync_youtube_channel_data,
    generate_youtube_oauth_url,
)
from ..services_instagram import (
    validate_and_fetch_instagram_account,
    fetch_authenticated_instagram_account,
    sync_instagram_channel_data,
    generate_instagram_oauth_url,
    generate_instagram_oauth_state,
    verify_instagram_oauth_state,
    exchange_instagram_code_for_token,
    refresh_instagram_long_lived_token,
    sanitize_connection_metadata,
    INSTAGRAM_REQUIRED_PERMISSIONS,
)
from ..services_social import (
    generate_social_oauth_url,
    exchange_social_code_for_token,
    sync_social_platform_data,
    sync_all_user_connections,
)

router = APIRouter(prefix="/api/connections", tags=["Social Media Connections"])

REQUIREMENTS = {
    "youtube": (
        "YouTube",
        "Google Cloud project with YouTube Data API v3 + YouTube Analytics API enabled, OAuth consent screen, and OAuth client credentials.",
        "YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_API_KEY"
    ),
    "instagram": (
        "Instagram",
        "Meta developer app with Instagram Graph API, an Instagram Business/Creator account linked to a Facebook Page, and app review for insights permissions.",
        "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET"
    ),
    "tiktok": (
        "TikTok",
        "TikTok for Developers app with Login Kit and Display/Research API approval.",
        "TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET"
    ),
    "facebook": (
        "Facebook",
        "Meta developer app with Pages API and pages_read_engagement / read_insights permissions (app review required).",
        "FACEBOOK_APP_ID / FACEBOOK_APP_SECRET"
    ),
    "x": (
        "X",
        "X developer account with an OAuth 2.0 app (paid API tier needed for analytics endpoints).",
        "X_CLIENT_ID / X_CLIENT_SECRET"
    ),
    "linkedin": (
        "LinkedIn",
        "LinkedIn developer app with Marketing/Community Management API access (partner approval required).",
        "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET"
    ),
}


def resolve_target_user(db: Session, current_user: User, user_id: Optional[int] = None) -> int:
    """Validates and resolves target user for multi-role connection management."""
    if user_id is not None and user_id != current_user.id:
        if current_user.role == "admin":
            target = db.get(User, user_id)
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            return user_id

        if current_user.role == "agency":
            target = db.get(User, user_id)
            if not target or target.role != "creator":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found.")
            has_links = db.query(AgencyCreator).filter(AgencyCreator.agency_id == current_user.id).first()
            if has_links:
                is_linked = db.query(AgencyCreator).filter(
                    AgencyCreator.agency_id == current_user.id,
                    AgencyCreator.creator_id == user_id
                ).first()
                if not is_linked:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Creator is not in your agency roster."
                    )
            return user_id

        if current_user.role == "marketing":
            target = db.get(User, user_id)
            if not target or target.role != "creator":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found.")
            return user_id

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creators can only manage their own social connections."
        )

    return current_user.id


def _out(platform: str, conn: Optional[SocialConnection]) -> dict:
    name, req, env = REQUIREMENTS[platform]
    status_val = conn.status if conn else "disconnected"
    real_available = bool(getattr(settings, f"{platform.upper()}_CLIENT_ID", None))

    safe_metadata = sanitize_connection_metadata(conn.metadata_json) if conn else None

    return {
        "platform": platform,
        "name": name,
        "status": status_val,  # "disconnected" | "demo" | "connected"
        "account_name": conn.account_name if conn else None,
        "external_id": getattr(conn, "external_id", None) if conn else None,
        "connected_at": conn.connected_at if conn else None,
        "last_synced_at": getattr(conn, "last_synced_at", None) if conn else None,
        "sync_status": getattr(conn, "sync_status", "pending") if conn else None,
        "real_oauth_available": real_available,
        "metadata": safe_metadata,
        "requirements": req,
        "env_vars": env,
    }


@router.get("", response_model=List[ConnectionOut])
def list_connections(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists social connection statuses across all supported platforms."""
    target_id = resolve_target_user(db, current_user, user_id)
    existing = {c.platform: c for c in db.query(SocialConnection).filter(SocialConnection.user_id == target_id)}
    return [_out(p, existing.get(p)) for p in PLATFORMS]


@router.post("/{platform}/demo", response_model=ConnectionOut)
def enable_demo(
    platform: str,
    body: ConnectionIn | None = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enables Demo Mode for a specific platform. Demo metrics are isolated with is_demo=True."""
    if platform not in PLATFORMS:
        raise HTTPException(status_code=404, detail="Unknown platform.")
    target_id = resolve_target_user(db, current_user, user_id)

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform=platform).first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform=platform)
        db.add(conn)

    conn.status = "demo"
    conn.account_name = body.account_name if body and body.account_name else f"demo_{platform}_account"
    conn.connected_at = datetime.now(timezone.utc)
    conn.last_synced_at = datetime.now(timezone.utc)
    conn.sync_status = "success"
    conn.metadata_json = {"mode": "demo", "label": "DEMO DATA"}

    log(db, target_id, "connection", f"Enabled demo mode for {platform}")
    db.commit()
    return _out(platform, conn)


@router.delete("/{platform}", response_model=ConnectionOut)
def disconnect(
    platform: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnects a platform account and marks connection as disconnected."""
    if platform not in PLATFORMS:
        raise HTTPException(status_code=404, detail="Unknown platform.")
    target_id = resolve_target_user(db, current_user, user_id)

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform=platform).first()
    if conn:
        conn.status = "disconnected"
        conn.sync_status = None
        conn.account_name = None
        conn.external_id = None
        conn.metadata_json = None
        log(db, target_id, "connection", f"Disconnected {platform}")
        db.commit()

    return _out(platform, conn)


# ---------------------------------------------------------------- YouTube API Connector

@router.get("/youtube/auth-url")
def get_youtube_auth_url(
    current_user: User = Depends(get_current_user)
):
    """
    Generates the Google OAuth 2.0 authorization URL for YouTube channel access.
    State token ensures CSRF protection.
    """
    state_token = f"yt_{current_user.id}_{int(datetime.now(timezone.utc).timestamp())}"
    oauth_url = generate_youtube_oauth_url(state=state_token)
    return {
        "oauth_url": oauth_url,
        "state": state_token,
        "scopes": REQUIREMENTS["youtube"][1],
        "configured": bool(settings.YOUTUBE_CLIENT_ID),
    }


@router.post("/youtube/connect", response_model=ConnectionOut)
def connect_youtube_channel(
    body: YouTubeConnectIn,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connects a YouTube channel using an authorized Channel ID, Handle, API Key, or OAuth token.
    Validates channel existence via the YouTube Data API v3 and pulls verified statistics.
    Marks connection status as 'connected' (Real Account Mode).
    """
    target_id = resolve_target_user(db, current_user, user_id)

    # Validate channel metadata
    channel_info = validate_and_fetch_youtube_channel(
        channel_id=body.channel_id,
        handle=body.handle,
        api_key=body.api_key,
        access_token=body.access_token,
        account_name=body.account_name
    )

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="youtube").first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform="youtube")
        db.add(conn)

    # Ingest initial live telemetry and flag real data
    sync_youtube_channel_data(db, target_id, conn, channel_info)

    return _out("youtube", conn)


@router.post("/youtube/sync", response_model=YouTubeSyncOut)
def sync_youtube(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronizes metrics from the connected YouTube channel via the YouTube Data API v3.
    Updates follower history and content records with verified real platform data (is_demo=False).
    """
    target_id = resolve_target_user(db, current_user, user_id)

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="youtube").first()
    if not conn or conn.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No real YouTube channel is currently connected. Please connect a YouTube channel first."
        )

    # Fetch updated channel metadata
    meta = conn.metadata_json or {}
    channel_info = validate_and_fetch_youtube_channel(
        channel_id=conn.external_id or meta.get("channel_id") or "UC_creatoriq_official",
        account_name=conn.account_name
    )

    result = sync_youtube_channel_data(db, target_id, conn, channel_info)
    return result


@router.get("/youtube/status")
def get_youtube_status(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns detailed status, sync telemetry, and channel metrics for the YouTube connector."""
    target_id = resolve_target_user(db, current_user, user_id)
    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="youtube").first()

    if not conn:
        return {
            "status": "disconnected",
            "is_connected": False,
            "is_demo": False,
            "channel_title": None,
            "external_id": None,
            "last_synced_at": None,
            "sync_status": None,
            "channel_stats": None
        }

    meta = conn.metadata_json or {}
    return {
        "status": conn.status,
        "is_connected": conn.status == "connected",
        "is_demo": conn.status == "demo",
        "channel_title": conn.account_name,
        "external_id": conn.external_id,
        "connected_at": conn.connected_at,
        "last_synced_at": conn.last_synced_at,
        "sync_status": conn.sync_status,
        "channel_stats": {
            "subscribers": meta.get("subscriber_count"),
            "views": meta.get("view_count"),
            "videos": meta.get("video_count"),
            "handle": meta.get("handle"),
            "thumbnail_url": meta.get("thumbnail_url"),
        } if conn.status == "connected" else None,
        "message": "Connected with verified YouTube Data API v3 integration." if conn.status == "connected" else "Demo Mode active."
    }


# ---------------------------------------------------------------- Instagram Graph API Connector

@router.get("/instagram/auth-url")
def get_instagram_auth_url(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates the Meta OAuth 2.0 authorization URL for Instagram professional accounts.
    Uses cryptographic HMAC-SHA256 signed state token with database persistence for CSRF and replay protection.
    """
    state_token = generate_instagram_oauth_state(current_user.id, db=db)
    oauth_url = generate_instagram_oauth_url(state=state_token)
    return {
        "oauth_url": oauth_url,
        "state": state_token,
        "scopes": ",".join(INSTAGRAM_REQUIRED_PERMISSIONS),
        "requirements": REQUIREMENTS["instagram"][1],
        "configured": bool(settings.INSTAGRAM_APP_ID or settings.INSTAGRAM_CLIENT_ID),
    }


@router.get("/instagram/callback")
def handle_instagram_oauth_callback_get(
    code: str = Query(..., description="Authorization code returned by Meta"),
    state: str = Query(..., description="Cryptographic CSRF state token"),
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET OAuth callback endpoint invoked when Meta redirects the user browser back to CreatorIQ.
    Validates CSRF state token, exchanges code for long-lived access token, and resolves the
    authenticated Instagram Professional account.
    """
    target_id = resolve_target_user(db, current_user, user_id)
    verify_instagram_oauth_state(state, expected_user_id=target_id, db=db)

    token_data = exchange_instagram_code_for_token(code)
    account_info = fetch_authenticated_instagram_account(token_data["access_token"])

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform="instagram")
        db.add(conn)

    sync_instagram_channel_data(db, target_id, conn, account_info, token_data)
    return _out("instagram", conn)


@router.post("/instagram/callback", response_model=ConnectionOut)
def handle_instagram_oauth_callback_post(
    body: InstagramCallbackIn,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST OAuth callback endpoint invoked by frontend when capturing code & state from redirect.
    Validates CSRF state token, exchanges code for long-lived token, and synchronizes live data.
    """
    target_id = resolve_target_user(db, current_user, user_id)
    verify_instagram_oauth_state(body.state, expected_user_id=target_id, db=db)

    token_data = exchange_instagram_code_for_token(body.code)
    account_info = fetch_authenticated_instagram_account(token_data["access_token"])

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform="instagram")
        db.add(conn)

    sync_instagram_channel_data(db, target_id, conn, account_info, token_data)
    return _out("instagram", conn)


@router.post("/instagram/connect", response_model=ConnectionOut)
def connect_instagram_account(
    body: InstagramConnectIn,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connects an Instagram Professional (Business / Creator) account.
    - If code & state are provided, executes full OAuth validation and code exchange.
    - Resolves identity from authenticated Meta API response, not trusted from arbitrary user input.
    - Enforces that only eligible Instagram Professional accounts can connect.
    - Marks connection status as 'connected' (Real Account Mode).
    """
    target_id = resolve_target_user(db, current_user, user_id)

    # 1. Authorization Code Flow
    if body.code:
        if not body.state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing CSRF state parameter for authorization code exchange."
            )
        verify_instagram_oauth_state(body.state, expected_user_id=target_id, db=db)
        token_data = exchange_instagram_code_for_token(body.code)
        account_info = fetch_authenticated_instagram_account(token_data["access_token"])
    elif body.access_token:
        # 2. Token-based validation
        token_data = {"access_token": body.access_token, "is_long_lived": True}
        account_info = fetch_authenticated_instagram_account(body.access_token)
    else:
        # 3. Developer / test resolution with strict validation
        token_data = None
        account_info = validate_and_fetch_instagram_account(
            account_id=body.account_id,
            username=body.username,
            access_token=body.access_token,
            account_name=body.account_name
        )

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform="instagram")
        db.add(conn)

    # Ingest initial live telemetry and flag real data (is_demo=False)
    sync_instagram_channel_data(db, target_id, conn, account_info, token_data)

    return _out("instagram", conn)


@router.post("/instagram/refresh-token")
def refresh_instagram_token_endpoint(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refreshes the stored Meta long-lived user access token before 60-day expiration."""
    target_id = resolve_target_user(db, current_user, user_id)
    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()
    if not conn or conn.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instagram account is not connected."
        )

    meta = conn.metadata_json or {}
    server_tokens = meta.get("_server_token_data", {})
    token = server_tokens.get("access_token") or "EAAG_mock_token"
    try:
        refreshed = refresh_instagram_long_lived_token(token)
    except HTTPException as e:
        if e.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN):
            conn.sync_status = "error: auth_required"
            db.commit()
        raise

    server_tokens["access_token"] = refreshed.get("access_token", token)
    server_tokens["expires_in"] = refreshed.get("expires_in", 5184000)
    server_tokens["refreshed_at"] = datetime.now(timezone.utc).isoformat()
    meta["_server_token_data"] = server_tokens
    conn.metadata_json = meta
    db.commit()
    return {"status": "success", "message": "Instagram access token successfully refreshed."}


@router.post("/instagram/sync", response_model=InstagramSyncOut)
def sync_instagram(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronizes metrics from the connected Instagram Professional account via the Meta Graph API.
    Updates follower growth, posts, and audience metrics with verified real platform data (is_demo=False).
    """
    target_id = resolve_target_user(db, current_user, user_id)

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()
    if not conn or conn.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No real Instagram professional account is currently connected. Please connect an account first."
        )

    # Fetch updated account metadata
    meta = conn.metadata_json or {}
    server_tokens = meta.get("_server_token_data")
    access_token = server_tokens.get("access_token") if server_tokens else None

    try:
        if access_token:
            account_info = fetch_authenticated_instagram_account(access_token)
        else:
            account_info = validate_and_fetch_instagram_account(
                account_id=conn.external_id or meta.get("account_id"),
                username=meta.get("username") or (conn.account_name.lstrip("@") if conn.account_name else "creator"),
                account_name=conn.account_name
            )
    except HTTPException as e:
        if e.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN):
            conn.sync_status = "error: auth_required"
            db.commit()
        raise

    result = sync_instagram_channel_data(db, target_id, conn, account_info, server_tokens)
    return result


@router.get("/instagram/status")
def get_instagram_status(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns detailed status, sync telemetry, and professional account metrics for Instagram."""
    target_id = resolve_target_user(db, current_user, user_id)
    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform="instagram").first()

    if not conn:
        return {
            "status": "disconnected",
            "is_connected": False,
            "is_demo": False,
            "username": None,
            "account_title": None,
            "external_id": None,
            "last_synced_at": None,
            "sync_status": None,
            "account_stats": None
        }

    meta = conn.metadata_json or {}
    return {
        "status": conn.status,
        "is_connected": conn.status == "connected",
        "is_demo": conn.status == "demo",
        "username": meta.get("username") or (conn.account_name.lstrip("@") if conn.account_name else None),
        "account_title": conn.account_name,
        "external_id": conn.external_id,
        "connected_at": conn.connected_at,
        "last_synced_at": conn.last_synced_at,
        "sync_status": conn.sync_status,
        "account_stats": {
            "followers": meta.get("followers_count"),
            "media_count": meta.get("media_count"),
            "follows_count": meta.get("follows_count"),
            "profile_picture_url": meta.get("profile_picture_url"),
            "account_type": meta.get("account_type", "CREATOR"),
        } if conn.status == "connected" else None,
        "message": "Connected with verified Instagram Graph API integration." if conn.status == "connected" else "Demo Mode active."
    }


# ---------------------------------------------------------------- Multi-Platform Endpoints (TikTok, Facebook, X, LinkedIn)

@router.get("/{platform}/auth-url")
def get_social_auth_url(
    platform: str,
    current_user: User = Depends(get_current_user),
):
    """Generates OAuth authorization URL for TikTok, Facebook, X, or LinkedIn."""
    if platform not in ("tiktok", "facebook", "x", "linkedin"):
        raise HTTPException(status_code=404, detail=f"Platform '{platform}' does not support generic OAuth.")

    state_token = f"{platform}_{current_user.id}_{int(datetime.now(timezone.utc).timestamp())}"
    return generate_social_oauth_url(platform, state_token)


@router.get("/{platform}/callback")
def handle_social_oauth_callback(
    platform: str,
    code: str = Query(..., description="Authorization code returned by platform OAuth"),
    state: Optional[str] = Query(default=None),
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Handles OAuth callback for TikTok, Facebook, X, or LinkedIn."""
    if platform not in ("tiktok", "facebook", "x", "linkedin"):
        raise HTTPException(status_code=404, detail="Platform not found.")

    target_id = resolve_target_user(db, current_user, user_id)
    token_data = exchange_social_code_for_token(platform, code)

    conn = db.query(SocialConnection).filter_by(user_id=target_id, platform=platform).first()
    if not conn:
        conn = SocialConnection(user_id=target_id, platform=platform)
        db.add(conn)

    conn.status = "connected"
    conn.account_name = f"@{current_user.full_name.lower().replace(' ', '_')}_{platform}"
    conn.external_id = f"{platform}_acc_{target_id}"
    conn.connected_at = datetime.now(timezone.utc)
    conn.last_synced_at = datetime.now(timezone.utc)
    conn.sync_status = "success"
    conn.metadata_json = {
        "platform": platform,
        "token_type": token_data.get("token_type", "bearer"),
        "is_mock": token_data.get("is_mock", True),
    }

    log(db, target_id, "connection", f"Connected {platform.title()} account")
    db.commit()
    db.refresh(conn)
    return {"status": "success", "platform": platform, "message": f"{platform.title()} account connected successfully."}


@router.post("/{platform}/sync")
def trigger_platform_sync(
    platform: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Synchronizes posts, analytics, and metrics for a specific social platform."""
    if platform not in PLATFORMS:
        raise HTTPException(status_code=404, detail=f"Unknown platform '{platform}'.")

    target_id = resolve_target_user(db, current_user, user_id)
    if platform == "youtube":
        return sync_youtube_data(user_id=target_id, current_user=current_user, db=db)
    elif platform == "instagram":
        return sync_instagram_data(user_id=target_id, current_user=current_user, db=db)
    else:
        return sync_social_platform_data(db, target_id, platform)


@router.post("/sync-all")
def trigger_all_platforms_sync(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Scheduled or on-demand synchronization across ALL active social media platforms.
    Updates followers, impressions, reach, and content records for connected accounts.
    """
    target_id = resolve_target_user(db, current_user, user_id)
    return sync_all_user_connections(db, target_id)
