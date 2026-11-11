
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.facebook_service import (
    FacebookProviderError,
    build_authorization_url as facebook_authorization_url,
    exchange_authorization_code as facebook_exchange_code,
    list_managed_pages as facebook_list_pages,
    sync_facebook_page,
)
from app.linkedin_service import (
    LinkedInProviderError,
    build_authorization_url as linkedin_authorization_url,
    exchange_authorization_code as linkedin_exchange_code,
    get_profile as linkedin_get_profile,
    refresh_access_token as linkedin_refresh_token,
    scopes as linkedin_scopes,
    sync_linkedin_account,
)
from app.instagram_service import (
    INSTAGRAM_SCOPES,
    InstagramProviderError,
    build_authorization_url as instagram_authorization_url,
    exchange_authorization_code as instagram_exchange_code,
    get_client_business_id as instagram_get_client_business_id,
    get_profile as instagram_get_profile,
    list_assigned_instagram_accounts as instagram_list_assigned_accounts,
    sync_instagram_account,
)
from app.models import (
    ContentPost,
    CreatorProfile,
    OAuthCredential,
    OAuthState,
    SocialAccount,
    User,
)
from app.oauth_storage import load_oauth_credential, save_oauth_credential
from app.token_security import (
    TokenEncryptionConfigurationError,
    validate_encryption_key,
)
from app.x_service import (
    XProviderError,
    derive_code_verifier as x_derive_code_verifier,
    build_authorization_url as x_authorization_url,
    exchange_authorization_code as x_exchange_code,
    get_profile as x_get_profile,
    refresh_access_token as x_refresh_token,
    sync_x_account,
)
from app.youtube_service import (
    YouTubeProviderError,
    build_authorization_url as youtube_authorization_url,
    exchange_authorization_code as youtube_exchange_code,
    get_my_channel,
    get_public_channel as youtube_get_public_channel,
    get_public_video as youtube_get_public_video,
    search_public_videos as youtube_search_public_videos,
    refresh_access_token as youtube_refresh_token,
    sync_youtube_account,
)

router = APIRouter(prefix="/integrations", tags=["Social integrations"])


def _creator_profile(db: Session, user: User) -> CreatorProfile:
    if user.role != "creator":
        raise HTTPException(
            status_code=403,
            detail="Social account connection is currently available to Creator accounts.",
        )

    profile = (
        db.query(CreatorProfile)
        .filter_by(user_id=user.id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found.",
        )

    return profile


def _encryption_is_configured() -> bool:
    try:
        validate_encryption_key()
        return True
    except TokenEncryptionConfigurationError:
        return False


def _provider_configuration_status() -> dict:
    encryption_ready = _encryption_is_configured()

    youtube_configured = bool(
        settings.google_oauth_client_id
        and settings.google_oauth_client_secret
        and encryption_ready
    )
    instagram_configured = bool(
        settings.instagram_client_id
        and settings.instagram_client_secret
        and settings.instagram_config_id
        and encryption_ready
    )
    facebook_configured = bool(
        settings.meta_oauth_client_id
        and settings.meta_oauth_client_secret
        and encryption_ready
    )
    x_configured = bool(
        settings.x_client_id
        and settings.x_client_secret
        and encryption_ready
    )
    linkedin_configured = bool(
        settings.linkedin_client_id
        and settings.linkedin_client_secret
        and encryption_ready
    )

    return {
        "youtube_public_data_api_configured": bool(
            settings.youtube_api_key
        ),
        "providers": [
            {
                "id": "youtube",
                "name": "YouTube",
                "configured": youtube_configured,
                "implementation": "available",
                "message": (
                    "Ready to connect."
                    if youtube_configured
                    else "Configure Google OAuth client ID, client secret, and a Fernet token encryption key in backend/.env."
                ),
                "scopes": [
                    "youtube.readonly",
                    "yt-analytics.readonly",
                ],
            },
            {
                "id": "instagram",
                "name": "Instagram",
                "configured": instagram_configured,
                "implementation": "available",
                "message": (
                    "Ready to connect."
                    if instagram_configured
                    else "Configure INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, INSTAGRAM_CONFIG_ID, and a Fernet encryption key. Use an Instagram professional account that belongs to the app's business portfolio."
                ),
                "scopes": list(INSTAGRAM_SCOPES),
            },
            {
                "id": "facebook",
                "name": "Facebook",
                "configured": facebook_configured,
                "implementation": "available",
                "message": (
                    "Ready to connect."
                    if facebook_configured
                    else "Configure the Meta App ID/Secret and a Fernet key. Facebook Login for Business configuration is optional; when omitted, Facebook requests pages_show_list and pages_read_engagement."
                ),
                "scopes": [
                    "pages_show_list",
                    "pages_read_engagement",
                ],
            },
            {
                "id": "x",
                "name": "X",
                "configured": x_configured,
                "implementation": "available",
                "message": (
                    "Ready to connect."
                    if x_configured
                    else "Configure X client ID/secret and a Fernet key. X API endpoint access and usage limits depend on the developer plan."
                ),
                "scopes": [
                    "users.read",
                    "tweet.read",
                    "offline.access",
                ],
            },
            {
                "id": "linkedin",
                "name": "LinkedIn",
                "configured": linkedin_configured,
                "implementation": "available",
                "message": (
                    "Ready to connect."
                    if linkedin_configured
                    else "Configure LinkedIn client ID/secret and a Fernet key. Member post/follower analytics require the matching approved LinkedIn API products and scopes."
                ),
                "scopes": linkedin_scopes(),
            },
        ],
    }


def _is_aware(value: datetime) -> datetime:
    return (
        value
        if value.tzinfo
        else value.replace(tzinfo=timezone.utc)
    )


def _new_state(
    db: Session,
    user_id: int,
    provider: str = "youtube",
) -> str:
    now = datetime.now(timezone.utc)

    expired_rows = (
        db.query(OAuthState)
        .filter(OAuthState.expires_at < now)
        .all()
    )

    for row in expired_rows:
        db.delete(row)

    raw = secrets.token_urlsafe(32)
    state_hash = hashlib.sha256(
        raw.encode("utf-8")
    ).hexdigest()

    db.add(
        OAuthState(
            state_hash=state_hash,
            user_id=user_id,
            provider=provider,
            expires_at=now + timedelta(
                seconds=settings.oauth_state_ttl_seconds
            ),
        )
    )
    db.commit()

    return raw


def _consume_state(
    db: Session,
    raw_state: str,
    provider: str = "youtube",
) -> int:
    if not raw_state or len(raw_state) > 512:
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state. Start account connection again.",
        )

    state_hash = hashlib.sha256(
        raw_state.encode("utf-8")
    ).hexdigest()

    row = (
        db.query(OAuthState)
        .filter_by(
            state_hash=state_hash,
            provider=provider,
        )
        .one_or_none()
    )

    if row is None:
        raise HTTPException(
            status_code=400,
            detail="OAuth state is invalid or already used. Start account connection again.",
        )

    user_id = row.user_id
    expires_at = _is_aware(row.expires_at)

    db.delete(row)
    db.commit()

    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="OAuth state expired. Start account connection again.",
        )

    return user_id


