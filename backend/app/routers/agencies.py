from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Agency, AgencyCreator, Creator, User
from ..roles import ADMIN, AGENCY
from ..schemas import AgencyCreatorAdd, AgencyOut, AgencyUpdate, CreatorOut

router = APIRouter(prefix="/api/agencies", tags=["Agency profile"])


def _own_agency(user: User, db: Session) -> Agency:
    agency = db.scalar(select(Agency).where(Agency.user_id == user.user_id))
    if agency is None:
        agency = Agency(user_id=user.user_id)
        db.add(agency)
        db.commit()
        db.refresh(agency)
    return agency


def _get_or_404(agency_id: int, db: Session) -> Agency:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Agency profile not found")
    return agency


def _apply(agency: Agency, data: AgencyUpdate, db: Session) -> Agency:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agency, field, value)
    db.commit()
    db.refresh(agency)
    return agency


@router.get("/me", response_model=AgencyOut)
def get_my_profile(user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)):
    return _own_agency(user, db)


@router.put("/me", response_model=AgencyOut)
def update_my_profile(
    data: AgencyUpdate, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    """Only the fields sent in the body are changed."""
    return _apply(_own_agency(user, db), data, db)


# ---- creators managed by the logged-in agency ----
@router.get("/me/creators", response_model=list[CreatorOut])
def list_my_creators(user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)):
    agency = _own_agency(user, db)
    stmt = (
        select(Creator)
        .join(AgencyCreator, AgencyCreator.creator_id == Creator.creator_id)
        .where(AgencyCreator.agency_id == agency.agency_id)
        .order_by(Creator.creator_id)
    )
    return db.scalars(stmt).all()


@router.post("/me/creators", response_model=CreatorOut, status_code=status.HTTP_201_CREATED)
def add_creator(
    data: AgencyCreatorAdd, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    agency = _own_agency(user, db)
    creator = db.get(Creator, data.creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Creator not found")
    if db.get(AgencyCreator, (agency.agency_id, creator.creator_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This creator is already linked to your agency")
    db.add(AgencyCreator(agency_id=agency.agency_id, creator_id=creator.creator_id))
    db.commit()
    return creator


@router.delete("/me/creators/{creator_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_creator(
    creator_id: int, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    agency = _own_agency(user, db)
    link = db.get(AgencyCreator, (agency.agency_id, creator_id))
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This creator is not linked to your agency")
    db.delete(link)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- by id (declared after /me routes so "me" is not read as an id) ----
@router.get("/{agency_id}", response_model=AgencyOut)
def get_agency(agency_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Allowed: the agency itself or an admin."""
    agency = _get_or_404(agency_id, db)
    if user.user_id != agency.user_id and user.role != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You cannot access this agency's profile")
    return agency


@router.put("/{agency_id}", response_model=AgencyOut)
def update_agency(
    agency_id: int, data: AgencyUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    agency = _get_or_404(agency_id, db)
    if user.user_id != agency.user_id and user.role != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only edit your own profile")
    return _apply(agency, data, db)
