from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permissions
from app.models import ContentMetric, ContentPost, CreatorProfile, RevenueRecord, SocialAccount, User

router = APIRouter(prefix="/dashboard", tags=["Creator dashboard"])


def get_profile(db: Session, user: User) -> CreatorProfile | None:
    # The current dashboard is the creator dashboard from Milestone 1.
    # Agency/team/admin users must not accidentally see stale creator data
    # if an account's role was changed after it already had a CreatorProfile.
    if user.role != "creator":
        return None
    return db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()


def profile_metrics_query(db: Session, profile_id: int):
    return (
        db.query(ContentMetric)
        .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(SocialAccount.creator_profile_id == profile_id)
    )


def money(value: Decimal | int | float) -> float:
    return round(float(value or 0), 2)


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(require_permissions("dashboard:read", "analytics:read"))):
    profile = get_profile(db, user)
    if profile is None:
        return {
            "followers": 0,
            "views_7d": 0,
            "engagement_rate": 0,
            "revenue_mtd": 0,
            "posts_count": 0,
            "platforms_count": 0,
            "demo_data": False,
            "data_status": "no_creator_profile_for_role",
        }

    accounts = db.query(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
    start = date.today() - timedelta(days=6)
    rows = profile_metrics_query(db, profile.id).filter(ContentMetric.recorded_on >= start).all()
    views = sum(row.views for row in rows)
    rates = [row.engagement_rate for row in rows]
    posts_count = db.query(ContentPost).join(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).count()
    month_start = date.today().replace(day=1)
    revenue = db.query(RevenueRecord).filter(RevenueRecord.creator_profile_id == profile.id, RevenueRecord.recorded_on >= month_start).all()
    return {
        "followers": sum(account.followers_count for account in accounts),
        "views_7d": views,
        "engagement_rate": round(sum(rates) / len(rates), 2) if rates else 0,
        "revenue_mtd": money(sum((record.amount for record in revenue), Decimal("0.00"))),
        "posts_count": posts_count,
        "platforms_count": len(accounts),
        "demo_data": bool(accounts) and all(not account.is_connected for account in accounts),
    }


@router.get("/trends")
def trends(days: int = Query(default=7, ge=7, le=30), db: Session = Depends(get_db), user: User = Depends(require_permissions("dashboard:read", "analytics:read"))):
    profile = get_profile(db, user)
    if profile is None:
        return {"days": []}
    start = date.today() - timedelta(days=days - 1)
    rows = profile_metrics_query(db, profile.id).filter(ContentMetric.recorded_on >= start).all()
    totals: dict[date, dict[str, float]] = defaultdict(lambda: {"views": 0, "engagement": 0, "count": 0})
    for row in rows:
        totals[row.recorded_on]["views"] += row.views
        totals[row.recorded_on]["engagement"] += row.engagement_rate
        totals[row.recorded_on]["count"] += 1
    result = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        value = totals[day]
        result.append({
            "date": day.isoformat(),
            "label": day.strftime("%b %d"),
            "views": int(value["views"]),
            "engagement_rate": round(value["engagement"] / value["count"], 2) if value["count"] else 0,
        })
    return {"days": result}


@router.get("/platforms")
def platforms(db: Session = Depends(get_db), user: User = Depends(require_permissions("dashboard:read", "analytics:read"))):
    profile = get_profile(db, user)
    if profile is None:
        return {"platforms": []}
    accounts = db.query(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
    start = date.today() - timedelta(days=6)
    rows = (
        db.query(ContentMetric.views, ContentPost.social_account_id)
        .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(SocialAccount.creator_profile_id == profile.id, ContentMetric.recorded_on >= start)
        .all()
    )
    views_by_account: dict[int, int] = defaultdict(int)
    for views, account_id in rows:
        views_by_account[account_id] += views
    output = []
    for account in accounts:
        output.append({"platform": account.platform, "handle": account.handle, "followers": account.followers_count, "views_7d": views_by_account[account.id], "connected": account.is_connected})
    output.sort(key=lambda row: row["views_7d"], reverse=True)
    return {"platforms": output}


@router.get("/top-content")
def top_content(limit: int = Query(default=5, ge=1, le=20), db: Session = Depends(get_db), user: User = Depends(require_permissions("dashboard:read", "analytics:read"))):
    profile = get_profile(db, user)
    if profile is None:
        return {"posts": []}
    start = date.today() - timedelta(days=6)
    metrics = profile_metrics_query(db, profile.id).filter(ContentMetric.recorded_on >= start).all()
    views_by_post: dict[int, int] = defaultdict(int)
    engagement_by_post: dict[int, list[float]] = defaultdict(list)
    metrics_by_post: dict[int, list[ContentMetric]] = defaultdict(list)
    for metric in metrics:
        views_by_post[metric.content_post_id] += metric.views
        engagement_by_post[metric.content_post_id].append(metric.engagement_rate)
        metrics_by_post[metric.content_post_id].append(metric)
    posts = db.query(ContentPost, SocialAccount.platform).join(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
    result = []
    for post, platform in posts:
        result.append({
            "id": post.id,
            "title": post.title,
            "platform": platform,
            "content_type": post.content_type,
            "views_7d": views_by_post[post.id],
            "engagement_rate": round(sum(engagement_by_post[post.id]) / len(engagement_by_post[post.id]), 2) if engagement_by_post[post.id] else 0,
        })
    result.sort(key=lambda row: row["views_7d"], reverse=True)
    return {"posts": result[:limit]}