def _frontend_redirect(
    integration: str,
    reason: str | None = None,
) -> RedirectResponse:
    params = {"integration": integration}

    if reason:
        params["reason"] = reason

    return RedirectResponse(
        f"{settings.frontend_base_url.rstrip('/')}/?{urlencode(params)}",
        status_code=303,
    )


def _require_provider_setup(
    provider: str,
    client_id: str,
    client_secret: str,
) -> None:
    if not client_id or not client_secret:
        required_env = {
            "YouTube": (
                "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET"
            ),
            "Instagram": (
                "META_OAUTH_CLIENT_ID, META_OAUTH_CLIENT_SECRET, and META_OAUTH_CONFIG_ID"
            ),
            "Facebook": (
                    "META_OAUTH_CLIENT_ID (or FB_APP_ID) and META_OAUTH_CLIENT_SECRET (or FB_APP_SECRET)"
            ),
            "X": "X_CLIENT_ID and X_CLIENT_SECRET",
            "LinkedIn": (
                "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET"
            ),
        }.get(
            provider,
            "the provider client ID/key and secret",
        )

        raise HTTPException(
            status_code=503,
            detail=(
                f"{provider} OAuth credentials are not configured. "
                f"Set {required_env} in backend/.env."
            ),
        )

    try:
        validate_encryption_key()
    except TokenEncryptionConfigurationError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc


def _provider_scopes(value) -> list[str]:
    if isinstance(value, list):
        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    return [
        item
        for item in str(value or "").replace(",", " ").split()
        if item
    ]


