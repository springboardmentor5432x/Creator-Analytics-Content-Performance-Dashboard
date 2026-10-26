from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Agency, Creator, User
from ..roles import ADMIN, AGENCY, CREATOR
from ..schemas import AdminUserUpdate, UserOut
from .auth import to_user_out

router = APIRouter(prefix="/api/admin", tags=["Admin"])
admin_only = require_roles(ADMIN)


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return [to_user_out(u) for u in db.scalars(select(User).order_by(User.user_id))]


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int, data: AdminUserUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.user_id == admin.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role or status")

    if data.role is not None and data.role != user.role:
        user.role = data.role
        # keep a matching (empty) profile row so the user can open their profile page
        if data.role == CREATOR and user.creator is None:
            user.creator = Creator()
        if data.role == AGENCY and user.agency is None:
            user.agency = Agency()
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return to_user_out(user)
