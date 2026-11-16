from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..cache_redis import cache
from ..database import get_db
from ..deps import get_current_user
from ..models import User, ContentRecord, FollowerGrowth, Activity
from ..services import resolve_range, content_to_dict, engagement_rate

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/overview")
def overview(start_date: Optional[date] = None, end_date: Optional[date] = None, days: int = 30,
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start, end = resolve_range(start_date, end_date, days)
    cache_key = f"user:{user.id}:dashboard_overview:{start}:{end}"
    cached = cache.get_json(cache_key)
    if cached:
        return cached

    posts = db.query(ContentRecord).filter(ContentRecord.user_id == user.id, ContentRecord.published_at >= start,
                                           ContentRecord.published_at <= end).all()
    growth = db.query(FollowerGrowth).filter(FollowerGrowth.user_id == user.id, FollowerGrowth.date >= start,
                                             FollowerGrowth.date <= end).order_by(FollowerGrowth.date).all()
    latest = {}
    for g in growth:
        latest[g.platform] = g.followers
    views = sum(p.views for p in posts)
    eng = sum(p.likes + p.comments + p.shares + p.saves for p in posts)
    reach = sum(p.reach for p in posts)
    plat = {}
    for p in posts:
        d = plat.setdefault(p.platform, {"platform": p.platform, "posts": 0, "views": 0, "engagement": 0, "followers": 0})
        d["posts"] += 1
        d["views"] += p.views
        d["engagement"] += p.likes + p.comments + p.shares + p.saves
    for k, f in latest.items():
        plat.setdefault(k, {"platform": k, "posts": 0, "views": 0, "engagement": 0, "followers": 0})["followers"] = f
    recent = sorted(posts, key=lambda p: (p.published_at, p.id), reverse=True)[:5]
    acts = db.query(Activity).filter(Activity.user_id == user.id).order_by(Activity.created_at.desc()).limit(8).all()
    has_demo = any(p.is_demo for p in posts) or any(g.is_demo for g in growth)
    payload = {
        "start_date": str(start), "end_date": str(end), "has_demo": has_demo,
        "empty": not posts and not growth,
        "cards": {"total_followers": sum(latest.values()), "total_views": views, "total_engagement": eng,
                  "engagement_rate": engagement_rate(sum(p.likes for p in posts), sum(p.comments for p in posts),
                                                     sum(p.shares for p in posts), sum(p.saves for p in posts), reach)},
        "recent_content": [content_to_dict(p) for p in recent],
        "recent_activity": [{"id": a.id, "action": a.action, "detail": a.detail, "created_at": a.created_at.isoformat() if a.created_at else None} for a in acts],
        "platforms": sorted(plat.values(), key=lambda d: d["views"], reverse=True),
    }
    cache.set_json(cache_key, payload, ttl_seconds=60)
    return payload
