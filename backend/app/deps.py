import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .security import decode_token

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form")


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials. Please sign in again.",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(token)
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise err
    if not user or not user.is_active:
        raise err
    return user


def require_roles(*roles: str):
    """Dependency factory for role-based access control."""
    allowed = set(roles)
    if "admin" in allowed or "administrator" in allowed:
        allowed.add("admin")
        allowed.add("administrator")

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to perform this action.")
        return user
    return checker
