import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.database import get_db
from app.models import SocialAccount

router = APIRouter(prefix="/api/social", tags=["Social Accounts"])

FRONTEND_URL = os.getenv("FRONTEND_DASHBOARD_URL", "http://localhost:5173/dashboard").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
STATE_SECRET = os.getenv("OAUTH_STATE_SECRET", "")
TOKEN_KEY = os.getenv("SOCIAL_TOKEN_ENCRYPTION_KEY", "")
META_VERSION = os.getenv("META_GRAPH_API_VERSION", "v23.0")


def _fernet() -> Fernet:
    if not TOKEN_KEY:
        raise HTTPException(500, "SOCIAL_TOKEN_ENCRYPTION_KEY is not configured")
    try:
        return Fernet(TOKEN_KEY.encode())
    except Exception as exc:
        raise HTTPException(500, "SOCIAL_TOKEN_ENCRYPTION_KEY must be a valid Fernet key") from exc


def _encrypt(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return _fernet().encrypt(value.encode()).decode()


def _decrypt(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise HTTPException(500, "Could not decrypt stored social token; check encryption key") from exc


def _state_serializer() -> URLSafeTimedSerializer:
    if not STATE_SECRET:
        raise HTTPException(500, "OAUTH_STATE_SECRET is not configured")
    return URLSafeTimedSerializer(STATE_SECRET, salt="creatoriq-social-oauth")


def get_current_user_id(request: Request) -> int:
    """Validates CreatorIQ's existing JWT. Reuse your existing auth dependency if it differs."""
    if not JWT_SECRET:
        raise HTTPException(500, "JWT_SECRET_KEY is not configured")
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Bearer token required")
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        subject = payload.get("sub")
        if subject is None:
            raise HTTPException(401, "JWT is missing the user subject")
        return int(subject)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(401, "Invalid or expired CreatorIQ token") from exc


def _oauth_state(user_id: int, platform: str) -> str:
    return _state_serializer().dumps({"uid": user_id, "platform": platform, "nonce": secrets.token_urlsafe(16)})


def _read_state(state: str, expected_platform: str) -> int:
    try:
        payload = _state_serializer().loads(state, max_age=600)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(400, "OAuth state is invalid or expired. Start connection again.") from exc
    if payload.get("platform") != expected_platform:
        raise HTTPException(400, "OAuth platform mismatch")
    return int(payload["uid"])


def _callback(platform: str) -> str:
    return f"{BACKEND_URL}/api/social/callback/{platform}"


def _upsert_account(db: Session, user_id: int, platform: str, platform_user_id: str,
                    token: str, username: Optional[str] = None, display_name: Optional[str] = None,
                    refresh_token: Optional[str] = None, expires_in: Optional[int] = None):
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform,
        SocialAccount.platform_user_id == platform_user_id,
    ).first()
    if account is None:
        account = SocialAccount(
            user_id=user_id, platform=platform, platform_user_id=platform_user_id,
            access_token_encrypted=_encrypt(token), username=username, display_name=display_name,
        )
        db.add(account)
    account.access_token_encrypted = _encrypt(token)
    account.refresh_token_encrypted = _encrypt(refresh_token) if refresh_token else account.refresh_token_encrypted
    account.username = username or account.username
    account.display_name = display_name or account.display_name
    account.is_active = True
    account.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
    db.commit()
    db.refresh(account)
    return account


def _owned_account(db: Session, user_id: int, platform: str) -> SocialAccount:
    account = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id,
        SocialAccount.platform == platform,
        SocialAccount.is_active.is_(True),
    ).order_by(SocialAccount.updated_at.desc()).first()
    if not account:
        raise HTTPException(404, f"No connected {platform} account found. Connect an account first.")
    if account.token_expires_at and account.token_expires_at <= datetime.now(timezone.utc):
        raise HTTPException(401, f"{platform} access token has expired. Reconnect the account.")
    return account


