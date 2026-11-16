from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Agency, Creator, SocialAccount, User
from ..roles import ADMIN, AGENCY, CREATOR
from ..schemas import AdminUserUpdate, UserOut
from .auth import to_user_out

router = APIRouter(prefix="/api/admin", tags=["Admin"])
admin_only = require_roles(ADMIN)



@router.get("/overview")
def get_admin_overview(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    users = db.scalars(select(User).order_by(User.created_at.asc())).all()
    accounts = db.scalars(select(SocialAccount)).all()

    growth_map = {}
    for u in users:
        day_str = u.created_at.strftime("%d %b")
        growth_map[day_str] = growth_map.get(day_str, 0) + 1

    cumulative = 0
    user_growth = []
    for day_str, count in growth_map.items():
        cumulative += count
        user_growth.append({"d": day_str, "Users": cumulative})

    plat_counts = {}
    for a in accounts:
        p = (a.platform or "other").capitalize()
        plat_counts[p] = plat_counts.get(p, 0) + 1
    platform_usage = [{"name": p, "value": count} for p, count in plat_counts.items()]

    recent = sorted(users, key=lambda u: u.created_at, reverse=True)[:5]
    recent_users = [to_user_out(u).model_dump() for u in recent]

    activity = []
    for u in recent[:3]:
        activity.append({
            "text": f"New {u.role.replace('_', ' ')} registered: {u.name}",
            "time": u.created_at.strftime("%d %b %H:%M"),
            "tone": "#22c55e",
        })
    synced_accounts = sorted([a for a in accounts if a.last_synced_at], key=lambda a: a.last_synced_at, reverse=True)[:3]
    for a in synced_accounts:
        activity.append({
            "text": f"{a.platform.capitalize()} data synced for {a.username or a.platform_user_id}",
            "time": a.last_synced_at.strftime("%d %b %H:%M") if a.last_synced_at else "",
            "tone": "#6d4ae8",
        })

    return {
        "user_growth": user_growth,
        "platform_usage": platform_usage,
        "recent_users": recent_users,
        "system_activity": activity,
    }

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
