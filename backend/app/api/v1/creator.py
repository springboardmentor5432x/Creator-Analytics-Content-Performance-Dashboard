from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole, CreatorProfile
from app.schemas.profile import CreatorProfileRead, CreatorProfileUpdate
from app.core.rbac import get_current_user, RoleChecker

router = APIRouter(prefix="/creator", tags=["Creator Management"])

allow_creator = RoleChecker([UserRole.CREATOR])

@router.get("/profile", response_model=CreatorProfileRead)
def get_creator_profile(
    current_user: User = Depends(allow_creator),
    db: Session = Depends(get_db)
):
    """Retrieve creator profile for the authenticated Creator."""
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        profile = CreatorProfile(user_id=current_user.id, handle=f"@{current_user.full_name.lower().replace(' ', '')}")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=CreatorProfileRead)
def update_creator_profile(
    profile_in: CreatorProfileUpdate,
    current_user: User = Depends(allow_creator),
    db: Session = Depends(get_db)
):
    """Update creator profile details for authenticated Creator."""
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == current_user.id).first()
    if not profile:
        profile = CreatorProfile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
