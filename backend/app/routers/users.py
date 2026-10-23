
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import (
    AccountSettingsUpdate,
    ProfileUpdate,
    UserPublic,
)


router = APIRouter(
    prefix="/api/users",
    tags=["User profile and settings"],
)


@router.get("/profile", response_model=UserPublic)
def get_profile(
    user: User = Depends(get_current_user),
):
    return user


@router.put("/profile", response_model=UserPublic)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.full_name = " ".join(payload.full_name.split())
    user.bio = payload.bio
    user.social_links = payload.social_links

    db.commit()
    db.refresh(user)

    return user


@router.put("/account", response_model=UserPublic)
def update_account_settings(
    payload: AccountSettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.theme_preference = payload.theme_preference
    user.email_notifications = payload.email_notifications

    db.commit()
    db.refresh(user)

    return user
