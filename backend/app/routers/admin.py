from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db, engine
from ..deps import require_roles
from ..models import (User, ContentRecord, FollowerGrowth, Activity, Campaign,
                     RevenueRecord, HashtagMetric, Notification)
from ..schemas import UserOut, AdminUserUpdate, AdminCreateUserIn
from ..security import hash_password
from ..services import log, content_to_dict, engagement_rate

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/overview")
def admin_overview(_: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    users = db.query(User).all()
    total_users = len(users)
    creator_users = sum(1 for u in users if u.role == "creator")
    agency_users = sum(1 for u in users if u.role == "agency")
    marketing_users = sum(1 for u in users if u.role == "marketing")
    admin_users = sum(1 for u in users if u.role in ("admin", "administrator"))
    active_users = sum(1 for u in users if u.is_active)
    inactive_users = total_users - active_users

    total_content = db.query(func.count(ContentRecord.id)).scalar() or 0
    total_growth = db.query(func.count(FollowerGrowth.id)).scalar() or 0
    total_activities = db.query(func.count(Activity.id)).scalar() or 0
    total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0

    recent_activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(15).all()

    # System-wide Content Analytics calculation
    all_content = db.query(ContentRecord).all()
    all_views = sum(c.views for c in all_content)
    all_likes = sum(c.likes for c in all_content)
    all_comments = sum(c.comments for c in all_content)
    all_shares = sum(c.shares for c in all_content)
    all_saves = sum(c.saves for c in all_content)
    all_reach = sum(c.reach for c in all_content)
    all_watch_time = sum(c.watch_time_minutes for c in all_content)
    all_engagement = all_likes + all_comments + all_shares + all_saves
    all_eng_rate = engagement_rate(all_likes, all_comments, all_shares, all_saves, all_reach)

    # Platform distribution across entire system
    plat_stats = {}
    for c in all_content:
        p = plat_stats.setdefault(c.platform, {"platform": c.platform, "posts": 0, "views": 0, "engagement": 0, "reach": 0})
        p["posts"] += 1
        p["views"] += c.views
        p["engagement"] += c.likes + c.comments + c.shares + c.saves
        p["reach"] += c.reach
    for p in plat_stats.values():
        p["engagement_rate"] = engagement_rate(
            sum(c.likes for c in all_content if c.platform == p["platform"]),
            sum(c.comments for c in all_content if c.platform == p["platform"]),
            sum(c.shares for c in all_content if c.platform == p["platform"]),
            sum(c.saves for c in all_content if c.platform == p["platform"]),
            p["reach"]
        )

    # Top platform-wide posts
    top_system_posts = sorted(
        [content_to_dict(c) for c in all_content],
        key=lambda x: (x["engagement_rate"], x["views"]),
        reverse=True
    )[:5]

    return {
        "cards": {
            "total_users": total_users,
            "creator_users": creator_users,
            "agency_users": agency_users,
            "marketing_users": marketing_users,
            "admin_users": admin_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "total_content": total_content,
            "total_growth_records": total_growth,
            "total_activities": total_activities,
            "total_campaigns": total_campaigns,
        },
        "content_analytics": {
            "total_posts": len(all_content),
            "total_views": all_views,
            "total_reach": all_reach,
            "total_likes": all_likes,
            "total_comments": all_comments,
            "total_shares": all_shares,
            "total_saves": all_saves,
            "total_engagement": all_engagement,
            "total_watch_time": round(all_watch_time, 1),
            "average_engagement_rate": all_eng_rate,
            "platform_breakdown": sorted(plat_stats.values(), key=lambda x: x["views"], reverse=True),
            "top_posts": top_system_posts,
        },
        "system": {
            "database": engine.dialect.name,
            "status": "healthy",
            "uptime": "operational",
            "version": "1.0.0",
        },
        "recent_activities": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "action": a.action,
                "detail": a.detail,
                "created_at": a.created_at,
            }
            for a in recent_activities
        ],
    }


@router.get("/users", response_model=list[UserOut])
def list_users(
    search: Optional[str] = Query(None, max_length=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    _: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter((User.full_name.ilike(s)) | (User.email.ilike(s)))
    if role:
        if role in ("admin", "administrator"):
            q = q.filter(User.role.in_(["admin", "administrator"]))
        else:
            q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    return q.order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    body: AdminCreateUserIn,
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists.")
    user = User(
        email=email,
        full_name=body.full_name.strip(),
        hashed_password=hash_password(body.password),
        role=body.role,
        bio=body.bio.strip() if body.bio else None,
        is_active=True,
    )
    db.add(user)
    db.flush()
    log(db, admin.id, "admin_user_create", f"Admin created {user.role} user: {user.email}")
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def admin_update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if target.id == admin.id and (body.role not in (None, "admin", "administrator") or body.is_active is False):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Administrators cannot demote or deactivate their own account.")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(target, k, v)
    log(db, admin.id, "admin_user_update", f"Admin updated user {target.email} (role={target.role}, active={target.is_active})")
    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Administrators cannot delete their own account.")
    email = target.email
    db.delete(target)
    log(db, admin.id, "admin_user_delete", f"Admin deleted user {email}")
    db.commit()
    return {"message": f"User {email} deleted successfully."}


@router.get("/activities")
def list_activities(
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    rows = db.query(Activity).order_by(Activity.created_at.desc()).limit(limit).all()
    user_ids = list({a.user_id for a in rows})
    users_map = {u.id: u.full_name for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_name": users_map.get(a.user_id, "Unknown"),
            "action": a.action,
            "detail": a.detail,
            "created_at": a.created_at,
        }
        for a in rows
    ]


@router.get("/system")
def system_diagnostics(_: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return {
        "database": {
            "dialect": engine.dialect.name,
            "url": str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url),
        },
        "tables": {
            "users": db.query(func.count(User.id)).scalar(),
            "content_records": db.query(func.count(ContentRecord.id)).scalar(),
            "follower_growth": db.query(func.count(FollowerGrowth.id)).scalar(),
            "campaigns": db.query(func.count(Campaign.id)).scalar(),
            "activities": db.query(func.count(Activity.id)).scalar(),
            "revenue_records": db.query(func.count(RevenueRecord.id)).scalar(),
            "hashtag_metrics": db.query(func.count(HashtagMetric.id)).scalar(),
            "notifications": db.query(func.count(Notification.id)).scalar(),
        },
        "status": "operational",
    }
