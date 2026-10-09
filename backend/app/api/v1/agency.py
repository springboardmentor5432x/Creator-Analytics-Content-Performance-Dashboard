from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole, AgencyProfile
from app.schemas.profile import AgencyProfileRead, AgencyProfileUpdate
from app.core.rbac import get_current_user, RoleChecker

router = APIRouter(prefix="/agency", tags=["Agency Management"])

allow_agency = RoleChecker([UserRole.AGENCY])

@router.get("/profile", response_model=AgencyProfileRead)
def get_agency_profile(
    current_user: User = Depends(allow_agency),
    db: Session = Depends(get_db)
):
    """Retrieve agency profile for the authenticated Agency account."""
    profile = db.query(AgencyProfile).filter(AgencyProfile.user_id == current_user.id).first()
    if not profile:
        profile = AgencyProfile(user_id=current_user.id, agency_name=f"{current_user.full_name}'s Talent Agency")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=AgencyProfileRead)
def update_agency_profile(
    profile_in: AgencyProfileUpdate,
    current_user: User = Depends(allow_agency),
    db: Session = Depends(get_db)
):
    """Update agency profile for authenticated Agency user."""
    profile = db.query(AgencyProfile).filter(AgencyProfile.user_id == current_user.id).first()
    if not profile:
        profile = AgencyProfile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