def _upsert_connected_account(
    db: Session,
    profile: CreatorProfile,
    *,
    platform: str,
    provider_account_id: str,
    handle: str,
    followers: int | None,
    profile_url: str | None,
) -> SocialAccount:
    """Upsert only within the current creator; never reassign another creator's account."""

    existing = (
        db.query(SocialAccount)
        .join(
            OAuthCredential,
            OAuthCredential.social_account_id == SocialAccount.id,
        )
        .filter(
            SocialAccount.creator_profile_id == profile.id,
            SocialAccount.platform == platform,
            OAuthCredential.provider_account_id == provider_account_id,
        )
        .one_or_none()
    )

    if existing is None:
        existing = (
            db.query(SocialAccount)
            .filter_by(
                creator_profile_id=profile.id,
                platform=platform,
                handle=handle,
            )
            .one_or_none()
        )

    conflict = (
        db.query(SocialAccount)
        .filter_by(
            platform=platform,
            handle=handle,
        )
        .one_or_none()
    )

    final_handle = handle

    if (
        existing is None
        and conflict is not None
        and conflict.creator_profile_id != profile.id
    ):
        final_handle = provider_account_id

        conflict = (
            db.query(SocialAccount)
            .filter_by(
                platform=platform,
                handle=final_handle,
            )
            .one_or_none()
        )

        if (
            conflict is not None
            and conflict.creator_profile_id != profile.id
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"This {platform} account is already connected "
                    "to another CreatorIQ profile."
                ),
            )

    now = datetime.now(timezone.utc)

    if existing is None:
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform=platform,
            handle=final_handle,
            followers_count=max(0, int(followers or 0)),
            profile_url=profile_url,
            is_connected=True,
            last_synced_at=now,
        )
        db.add(account)
        db.flush()
        return account

    existing.handle = final_handle

    if followers is not None:
        existing.followers_count = max(
            0,
            int(followers),
        )

    existing.profile_url = profile_url or existing.profile_url
    existing.is_connected = True
    existing.last_synced_at = now

    db.flush()

    return existing


@router.get("/providers")
def providers(
    _user: User = Depends(get_current_user),
):
    """Show connector setup state without exposing any secret or token."""
    return _provider_configuration_status()


@router.get("/accounts")
def list_accounts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    profile = _creator_profile(db, user)

    accounts = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.creator_profile_id == profile.id,
            ~SocialAccount.platform.ilike("tiktok"),
        )
        .order_by(
            SocialAccount.platform,
            SocialAccount.handle,
        )
        .all()
    )

    result = []

    for account in accounts:
        post_count = (
            db.query(ContentPost)
            .filter_by(social_account_id=account.id)
            .count()
        )

        result.append(
            {
                "id": account.id,
                "platform": account.platform,
                "handle": account.handle,
                "followers_count": account.followers_count,
                "profile_url": account.profile_url,
                "is_connected": bool(account.is_connected),
                "source": (
                    "live"
                    if account.is_connected
                    else "demo_or_unconnected"
                ),
                "last_synced_at": (
                    account.last_synced_at.isoformat()
                    if account.last_synced_at
                    else None
                ),
                "post_count": post_count,
            }
        )

    return {
        "accounts": result,
        **_provider_configuration_status(),
    }


@router.get("/youtube/public/search")
def search_public_youtube_videos(
    query: str = Query(min_length=2, max_length=100),
    max_results: int = Query(default=10, ge=1, le=25),
    channel_id: str | None = Query(
        default=None,
        min_length=10,
        max_length=80,
    ),
    _user: User = Depends(get_current_user),
):
    """Search public YouTube videos using the backend API key."""
    try:
        videos = youtube_search_public_videos(
            query.strip(),
            max_results,
            channel_id,
        )

        return {
            "videos": videos,
            "count": len(videos),
            "source": "youtube_data_api_public",
        }
    except YouTubeProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc


@router.get("/youtube/public/channels/{channel_id}")
def get_public_youtube_channel(
    channel_id: str,
    _user: User = Depends(get_current_user),
):
    """Look up public channel metadata and statistics by channel ID."""
    try:
        return youtube_get_public_channel(channel_id)
    except YouTubeProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc


@router.get("/youtube/public/videos/{video_id}")
def get_public_youtube_video(
    video_id: str,
    _user: User = Depends(get_current_user),
):
    """Look up public video metadata and statistics by video ID."""
    try:
        return youtube_get_public_video(video_id)
    except YouTubeProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc


