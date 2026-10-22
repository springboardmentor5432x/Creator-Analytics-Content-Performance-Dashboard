from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..deps import require_roles

router = APIRouter(tags=["Profiles"])

@router.get("/creators/me")
def get_creator(user=Depends(require_roles("creator")), db: Session = Depends(get_db)):
    return db.query(models.CreatorProfile).filter_by(user_id=user.id).first()

@router.put("/creators/me")
def update_creator(data: schemas.CreatorProfileIn, user=Depends(require_roles("creator")),
                   db: Session = Depends(get_db)):
    p = db.query(models.CreatorProfile).filter_by(user_id=user.id).first()
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

@router.get("/agencies/me")
def get_agency(user=Depends(require_roles("agency")), db: Session = Depends(get_db)):
    return db.query(models.AgencyProfile).filter_by(user_id=user.id).first()

@router.put("/agencies/me")
def update_agency(data: schemas.AgencyProfileIn, user=Depends(require_roles("agency")),
                  db: Session = Depends(get_db)):
    p = db.query(models.AgencyProfile).filter_by(user_id=user.id).first()
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p