@router.get("/accounts")
def list_accounts(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = db.query(SocialAccount).filter(
        SocialAccount.user_id == user_id, SocialAccount.is_active.is_(True)
    ).order_by(SocialAccount.created_at.desc()).all()
    return [{
        "id": row.id, "platform": row.platform, "platform_user_id": row.platform_user_id,
        "username": row.username, "display_name": row.display_name,
        "connected": True, "created_at": row.created_at.isoformat() if row.created_at else None,
        "token_expires_at": row.token_expires_at.isoformat() if row.token_expires_at else None,
    } for row in rows]


@router.get("/connect/youtube")
def connect_youtube(user_id: int = Depends(get_current_user_id)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id or not os.getenv("GOOGLE_CLIENT_SECRET"):
        raise HTTPException(500, "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env")
    state = _oauth_state(user_id, "youtube")
    params = {
        "client_id": client_id,
        "redirect_uri": _callback("youtube"),
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))


@router.get("/callback/youtube")
async def youtube_callback(code: str, state: str, error: Optional[str] = None, db: Session = Depends(get_db)):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}?social_error={error}")
    user_id = _read_state(state, "youtube")
    async with httpx.AsyncClient(timeout=25) as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "redirect_uri": _callback("youtube"),
            "grant_type": "authorization_code",
        })
        if token_response.is_error:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=youtube_token_exchange_failed")
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=youtube_missing_access_token")
        channel_response = await client.get("https://www.googleapis.com/youtube/v3/channels", params={
            "part": "snippet,statistics", "mine": "true"
        }, headers={"Authorization": f"Bearer {access_token}"})
        if channel_response.is_error:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=youtube_channel_lookup_failed")
        items = channel_response.json().get("items", [])
        if not items:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=no_youtube_channel_found")
        channel = items[0]
    _upsert_account(
        db, user_id, "youtube", channel["id"], access_token,
        username=channel.get("snippet", {}).get("customUrl"),
        display_name=channel.get("snippet", {}).get("title"),
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
    )
    return RedirectResponse(f"{FRONTEND_URL}?social_connected=youtube")


@router.get("/connect/instagram")
def connect_instagram(user_id: int = Depends(get_current_user_id)):
    app_id = os.getenv("META_APP_ID")
    if not app_id or not os.getenv("META_APP_SECRET"):
        raise HTTPException(500, "Configure META_APP_ID and META_APP_SECRET in backend .env")
    state = _oauth_state(user_id, "instagram")
    params = {
        "client_id": app_id, "redirect_uri": _callback("instagram"),
        "response_type": "code", "state": state,
        "scope": "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement",
    }
    return RedirectResponse("https://www.facebook.com/" + META_VERSION + "/dialog/oauth?" + urlencode(params))


@router.get("/connect/facebook")
def connect_facebook(user_id: int = Depends(get_current_user_id)):
    app_id = os.getenv("META_APP_ID")
    if not app_id or not os.getenv("META_APP_SECRET"):
        raise HTTPException(500, "Configure META_APP_ID and META_APP_SECRET in backend .env")
    state = _oauth_state(user_id, "facebook")
    params = {
        "client_id": app_id, "redirect_uri": _callback("facebook"),
        "response_type": "code", "state": state,
        "scope": "pages_show_list,pages_read_engagement,read_insights",
    }
    return RedirectResponse("https://www.facebook.com/" + META_VERSION + "/dialog/oauth?" + urlencode(params))


async def _meta_exchange(code: str, platform: str):
    params = {
        "client_id": os.getenv("META_APP_ID", ""),
        "client_secret": os.getenv("META_APP_SECRET", ""),
        "redirect_uri": _callback(platform),
        "code": code,
    }
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.get(f"https://graph.facebook.com/{META_VERSION}/oauth/access_token", params=params)
        if response.is_error:
            return None, None
        data = response.json()
        return data.get("access_token"), data.get("expires_in")