@router.get("/youtube/connect")
def connect_youtube(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    _creator_profile(db, user)

    _require_provider_setup(
        "YouTube",
        settings.google_oauth_client_id,
        settings.google_oauth_client_secret,
    )

    state = _new_state(db, user.id, "youtube")

    return {
        "authorization_url": youtube_authorization_url(state),
        "expires_in_seconds": settings.oauth_state_ttl_seconds,
    }


@router.get("/youtube/callback")
def youtube_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return _finish_youtube_callback(
        db,
        code,
        state,
        error,
    )


def _finish_youtube_callback(
    db: Session,
    code: str | None,
    state: str | None,
    error: str | None,
):
    if not state:
        return _frontend_redirect(
            "youtube_error",
            "missing_state",
        )

    try:
        user_id = _consume_state(
            db,
            state,
            "youtube",
        )
    except HTTPException:
        return _frontend_redirect(
            "youtube_error",
            "invalid_state",
        )

    if error:
        return _frontend_redirect(
            "youtube_error",
            "authorization_denied",
        )

    if not code:
        return _frontend_redirect(
            "youtube_error",
            "missing_code",
        )

    user = (
        db.query(User)
        .filter_by(id=user_id, is_active=True)
        .first()
    )

    if user is None:
        return _frontend_redirect(
            "youtube_error",
            "user_unavailable",
        )

    try:
        profile = _creator_profile(db, user)
        token_data = youtube_exchange_code(code)
        access_token = token_data["access_token"]
        channel = get_my_channel(access_token)

    except HTTPException:
        db.rollback()
        return _frontend_redirect(
            "youtube_error",
            "connection_failed",
        )

    except YouTubeProviderError:
        db.rollback()
        return _frontend_redirect(
            "youtube_error",
            "provider_error",
        )

    except Exception:
        db.rollback()
        return _frontend_redirect(
            "youtube_error",
            "connection_failed",
        )

    channel_id = str(channel.get("id") or "")
    snippet = channel.get("snippet") or {}
    stats = channel.get("statistics") or {}

    custom_url = snippet.get("customUrl")

    if custom_url:
        handle = (
            custom_url
            if str(custom_url).startswith("@")
            else f"@{custom_url}"
        )
    else:
        handle = channel_id

    if not channel_id or not handle:
        return _frontend_redirect(
            "youtube_error",
            "channel_not_found",
        )

    try:
        account = _upsert_connected_account(
            db,
            profile,
            platform="YouTube",
            provider_account_id=channel_id,
            handle=handle,
            followers=max(
                0,
                int(stats.get("subscriberCount", 0) or 0),
            ),
            profile_url=(
                f"https://www.youtube.com/channel/{channel_id}"
            ),
        )

        now = datetime.now(timezone.utc)

        scopes = _provider_scopes(
            token_data.get("scope")
        ) or [
            "youtube.readonly",
            "yt-analytics.readonly",
        ]

        save_oauth_credential(
            db,
            social_account_id=account.id,
            access_token=access_token,
            refresh_token=token_data.get("refresh_token"),
            provider_account_id=channel_id,
            token_type=token_data.get("token_type", "Bearer"),
            scopes=scopes,
            expires_at=now + timedelta(
                seconds=max(
                    60,
                    int(token_data.get("expires_in", 3600) or 3600),
                )
            ),
        )

        db.commit()

    except HTTPException:
        db.rollback()
        return _frontend_redirect(
            "youtube_error",
            "channel_already_connected",
        )

    except Exception:
        db.rollback()
        return _frontend_redirect(
            "youtube_error",
            "secure_storage_failed",
        )

    return _frontend_redirect("youtube_connected")


@router.post("/youtube/sync/{social_account_id}")
def sync_youtube(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
            platform="YouTube",
            is_connected=True,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Connected YouTube account not found for this creator.",
        )

    try:
        credential = load_oauth_credential(
            db,
            social_account_id=account.id,
        )

        if credential is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "OAuth credentials are missing. "
                    "Reconnect the YouTube account."
                ),
            )

        access_token = credential.access_token

        expires_at = (
            _is_aware(credential.expires_at)
            if credential.expires_at
            else None
        )

        if (
            expires_at
            and expires_at <= datetime.now(timezone.utc) + timedelta(seconds=90)
        ):
            if not credential.refresh_token:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "The YouTube access token expired. "
                        "Reconnect the account to grant offline access."
                    ),
                )

            refreshed = youtube_refresh_token(
                credential.refresh_token
            )

            now = datetime.now(timezone.utc)

            save_oauth_credential(
                db,
                social_account_id=account.id,
                access_token=refreshed["access_token"],
                refresh_token=refreshed.get("refresh_token"),
                provider_account_id=credential.provider_account_id,
                token_type=refreshed.get(
                    "token_type",
                    credential.token_type,
                ),
                scopes=(
                    _provider_scopes(refreshed.get("scope"))
                    or list(credential.scopes)
                ),
                expires_at=now + timedelta(
                    seconds=max(
                        60,
                        int(refreshed.get("expires_in", 3600) or 3600),
                    )
                ),
            )

            access_token = refreshed["access_token"]

        account._provider_account_id = credential.provider_account_id

        result = sync_youtube_account(
            db,
            account,
            access_token,
        )

        db.commit()
        return result

    except HTTPException:
        db.rollback()
        raise

    except YouTubeProviderError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="YouTube sync failed. Check server logs and try again.",
        ) from exc


