from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import User
from ..schemas import (RegisterIn, LoginIn, TokenOut, UserOut, ProfileUpdate, PasswordChange, AdminUserUpdate)
from ..security import hash_password, verify_password, create_access_token
from ..services import log

router = APIRouter(prefix="/api", tags=["Auth & Users"])


def _token(user: User) -> dict:
    return {"access_token": create_access_token(user.id, user.role), "token_type": "bearer", "user": user}


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email.lower()).first()
    # same message for unknown e-mail and wrong password (no account enumeration)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    return user


@router.post("/auth/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    role = "admin" if body.role in ("admin", "administrator") else body.role
    user = User(email=email, full_name=body.full_name, hashed_password=hash_password(body.password), role=role)
    db.add(user)
    db.flush()
    log(db, user.id, "register", f"Created account ({role})")
    db.commit()
    db.refresh(user)
    return _token(user)


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = _authenticate(db, body.email, body.password)
    log(db, user.id, "login", "Signed in")
    db.commit()
    return _token(user)


@router.post("/auth/login-form", include_in_schema=True, summary="Login (OAuth2 form, used by Swagger 'Authorize')")
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = _authenticate(db, form.username, form.password)
    return {"access_token": create_access_token(user.id, user.role), "token_type": "bearer"}


@router.post("/auth/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """JWTs are stateless: the client discards the token. This endpoint records the event."""
    log(db, user.id, "logout", "Signed out")
    db.commit()
    return {"message": "Signed out successfully."}


@router.get("/users/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/users/me", response_model=UserOut)
def update_me(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v.strip() if isinstance(v, str) else v)
    log(db, user.id, "profile", "Updated profile")
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/me/password")
def change_password(body: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")
    user.hashed_password = hash_password(body.new_password)
    log(db, user.id, "password", "Changed password")
    db.commit()
    return {"message": "Password updated."}
