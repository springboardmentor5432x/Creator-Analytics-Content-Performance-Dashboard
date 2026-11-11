"""Authentication endpoints with brute-force protection on login."""

from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.audit import client_ip, record_audit
from app.database import get_db
from app.dependencies import get_current_user, permissions_for_role
from app.models import User
from app.profile_utils import ensure_role_profile
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Lightweight in-memory brute-force guard: per (client IP, email) sliding
# window of failed attempts. Good enough for the single-process local API;
# a horizontal deployment should move this into shared rate-limit middleware.
FAILED_LOGIN_WINDOW = timedelta(minutes=10)
FAILED_LOGIN_LIMIT = 5
_failed_logins: dict[str, list[datetime]] = {}
_failed_logins_lock = Lock()


def _failed_login_key(request: Request, email: str) -> str:
    return f"{client_ip(request) or 'unknown'}:{email.lower()}"


def _register_failed_login(request: Request, email: str) -> None:
    now = datetime.now(timezone.utc)
    key = _failed_login_key(request, email)
    with _failed_logins_lock:
        attempts = [attempt for attempt in _failed_logins.get(key, []) if now - attempt < FAILED_LOGIN_WINDOW]
        attempts.append(now)
        _failed_logins[key] = attempts


def _failed_login_blocked(request: Request, email: str) -> bool:
    now = datetime.now(timezone.utc)
    key = _failed_login_key(request, email)
    with _failed_logins_lock:
        attempts = [
            attempt
            for attempt in _failed_logins.get(key, [])
            if now - attempt < FAILED_LOGIN_WINDOW
        ]
        _failed_logins[key] = attempts
        return len(attempts) >= FAILED_LOGIN_LIMIT


def _clear_failed_logins(request: Request, email: str) -> None:
    with _failed_logins_lock:
        _failed_logins.pop(_failed_login_key(request, email), None)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,  # Public registration cannot create administrator accounts.
        is_active=True,
    )
    db.add(user)
    db.flush()
    ensure_role_profile(db, user, payload.profile_name, payload.focus_area)
    record_audit(
        db,
        user,
        "account.registered",
        target_type="user",
        target_id=user.id,
        details={"role": user.role},
    )
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = str(payload.email).lower().strip()
    if _failed_login_blocked(request, email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Wait a few minutes and try again.",
        )
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
        _register_failed_login(request, email)
        record_audit(
            db,
            user,
            "auth.login_failed",
            target_type="user",
            target_id=user.id if user else None,
            details={"email": email},
            request=request,
            commit=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.", headers={"WWW-Authenticate": "Bearer"})
    user.last_login_at = datetime.now(timezone.utc)
    _clear_failed_logins(request, email)
    record_audit(
        db,
        user,
        "auth.login",
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a client-side sign-out. The JWT itself expires normally."""
    record_audit(
        db,
        current_user,
        "auth.logout",
        target_type="user",
        target_id=current_user.id,
        request=request,
        commit=True,
    )
    return None


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/permissions")
def my_permissions(current_user: User = Depends(get_current_user)):
    """Return the signed-in user's role and declared permission names."""
    return {"role": current_user.role, "permissions": permissions_for_role(current_user.role)}
