
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.security import ALGORITHM


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

ADMIN_ROLE = "administrator"


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
        )

        subject = payload.get("sub")

        if not subject:
            raise unauthorized

        user_id = int(subject)

    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise unauthorized

    return user


def require_roles(*allowed_roles: str):
    def role_guard(
        user: User = Depends(get_current_user),
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Your account role does not have permission "
                    "to perform this action."
                ),
            )

        return user

    return role_guard


def require_admin(
    user: User = Depends(require_roles(ADMIN_ROLE)),
) -> User:
    """Allow access only to active administrator accounts."""
    return user
