import bcrypt, jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "change-this-to-a-long-random-string-123456"
ALGORITHM = "HS256"

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, hashed: str) -> bool:
    return bcrypt.checkpw(p.encode(), hashed.encode())

def create_access_token(user_id: int, role: str, minutes: int = 60) -> str:
    payload = {"sub": str(user_id), "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)