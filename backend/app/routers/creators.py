from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Agency, AgencyCreator, Creator, User
from ..roles import ADMIN, AGENCY, CREATOR
from ..schemas import CreatorOut, CreatorUpdate

router = APIRouter(prefix="/api/creators", tags=["Creator profile"])


def _own_creator(user: User, db: Session) -> Creator:
    creator = db.scalar(select(Creator).where(Creator.user_id == user.user_id))
    if creator is None:  # e.g. an admin switched this user to Creator before a profile existed
        creator = Creator(user_id=user.user_id)
        db.add(creator)
        db.commit()
        db.refresh(creator)
    return creator


def _get_or_404(creator_id: int, db: Session) -> Creator:
    creator = db.get(Creator, creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Creator profile not found")
    return creator


def _apply(creator: Creator, data: CreatorUpdate, db: Session) -> Creator:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(creator, field, value)
    db.commit()
    db.refresh(creator)
    return creator


@router.get("/me", response_model=CreatorOut)
def get_my_profile(user: User = Depends(require_roles(CREATOR)), db: Session = Depends(get_db)):
    return _own_creator(user, db)


@router.put("/me", response_model=CreatorOut)
def update_my_profile(
    data: CreatorUpdate, user: User = Depends(require_roles(CREATOR)), db: Session = Depends(get_db)
):
    """Only the fields sent in the body are changed."""
    return _apply(_own_creator(user, db), data, db)


@router.get("/{creator_id}", response_model=CreatorOut)
def get_creator(creator_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Allowed: the creator themself, an admin, or an agency that manages this creator."""
    creator = _get_or_404(creator_id, db)
    if user.user_id == creator.user_id or user.role == ADMIN:
        return creator
    if user.role == AGENCY:
        agency = db.scalar(select(Agency).where(Agency.user_id == user.user_id))
        linked = agency and db.get(AgencyCreator, (agency.agency_id, creator.creator_id))
        if linked:
            return creator
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You cannot access this creator's profile")


@router.put("/{creator_id}", response_model=CreatorOut)
def update_creator(
    creator_id: int, data: CreatorUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Allowed: the creator themself or an admin."""
    creator = _get_or_404(creator_id, db)
    if user.user_id != creator.user_id and user.role != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only edit your own profile")
    return _apply(creator, data, db)
