from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..deps import require_roles

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users")
def list_users(admin=Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return [{"id": u.id, "email": u.email, "role": u.role.name, "active": u.is_active}
            for u in db.query(models.User).all()]