@router.get("/instagram/connect")
def connect_instagram(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    _creator_profile(db, user)

    _require_provider_setup(
        "Instagram",
        settings.instagram_client_id,
        settings.instagram_client_secret,
    )
    if not settings.instagram_config_id:
        raise HTTPException(
            status_code=503,
            detail="Set INSTAGRAM_CONFIG_ID in backend/.env to enable Instagram Unified Login.",
        )

    state = _new_state(db, user.id, "instagram")

    return {
        "authorization_url": instagram_authorization_url(state),
        "expires_in_seconds": settings.oauth_state_ttl_seconds,
    }


@router.get("/instagram/callback")
def instagram_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not state:
        return _frontend_redirect(
            "instagram_error",
            "missing_state",
        )

    try:
        user_id = _consume_state(
            db,
            state,
            "instagram",
        )
    except HTTPException:
        return _frontend_redirect(
            "instagram_error",
            "invalid_state",
        )

    if error:
        return _frontend_redirect(
            "instagram_error",
            "authorization_denied",
        )

    if not code:
        return _frontend_redirect(
            "instagram_error",
            "missing_code",
        )

    user = (
        db.query(User)
        .filter_by(id=user_id, is_active=True)
        .first()
    )

    if user is None:
        return _frontend_redirect(
            "instagram_error",
            "user_unavailable",
        )

    try:
        profile = _creator_profile(db, user)

        token_data = instagram_exchange_code(code)
        access_token = token_data["access_token"]

        # Unified Login returns a Business Integration SUAT, not an Instagram
        # user token. Resolve the Instagram asset shared with the app.
        business_id = instagram_get_client_business_id(access_token)
        logger.info(
            "Instagram callback: business_id=%s for user %s",
            business_id,
            user_id,
        )

        assigned_accounts = instagram_list_assigned_accounts(access_token)
        logger.info(
            "Instagram callback: assigned_instagram_accounts=%s for user %s",
            assigned_accounts,
            user_id,
        )

        if not assigned_accounts:
            db.rollback()
            return _frontend_redirect(
                "instagram_error",
                "no_assigned_instagram_account",
            )

        if len(assigned_accounts) > 1:
            db.rollback()
            return _frontend_redirect(
                "instagram_error",
                "multiple_instagram_accounts",
            )

        selected_instagram = assigned_accounts[0]
        user_id_value = str(selected_instagram["id"])
        identity = instagram_get_profile(access_token, user_id_value)
        username = str(
            identity.get("username")
            or selected_instagram.get("username")
            or user_id_value
        )

        account = _upsert_connected_account(
            db,
            profile,
            platform="Instagram",
            provider_account_id=user_id_value,
            handle=f"@{username.lstrip('@')}",
            followers=identity.get("followers_count"),
            profile_url=(
                f"https://www.instagram.com/{username.lstrip('@')}/"
            ),
        )

        save_oauth_credential(
            db,
            social_account_id=account.id,
            access_token=access_token,
            refresh_token=None,
            provider_account_id=user_id_value,
            token_type="Bearer",
            scopes=list(INSTAGRAM_SCOPES),
            expires_at=None,
        )

        db.commit()

    except HTTPException:
        db.rollback()
        return _frontend_redirect(
            "instagram_error",
            "account_already_connected",
        )

    except InstagramProviderError:
        db.rollback()
        return _frontend_redirect(
            "instagram_error",
            "provider_error",
        )

    except Exception:
        db.rollback()
        return _frontend_redirect(
            "instagram_error",
            "connection_failed",
        )

    return _frontend_redirect("instagram_connected")


@router.post("/instagram/sync/{social_account_id}")
def sync_instagram(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
            platform="Instagram",
            is_connected=True,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Connected Instagram account not found for this creator.",
        )

    try:
        credential = load_oauth_credential(
            db,
            social_account_id=account.id,
        )

        if credential is None:
            raise HTTPException(
                status_code=409,
                detail="OAuth credentials are missing. Reconnect Instagram.",
            )

        access_token = credential.access_token
        instagram_user_id = credential.provider_account_id
        if not instagram_user_id:
            raise HTTPException(
                status_code=409,
                detail="Instagram account ID is missing. Reconnect Instagram using Unified Login.",
            )

        result = sync_instagram_account(
            db,
            account,
            access_token,
            instagram_user_id,
        )

        db.commit()
        return result

    except HTTPException:
        db.rollback()
        raise

    except InstagramProviderError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Instagram sync failed. Check server logs and try again.",
        ) from exc


