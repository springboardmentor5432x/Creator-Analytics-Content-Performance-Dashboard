"""Authentication (JWT + OAuth2 bearer) and role-based access control."""
import hashlib, hmac, os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer

from .config import SECRET_KEY, ALGORITHM, TOKEN_HOURS
from .database import db, q1

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)
MANAGER_ROLES = ("agency", "marketing", "admin")


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000)
    return f"{salt.hex()}${h.hex()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        salt, h = stored.split("$")
        calc = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex()
        return hmac.compare_digest(calc, h)
    except Exception:
        return False


def create_token(user: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": str(user["id"]), "role": user["role"], "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(data["sub"])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    with db() as c:
        user = q1(c, "SELECT * FROM users WHERE id=?", (uid,))
    if not user:
        raise HTTPException(401, "User no longer exists")
    return user


def require_roles(*roles):
    def dep(user: dict = Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "You do not have permission for this action")
        return user
    return dep


def target_creator(creator_id: Optional[int] = Query(None), user: dict = Depends(current_user)) -> int:
    """RBAC: creators see only themselves; agencies/marketing/admin may inspect any creator."""
    if creator_id is None or creator_id == user["id"]:
        return user["id"]
    if user["role"] not in MANAGER_ROLES:
        raise HTTPException(403, "Creators can only view their own analytics")
    with db() as c:
        if not q1(c, "SELECT id FROM users WHERE id=?", (creator_id,)):
            raise HTTPException(404, "Creator not found")
    return creator_id