@router.get("/callback/facebook")
async def facebook_callback(code: Optional[str] = None, state: Optional[str] = None,
                            error: Optional[str] = None, db: Session = Depends(get_db)):
    if error or not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}?social_error=facebook_authorization_failed")
    user_id = _read_state(state, "facebook")
    token, expires_in = await _meta_exchange(code, "facebook")
    if not token:
        return RedirectResponse(f"{FRONTEND_URL}?social_error=facebook_token_exchange_failed")
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.get(f"https://graph.facebook.com/{META_VERSION}/me/accounts",
                                    params={"fields": "id,name,access_token", "access_token": token})
        if response.is_error:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=facebook_pages_lookup_failed")
        pages = response.json().get("data", [])
    if not pages:
        return RedirectResponse(f"{FRONTEND_URL}?social_error=no_accessible_facebook_page")
    # Save the first Page returned. A later UI can let the user choose among multiple Pages.
    page = pages[0]
    _upsert_account(db, user_id, "facebook", page["id"], page.get("access_token", token),
                    username=page["id"], display_name=page.get("name"), expires_in=expires_in)
    return RedirectResponse(f"{FRONTEND_URL}?social_connected=facebook")


@router.get("/callback/instagram")
async def instagram_callback(code: Optional[str] = None, state: Optional[str] = None,
                             error: Optional[str] = None, db: Session = Depends(get_db)):
    if error or not code or not state:
        return RedirectResponse(f"{FRONTEND_URL}?social_error=instagram_authorization_failed")
    user_id = _read_state(state, "instagram")
    token, expires_in = await _meta_exchange(code, "instagram")
    if not token:
        return RedirectResponse(f"{FRONTEND_URL}?social_error=instagram_token_exchange_failed")
    # Instagram Graph API access is commonly discovered through a connected Facebook Page.
    async with httpx.AsyncClient(timeout=25) as client:
        pages_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/me/accounts",
                                          params={"fields": "id,name,access_token,instagram_business_account",
                                                  "access_token": token})
        if pages_response.is_error:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=instagram_pages_lookup_failed")
        pages = pages_response.json().get("data", [])
        ig_account = None
        page_token = token
        for page in pages:
            candidate = page.get("instagram_business_account")
            if candidate and candidate.get("id"):
                ig_account = candidate
                page_token = page.get("access_token", token)
                break
        if not ig_account:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=no_linked_instagram_professional_account")
        profile_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/{ig_account['id']}",
                                            params={"fields": "id,username,name,followers_count,media_count",
                                                    "access_token": page_token})
        if profile_response.is_error:
            return RedirectResponse(f"{FRONTEND_URL}?social_error=instagram_profile_lookup_failed")
        profile = profile_response.json()
    _upsert_account(db, user_id, "instagram", profile["id"], page_token,
                    username=profile.get("username"), display_name=profile.get("name") or profile.get("username"),
                    expires_in=expires_in)
    return RedirectResponse(f"{FRONTEND_URL}?social_connected=instagram")