@router.get("/facebook/connect")
def connect_facebook(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    _creator_profile(db, user)

    _require_provider_setup(
        "Facebook",
        settings.meta_oauth_client_id,
        settings.meta_oauth_client_secret,
    )

    state = _new_state(db, user.id, "facebook")

    return {
        "authorization_url": facebook_authorization_url(state),
        "expires_in_seconds": settings.oauth_state_ttl_seconds,
    }


@router.get("/facebook/callback")
def facebook_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not state:
        return _frontend_redirect(
            "facebook_error",
            "missing_state",
        )

    try:
        user_id = _consume_state(
            db,
            state,
            "facebook",
        )
    except HTTPException:
        return _frontend_redirect(
            "facebook_error",
            "invalid_state",
        )

    if error:
        return _frontend_redirect(
            "facebook_error",
            "authorization_denied",
        )

    if not code:
        return _frontend_redirect(
            "facebook_error",
            "missing_code",
        )

    user = (
        db.query(User)
        .filter_by(id=user_id, is_active=True)
        .first()
    )

    if user is None:
        return _frontend_redirect(
            "facebook_error",
            "user_unavailable",
        )

    try:
        profile = _creator_profile(db, user)

        user_token = facebook_exchange_code(code)
        pages = facebook_list_pages(
            user_token["access_token"]
        )

        if not pages:
            return _frontend_redirect(
                "facebook_error",
                "no_managed_pages",
            )

        for page in pages:
            page_id = str(page.get("id") or "")
            page_token = str(page.get("access_token") or "")

            if not page_id or not page_token:
                continue

            account = _upsert_connected_account(
                db,
                profile,
                platform="Facebook",
                provider_account_id=page_id,
                handle=str(page.get("name") or page_id),
                followers=page.get("fan_count"),
                profile_url=page.get("link"),
            )

            save_oauth_credential(
                db,
                social_account_id=account.id,
                access_token=page_token,
                refresh_token=None,
                provider_account_id=page_id,
                token_type="Bearer",
                scopes=[
                    "pages_show_list",
                    "pages_read_engagement",
                ],
                expires_at=None,
            )

        db.commit()

    except HTTPException:
        db.rollback()
        return _frontend_redirect(
            "facebook_error",
            "page_already_connected",
        )

    except FacebookProviderError:
        db.rollback()
        return _frontend_redirect(
            "facebook_error",
            "provider_error",
        )

    except Exception:
        db.rollback()
        return _frontend_redirect(
            "facebook_error",
            "connection_failed",
        )

    return _frontend_redirect("facebook_connected")


@router.post("/facebook/sync/{social_account_id}")
def sync_facebook(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
            platform="Facebook",
            is_connected=True,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Connected Facebook Page not found for this Creator.",
        )

    try:
        credential = load_oauth_credential(
            db,
            social_account_id=account.id,
        )

        if credential is None:
            raise HTTPException(
                status_code=409,
                detail="Facebook Page credentials are missing. Reconnect the Page.",
            )

        account._provider_account_id = credential.provider_account_id

        result = sync_facebook_page(
            db,
            account,
            credential.access_token,
        )

        db.commit()
        return result

    except HTTPException:
        db.rollback()
        raise

    except FacebookProviderError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Facebook sync failed. Check server logs and try again.",
        ) from exc


