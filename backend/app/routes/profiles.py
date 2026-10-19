from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_roles,
)

from app.database import get_db

from app.models.profile import (
    AgencyProfile,
    CreatorProfile,
)

from app.models.user import User

from app.schemas.profile import (
    AgencyProfileResponse,
    AgencyProfileUpdate,
    CreatorProfileResponse,
    CreatorProfileUpdate,
)


router = APIRouter()


@router.get(
    "/creator/me",
    response_model=CreatorProfileResponse
)
def get_creator_profile(
    current_user: User = Depends(
        require_roles("creator")
    ),
    db: Session = Depends(get_db)
):

    profile = db.query(CreatorProfile).filter(
        CreatorProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found"
        )

    return profile


@router.put(
    "/creator/me",
    response_model=CreatorProfileResponse
)
def update_creator_profile(
    data: CreatorProfileUpdate,
    current_user: User = Depends(
        require_roles("creator")
    ),
    db: Session = Depends(get_db)
):

    profile = db.query(CreatorProfile).filter(
        CreatorProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found"
        )

    for field, value in data.model_dump(
        exclude_unset=True
    ).items():

        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile


@router.get(
    "/agency/me",
    response_model=AgencyProfileResponse
)
def get_agency_profile(
    current_user: User = Depends(
        require_roles("agency")
    ),
    db: Session = Depends(get_db)
):

    profile = db.query(AgencyProfile).filter(
        AgencyProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Agency profile not found"
        )

    return profile


@router.put(
    "/agency/me",
    response_model=AgencyProfileResponse
)
def update_agency_profile(
    data: AgencyProfileUpdate,
    current_user: User = Depends(
        require_roles("agency")
    ),
    db: Session = Depends(get_db)
):

    profile = db.query(AgencyProfile).filter(
        AgencyProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Agency profile not found"
        )

    for field, value in data.model_dump(
        exclude_unset=True
    ).items():

        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile