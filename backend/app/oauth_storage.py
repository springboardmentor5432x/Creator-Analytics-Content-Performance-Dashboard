"""Database access layer for encrypted provider credentials."""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import OAuthCredential, SocialAccount
from app.token_security import decrypt_token, encrypt_token


@dataclass(frozen=True)
class DecryptedOAuthCredential:
    social_account_id: int
    provider_account_id: str | None
    access_token: str
    refresh_token: str | None
    token_type: str
    scopes: tuple[str, ...]
    expires_at: datetime | None


def save_oauth_credential(
    db: Session,
    *,
    social_account_id: int,
    access_token: str,
    refresh_token: str | None = None,
    provider_account_id: str | None = None,
    token_type: str = "Bearer",
    scopes: list[str] | None = None,
    expires_at: datetime | None = None,
    encryption_key: str | None = None,
) -> OAuthCredential:
    """Create or update one encrypted token record; caller owns commit/rollback."""
    if not access_token or not access_token.strip():
        raise ValueError("Access token cannot be empty.")
    account = db.get(SocialAccount, social_account_id)
    if account is None:
        raise LookupError("Social account not found.")

    credential = (
        db.query(OAuthCredential)
        .filter_by(social_account_id=social_account_id)
        .one_or_none()
    )
    encrypted_access = encrypt_token(access_token, encryption_key)
    encrypted_refresh = encrypt_token(refresh_token, encryption_key) if refresh_token else None

    if credential is None:
        credential = OAuthCredential(
            social_account_id=social_account_id,
            encrypted_access_token=encrypted_access,
            encrypted_refresh_token=encrypted_refresh,
            provider_account_id=provider_account_id,
            token_type=token_type,
            scopes=list(scopes or []),
            expires_at=expires_at,
        )
    else:
        credential.encrypted_access_token = encrypted_access
        if encrypted_refresh is not None:
            # Providers may omit refresh_token on a subsequent authorization.
            credential.encrypted_refresh_token = encrypted_refresh
        if provider_account_id is not None:
            credential.provider_account_id = provider_account_id
        credential.token_type = token_type
        credential.scopes = list(scopes or credential.scopes or [])
        credential.expires_at = expires_at

    db.add(credential)
    db.flush()
    return credential


def load_oauth_credential(
    db: Session,
    *,
    social_account_id: int,
    encryption_key: str | None = None,
) -> DecryptedOAuthCredential | None:
    """Load and decrypt credentials inside backend code; never return through API."""
    row = db.query(OAuthCredential).filter_by(social_account_id=social_account_id).one_or_none()
    if row is None:
        return None
    return DecryptedOAuthCredential(
        social_account_id=row.social_account_id,
        provider_account_id=row.provider_account_id,
        access_token=decrypt_token(row.encrypted_access_token, encryption_key),
        refresh_token=decrypt_token(row.encrypted_refresh_token, encryption_key) if row.encrypted_refresh_token else None,
        token_type=row.token_type,
        scopes=tuple(row.scopes or []),
        expires_at=row.expires_at,
    )
