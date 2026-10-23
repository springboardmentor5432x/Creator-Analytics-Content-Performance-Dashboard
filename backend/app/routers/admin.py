
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models import User
from app.schemas import UserPublic


router = APIRouter(
    prefix="/api/admin",
    tags=["Administrator"],
)


# All endpoints below require an active administrator.
admin_required = require_roles("administrator")


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    total_users = db.scalar(
        select(func.count()).select_from(User)
    ) or 0

    active_users = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.is_active.is_(True))
    ) or 0

    inactive_users = total_users - active_users

    creators = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role == "creator")
    ) or 0

    agencies = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role == "agency")
    ) or 0

    marketing_teams = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role == "marketing_team")
    ) or 0

    return {
        "admin_name": admin.full_name,
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "creators": creators,
        "agencies": agencies,
        "marketing_teams": marketing_teams,
    }


@router.get("/users", response_model=list[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    return list(
        db.scalars(
            select(User).order_by(User.created_at.desc())
        ).all()
    )


@router.patch(
    "/users/{user_id}/activate",
    response_model=UserPublic,
)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.is_active = True
    db.commit()
    db.refresh(user)

    return user


@router.patch(
    "/users/{user_id}/deactivate",
    response_model=UserPublic,
)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_required),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    if user.role == "administrator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be deactivated here.",
        )

    user.is_active = False
    db.commit()
    db.refresh(user)

    return user
