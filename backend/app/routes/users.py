from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_roles,
)

from app.database import get_db
from app.models.user import User


router = APIRouter()


@router.get("/me")
def my_account(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.name
    }


@router.get(
    "/admin/users/{user_id}"
)
def get_user_as_admin(
    user_id: int,
    current_user: User = Depends(
        require_roles("administrator")
    ),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.name,
        "is_active": user.is_active
    }