@router.get("/x/connect")
def connect_x(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    _creator_profile(db, user)

    _require_provider_setup(
        "X",
        settings.x_client_id,
        settings.x_client_secret,
    )

    logger.info("X OAuth connect: starting authorization flow for user %s", user.id)

    state = _new_state(db, user.id, "x")
    verifier = x_derive_code_verifier(state)

    return {
        "authorization_url": x_authorization_url(
            state,
            verifier,
        ),
        "expires_in_seconds": settings.oauth_state_ttl_seconds,
    }


@router.get("/x/callback")
def x_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not state:
        return _frontend_redirect("x_error", "missing_state")

    # Prefer the PKCE verifier stored by the Twitter login route. Fall back to
    # deriving it from the state for flows (e.g. /integrations/x/connect) that
    # do not store a verifier.
    stored_row = (
        db.query(OAuthState)
        .filter_by(
            state_hash=hashlib.sha256(state.encode("utf-8")).hexdigest(),
            provider="x",
        )
        .one_or_none()
    )
    stored_verifier = stored_row.code_verifier if stored_row is not None else None

    try:
        user_id = _consume_state(db, state, "x")
    except HTTPException:
        return _frontend_redirect("x_error", "invalid_state")

    if error:
        return _frontend_redirect("x_error", "authorization_denied")

    if not code:
        return _frontend_redirect("x_error", "missing_code")

    user = (
        db.query(User)
        .filter_by(id=user_id, is_active=True)
        .first()
    )

    if user is None:
        return _frontend_redirect("x_error", "user_unavailable")

    try:
        logger.info("X OAuth callback: exchanging code for user %s", user_id)

        profile = _creator_profile(db, user)

        token_data = x_exchange_code(
            code,
            stored_verifier or x_derive_code_verifier(state),
        )

        access_token = token_data["access_token"]
        logger.info("X OAuth callback: token exchanged successfully")

        identity = x_get_profile(access_token)

        x_id = str(identity.get("id") or "")
        username = str(identity.get("username") or x_id)

        public_metrics = identity.get("public_metrics") or {}

        if not x_id:
            return _frontend_redirect("x_error", "account_id_missing")

        account = _upsert_connected_account(
            db,
            profile,
            platform="X",
            provider_account_id=x_id,
            handle=f"@{username.lstrip('@')}",
            followers=public_metrics.get("followers_count"),
            profile_url=(
                identity.get("url")
                or f"https://x.com/{username.lstrip('@')}"
            ),
        )

        now = datetime.now(timezone.utc)

        save_oauth_credential(
            db,
            social_account_id=account.id,
            access_token=access_token,
            refresh_token=token_data.get("refresh_token"),
            provider_account_id=x_id,
            token_type=token_data.get("token_type", "Bearer"),
            scopes=(
                _provider_scopes(token_data.get("scope"))
                or ["users.read", "tweet.read", "offline.access"]
            ),
            expires_at=now + timedelta(
                seconds=max(
                    60,
                    int(token_data.get("expires_in", 7200) or 7200),
                )
            ),
        )

        db.commit()

        logger.info(
            "X OAuth callback: account connected for user %s (X ID: %s)",
            user_id,
            x_id,
        )

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        logger.error("X OAuth token encryption failed: %s", exc)
        return _frontend_redirect("x_error", "secure_storage_failed")

    except HTTPException:
        db.rollback()
        return _frontend_redirect("x_error", "account_already_connected")

    except XProviderError:
        db.rollback()
        return _frontend_redirect("x_error", "provider_error")

    except Exception as exc:
        db.rollback()
        logger.error("X OAuth callback failed: %s", exc, exc_info=True)
        return _frontend_redirect("x_error", "connection_failed")

    return _frontend_redirect("x_connected")


@router.post("/x/sync/{social_account_id}")
def sync_x(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
            platform="X",
            is_connected=True,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Connected X account not found for this creator.",
        )

    try:
        credential = load_oauth_credential(
            db,
            social_account_id=account.id,
        )

        if credential is None:
            raise HTTPException(
                status_code=409,
                detail="X OAuth credentials are missing. Reconnect the account.",
            )

        access_token = credential.access_token

        expires_at = (
            _is_aware(credential.expires_at)
            if credential.expires_at
            else None
        )

        if (
            expires_at
            and expires_at <= datetime.now(timezone.utc) + timedelta(seconds=90)
        ):
            if not credential.refresh_token:
                raise HTTPException(
                    status_code=409,
                    detail="X refresh token is unavailable. Reconnect with offline.access scope.",
                )

            refreshed = x_refresh_token(
                credential.refresh_token
            )

            now = datetime.now(timezone.utc)

            save_oauth_credential(
                db,
                social_account_id=account.id,
                access_token=refreshed["access_token"],
                refresh_token=refreshed.get(
                    "refresh_token",
                    credential.refresh_token,
                ),
                provider_account_id=credential.provider_account_id,
                token_type=refreshed.get(
                    "token_type",
                    credential.token_type,
                ),
                scopes=(
                    _provider_scopes(refreshed.get("scope"))
                    or list(credential.scopes)
                ),
                expires_at=now + timedelta(
                    seconds=max(
                        60,
                        int(refreshed.get("expires_in", 7200) or 7200),
                    )
                ),
            )

            access_token = refreshed["access_token"]

        result = sync_x_account(
            db,
            account,
            access_token,
            credential.provider_account_id,
        )

        db.commit()
        return result

    except HTTPException:
        db.rollback()
        raise

    except XProviderError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="X sync failed. Check server logs and try again.",
        ) from exc


