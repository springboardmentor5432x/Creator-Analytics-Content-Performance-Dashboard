"""X (Twitter) OAuth 2.0 authorization-code login with PKCE.

``GET /api/v1/auth/twitter/login`` builds the X authorization URL with the
mandatory PKCE parameters (code_challenge / code_challenge_method=S256) and
redirects the end user to X. The one-time OAuth state and the PKCE
``code_verifier`` are persisted in the database so the callback can verify them
before exchanging the authorization code.

Twitter is configured in this codebase under the ``X_`` settings
(``X_CLIENT_ID``, ``X_REDIRECT_URI``, ``x_oauth_authorize_url``).
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import OAuthState, User

router = APIRouter(prefix="/v1/auth", tags=["X (Twitter) OAuth"])

X_PROVIDER = "x"
TWITTER_SCOPES = ("tweet.read", "users.read", "offline.access")

# RFC 7636: code_verifier must be 43-128 characters.
# secrets.token_urlsafe(32) produces exactly 43 URL-safe characters.
_CODE_VERIFIER_BYTES = 32


def generate_code_verifier() -> str:
    """Generate a secure random PKCE code_verifier (43-128 chars)."""
    return secrets.token_urlsafe(_CODE_VERIFIER_BYTES)


def generate_code_challenge(code_verifier: str) -> str:
    """SHA256(code_verifier) base64url-encoded without padding (RFC 7636)."""
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def generate_state() -> str:
    """Generate a non-guessable one-time OAuth state value."""
    return secrets.token_urlsafe(32)


def _state_hash(raw_state: str) -> str:
    return hashlib.sha256(raw_state.encode("utf-8")).hexdigest()


def build_twitter_authorize_url(state: str, code_challenge: str) -> str:
    """Build the X authorize URL with the exact mandatory PKCE parameters."""
    params = {
        "response_type": "code",
        "client_id": settings.x_client_id,
        "redirect_uri": settings.x_redirect_uri,
        "scope": " ".join(TWITTER_SCOPES),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{settings.x_oauth_authorize_url}?{urlencode(params)}"


def store_twitter_oauth_state(
    db: Session,
    *,
    user: User,
    state: str,
    code_verifier: str,
) -> None:
    """Persist the one-time state and PKCE verifier for callback verification."""
    now = datetime.now(timezone.utc)
    # Remove expired rows for this provider so the table stays small.
    db.query(OAuthState).filter(
        OAuthState.provider == X_PROVIDER,
        OAuthState.expires_at < now,
    ).delete(synchronize_session=False)
    db.add(
        OAuthState(
            state_hash=_state_hash(state),
            user_id=user.id,
            provider=X_PROVIDER,
            code_verifier=code_verifier,
            expires_at=now + timedelta(
                seconds=settings.oauth_state_ttl_seconds
            ),
        )
    )
    db.flush()


def consume_twitter_oauth_state(
    db: Session,
    *,
    state: str,
) -> tuple[int, str] | None:
    """Consume a one-time state and return ``(user_id, code_verifier)``.

    Returns ``None`` when the state is missing, invalid, or expired. The row is
    deleted so each state can only be used once.
    """
    now = datetime.now(timezone.utc)
    row = (
        db.query(OAuthState)
        .filter_by(state_hash=_state_hash(state), provider=X_PROVIDER)
        .one_or_none()
    )
    if row is None:
        return None

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        db.delete(row)
        db.flush()
        return None

    user_id = row.user_id
    code_verifier = row.code_verifier
    db.delete(row)
    db.flush()
    return user_id, code_verifier


@router.get("/twitter/login")
def twitter_login(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start the X OAuth 2.0 PKCE flow and redirect the user to X."""
    if not settings.x_client_id or not settings.x_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "X OAuth credentials are not configured. "
                "Set X_CLIENT_ID and X_CLIENT_SECRET in backend/.env."
            ),
        )

    state = generate_state()
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    store_twitter_oauth_state(
        db, user=user, state=state, code_verifier=code_verifier
    )
    db.commit()

    authorize_url = build_twitter_authorize_url(state, code_challenge)
    return RedirectResponse(url=authorize_url, status_code=status.HTTP_302_FOUND)
