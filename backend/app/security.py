
from datetime import datetime, timedelta, timezone

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.config import settings


password_hash = PasswordHash.recommended()

ALGORITHM = "HS256"

ADMIN_ROLE = "administrator"

SUPPORTED_ROLES = {
    "creator",
    "agency",
    "marketing_team",
    ADMIN_ROLE,
}


def hash_password(password: str) -> str:
    """Hash a password before storing it."""
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its stored hash."""
    try:
        return password_hash.verify(password, hashed)
    except Exception:
        return False


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT containing the user's ID and role."""
    if role not in SUPPORTED_ROLES:
        raise ValueError("Unsupported user role.")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    """Validate a JWT and return its claims."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
        )

        if not payload.get("sub"):
            return None

        return payload

    except InvalidTokenError:
        return None


def is_admin(role: str) -> bool:
    """Check whether a role is the administrator role."""
    return role == ADMIN_ROLE
