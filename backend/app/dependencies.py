from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token


ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "creator": ("dashboard:read", "analytics:read", "profile:read:own", "profile:write:own", "reports:read:own"),
    "agency": ("dashboard:read", "analytics:read", "client_profiles:read", "reports:read"),
    "marketing_team": ("dashboard:read", "analytics:read", "content_performance:read", "reports:read"),
    "administrator": ("dashboard:read", "analytics:read", "users:read", "users:manage", "system:manage"),
}


def permissions_for_role(role: str) -> list[str]:
    """Return the centrally defined policy permission list for a role."""
    return list(ROLE_PERMISSIONS.get(role, ()))

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError):
        raise unauthorized
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if user is None:
        raise unauthorized
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory for routes limited to the listed roles."""
    allowed = set(allowed_roles)

    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return role_dependency


def require_permissions(*required_permissions: str):
    """Dependency factory that enforces the centrally defined role policy."""
    required = set(required_permissions)

    def permission_dependency(current_user: User = Depends(get_current_user)) -> User:
        available = set(permissions_for_role(current_user.role))
        if not required.issubset(available):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role does not have the required permission.",
            )
        return current_user

    return permission_dependency
