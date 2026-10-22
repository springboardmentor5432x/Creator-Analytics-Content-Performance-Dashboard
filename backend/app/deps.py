import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.get(User, int(data["sub"]))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user

def require_roles(*allowed: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission")
        return user
    return checker