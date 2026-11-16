from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Agency, Creator, User
from ..roles import AGENCY, CREATOR, ROLE_LABELS
from ..schemas import RegisterRequest, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def to_user_out(user: User) -> UserOut:
    return UserOut(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        role=user.role,
        role_label=ROLE_LABELS[user.role],
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(name=data.name, email=email, password_hash=hash_password(data.password), role=data.role)
    # Every creator / agency account gets its (empty) profile row straight away.
    if data.role == CREATOR:
        user.creator = Creator()
    elif data.role == AGENCY:
        user.agency = Agency()

    db.add(user)
    db.commit()
    db.refresh(user)
    return to_user_out(user)


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 password flow: the form field "username" carries the email.
    user = db.scalar(select(User).where(User.email == form.username.strip().lower()))
    if user is None or not verify_password(form.password, user.password_hash):
        # Same message for "no such user" and "wrong password" so emails cannot be probed.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This account is disabled")

    return TokenOut(access_token=create_access_token(user.user_id, user.role), user=to_user_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return to_user_out(current_user)


# ---------------- LinkedIn OAuth Flow ----------------
from fastapi.responses import RedirectResponse
from ..services.linkedin import (
    get_linkedin_login_url,
    exchange_code_for_token,
    fetch_linkedin_userinfo,
    sync_linkedin_to_db,
    LinkedInAPIError,
)

@router.get("/linkedin/login")
def linkedin_login(token: str):
    """Initiates LinkedIn OAuth login for the authenticated creator."""
    return {"auth_url": get_linkedin_login_url(state=token)}

@router.get("/linkedin/callback")
def linkedin_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Receives OAuth code from LinkedIn, exchanges for token and stores account."""
    from ..security import decode_access_token
    payload = decode_access_token(state)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid state token")

    user_id = int(payload.get("sub", 0))
    user = db.get(User, user_id)
    if not user:
        return RedirectResponse("http://localhost:5173/dashboard?linkedin_error=User+not+found")

    from ..models import Creator
    creator = db.scalar(select(Creator).where(Creator.user_id == user.user_id))
    if not creator:
        creator = Creator(user_id=user.user_id, creator_name=user.name, bio="Digital content creator & storyteller.")
        db.add(creator)
        db.commit()
        db.refresh(creator)

    try:
        token_data = exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)
        userinfo = fetch_linkedin_userinfo(access_token)
        account = sync_linkedin_to_db(creator.creator_id, userinfo, access_token, expires_in, db)
    except Exception as e:
        import urllib.parse
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(f"http://localhost:5173/dashboard?linkedin_error={err_msg}")

    # Redirect to frontend dashboard with success flag
    return RedirectResponse("http://localhost:5173/dashboard?linkedin_synced=true")