@router.get("/metrics/youtube")
async def youtube_metrics(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = _owned_account(db, user_id, "youtube")
    token = _decrypt(account.access_token_encrypted)
    async with httpx.AsyncClient(timeout=25) as client:
        channel_response = await client.get("https://www.googleapis.com/youtube/v3/channels", params={
            "part": "snippet,statistics", "id": account.platform_user_id
        }, headers={"Authorization": f"Bearer {token}"})
        if channel_response.is_error:
            raise HTTPException(channel_response.status_code, "YouTube channel metrics request failed; reconnect if authorization expired.")
        items = channel_response.json().get("items", [])
        if not items:
            raise HTTPException(404, "YouTube channel not found")
        channel = items[0]
        videos_response = await client.get("https://www.googleapis.com/youtube/v3/search", params={
            "part": "snippet", "channelId": account.platform_user_id,
            "type": "video", "order": "date", "maxResults": 10,
        }, headers={"Authorization": f"Bearer {token}"})
        videos = []
        if not videos_response.is_error:
            ids = [v.get("id", {}).get("videoId") for v in videos_response.json().get("items", [])]
            ids = [v for v in ids if v]
            if ids:
                details = await client.get("https://www.googleapis.com/youtube/v3/videos", params={
                    "part": "snippet,statistics", "id": ",".join(ids)
                }, headers={"Authorization": f"Bearer {token}"})
                if not details.is_error:
                    for video in details.json().get("items", []):
                        stats = video.get("statistics", {})
                        videos.append({
                            "id": video["id"], "title": video.get("snippet", {}).get("title"),
                            "published_at": video.get("snippet", {}).get("publishedAt"),
                            "views": int(stats.get("viewCount", 0)),
                            "likes": int(stats.get("likeCount", 0)),
                            "comments": int(stats.get("commentCount", 0)),
                        })
    stats = channel.get("statistics", {})
    return {
        "platform": "youtube", "account": account.display_name,
        "channel_id": account.platform_user_id,
        "subscribers": int(stats.get("subscriberCount", 0)),
        "total_views": int(stats.get("viewCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "hidden_subscriber_count": bool(stats.get("hiddenSubscriberCount", False)),
        "recent_videos": videos,
        "note": "Channel totals are lifetime totals. Use YouTube Analytics API for date-range views, watch time, and other analytics metrics.",
    }


@router.get("/metrics/instagram")
async def instagram_metrics(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = _owned_account(db, user_id, "instagram")
    token = _decrypt(account.access_token_encrypted)
    async with httpx.AsyncClient(timeout=25) as client:
        profile_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/{account.platform_user_id}",
                                            params={"fields": "id,username,name,followers_count,media_count",
                                                    "access_token": token})
        if profile_response.is_error:
            raise HTTPException(profile_response.status_code, "Instagram profile request failed. Check Meta permissions or reconnect.")
        profile = profile_response.json()
        media_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/{account.platform_user_id}/media",
                                          params={"fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
                                                  "limit": 10, "access_token": token})
        media = media_response.json().get("data", []) if not media_response.is_error else []
    return {
        "platform": "instagram", "username": profile.get("username"),
        "followers": profile.get("followers_count"), "media_count": profile.get("media_count"),
        "recent_media": [{
            "id": item.get("id"), "caption": item.get("caption", ""),
            "media_type": item.get("media_type"), "permalink": item.get("permalink"),
            "timestamp": item.get("timestamp"), "likes": item.get("like_count"),
            "comments": item.get("comments_count"),
        } for item in media],
        "note": "Reach and impressions require supported Instagram insights permissions and metrics; this response does not fabricate them.",
    }


@router.get("/metrics/facebook")
async def facebook_metrics(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = _owned_account(db, user_id, "facebook")
    token = _decrypt(account.access_token_encrypted)
    async with httpx.AsyncClient(timeout=25) as client:
        page_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/{account.platform_user_id}",
                                         params={"fields": "id,name,fan_count,followers_count", "access_token": token})
        if page_response.is_error:
            raise HTTPException(page_response.status_code, "Facebook Page request failed. Check Page permissions or reconnect.")
        page = page_response.json()
        posts_response = await client.get(f"https://graph.facebook.com/{META_VERSION}/{account.platform_user_id}/posts",
                                          params={"fields": "id,message,permalink_url,created_time", "limit": 10,
                                                  "access_token": token})
        posts = posts_response.json().get("data", []) if not posts_response.is_error else []
    return {
        "platform": "facebook", "page_id": page.get("id"), "page_name": page.get("name"),
        "followers": page.get("followers_count"), "fans": page.get("fan_count"),
        "recent_posts": [{
            "id": item.get("id"), "message": item.get("message", ""),
            "permalink": item.get("permalink_url"), "created_time": item.get("created_time"),
        } for item in posts],
        "note": "Page reach and engagement insights require appropriate Meta permissions and metric availability.",
    }


@router.delete("/accounts/{account_id}")
def disconnect_account(account_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    account = db.query(SocialAccount).filter(
        SocialAccount.id == account_id, SocialAccount.user_id == user_id
    ).first()
    if not account:
        raise HTTPException(404, "Connected account not found")
    account.is_active = False
    account.access_token_encrypted = ""
    account.refresh_token_encrypted = None
    db.commit()
    return {"message": "Social account disconnected"}