@router.get("/linkedin/connect")
def connect_linkedin(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    _creator_profile(db, user)

    _require_provider_setup(
        "LinkedIn",
        settings.linkedin_client_id,
        settings.linkedin_client_secret,
    )

    state = _new_state(db, user.id, "linkedin")

    return {
        "authorization_url": linkedin_authorization_url(state),
        "expires_in_seconds": settings.oauth_state_ttl_seconds,
        "requested_scopes": linkedin_scopes(),
    }


@router.get("/linkedin/callback")
def linkedin_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not state:
        return _frontend_redirect(
            "linkedin_error",
            "missing_state",
        )

    try:
        user_id = _consume_state(
            db,
            state,
            "linkedin",
        )
    except HTTPException:
        return _frontend_redirect(
            "linkedin_error",
            "invalid_state",
        )

    if error:
        return _frontend_redirect(
            "linkedin_error",
            "authorization_denied",
        )

    if not code:
        return _frontend_redirect(
            "linkedin_error",
            "missing_code",
        )

    user = (
        db.query(User)
        .filter_by(id=user_id, is_active=True)
        .first()
    )

    if user is None:
        return _frontend_redirect(
            "linkedin_error",
            "user_unavailable",
        )

    try:
        profile = _creator_profile(db, user)

        token_data = linkedin_exchange_code(code)
        access_token = token_data["access_token"]

        identity = linkedin_get_profile(access_token)

        member_id = str(identity.get("sub") or "")

        full_name = str(
            identity.get("name")
            or identity.get("given_name")
            or member_id
        )

        if not member_id:
            return _frontend_redirect(
                "linkedin_error",
                "member_id_missing",
            )

        account = _upsert_connected_account(
            db,
            profile,
            platform="LinkedIn",
            provider_account_id=member_id,
            handle=full_name[:120],
            followers=None,
            profile_url="https://www.linkedin.com/",
        )

        now = datetime.now(timezone.utc)

        save_oauth_credential(
            db,
            social_account_id=account.id,
            access_token=access_token,
            refresh_token=token_data.get("refresh_token"),
            provider_account_id=member_id,
            token_type=token_data.get("token_type", "Bearer"),
            scopes=(
                _provider_scopes(token_data.get("scope"))
                or linkedin_scopes()
            ),
            expires_at=now + timedelta(
                seconds=max(
                    60,
                    int(token_data.get("expires_in", 3600) or 3600),
                )
            ),
        )

        db.commit()

    except HTTPException:
        db.rollback()
        return _frontend_redirect(
            "linkedin_error",
            "account_already_connected",
        )

    except LinkedInProviderError:
        db.rollback()
        return _frontend_redirect(
            "linkedin_error",
            "provider_error",
        )

    except Exception:
        db.rollback()
        return _frontend_redirect(
            "linkedin_error",
            "connection_failed",
        )

    return _frontend_redirect("linkedin_connected")


@router.post("/linkedin/sync/{social_account_id}")
def sync_linkedin(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
            platform="LinkedIn",
            is_connected=True,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Connected LinkedIn account not found for this creator.",
        )

    try:
        credential = load_oauth_credential(
            db,
            social_account_id=account.id,
        )

        if credential is None:
            raise HTTPException(
                status_code=409,
                detail="LinkedIn OAuth credentials are missing. Reconnect the account.",
            )

        access_token = credential.access_token

        expires_at = (
            _is_aware(credential.expires_at)
            if credential.expires_at
            else None
        )

        if (
            expires_at
            and expires_at <= datetime.now(timezone.utc) + timedelta(seconds=90)
        ):
            if not credential.refresh_token:
                raise HTTPException(
                    status_code=409,
                    detail="LinkedIn refresh token is unavailable for this app. Reconnect the account.",
                )

            refreshed = linkedin_refresh_token(
                credential.refresh_token
            )

            now = datetime.now(timezone.utc)

            save_oauth_credential(
                db,
                social_account_id=account.id,
                access_token=refreshed["access_token"],
                refresh_token=refreshed.get(
                    "refresh_token",
                    credential.refresh_token,
                ),
                provider_account_id=credential.provider_account_id,
                token_type=refreshed.get(
                    "token_type",
                    credential.token_type,
                ),
                scopes=(
                    _provider_scopes(refreshed.get("scope"))
                    or list(credential.scopes)
                ),
                expires_at=now + timedelta(
                    seconds=max(
                        60,
                        int(refreshed.get("expires_in", 3600) or 3600),
                    )
                ),
            )

            access_token = refreshed["access_token"]

        result = sync_linkedin_account(
            db,
            account,
            access_token,
            credential.provider_account_id,
        )

        db.commit()
        return result

    except HTTPException:
        db.rollback()
        raise

    except LinkedInProviderError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    except TokenEncryptionConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="LinkedIn sync failed. Check server logs and try again.",
        ) from exc


@router.delete("/accounts/{social_account_id}")
def disconnect_account(
    social_account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _creator_profile(db, user)

    account = (
        db.query(SocialAccount)
        .filter_by(
            id=social_account_id,
            creator_profile_id=profile.id,
        )
        .one_or_none()
    )

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Social account not found.",
        )

    credential = (
        db.query(OAuthCredential)
        .filter_by(social_account_id=account.id)
        .one_or_none()
    )

    if credential is not None:
        db.delete(credential)

    account.is_connected = False

    db.commit()

    return {
        "ok": True,
        "message": (
            "Account disconnected. Stored analytics history has been retained."
        ),
    }
