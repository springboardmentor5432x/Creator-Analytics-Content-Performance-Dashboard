from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.profile_utils import ensure_role_profile, get_profile_values, update_role_profile
from app.schemas import AccountProfileResponse, PasswordChangeRequest, ProfileUpdateRequest
from app.security import hash_password, verify_password

router = APIRouter(prefix="/account", tags=["Account settings"])


def response_for(db: Session, user: User) -> dict:
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at,
        **get_profile_values(db, user),
    }


@router.get("/profile", response_model=AccountProfileResponse)
def read_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_role_profile(db, user)
    db.commit()
    db.refresh(user)
    return response_for(db, user)


@router.patch("/profile", response_model=AccountProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    full_name = changes.pop("full_name", None)
    if full_name is not None:
        user.full_name = full_name.strip()

    try:
        update_role_profile(db, user, changes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    db.commit()
    db.refresh(user)
    return response_for(db, user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a new password that differs from the current password.")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return None
