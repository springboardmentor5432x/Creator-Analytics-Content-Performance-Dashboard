from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import AudienceAnalytics, Creator, Post, PostAnalytics, SocialAccount, User
from ..roles import CREATOR
from ..services.youtube import sync_youtube_channel_to_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Content"])


def _get_or_create_creator(user: User, db: Session) -> Creator:
    """Helper to ensure creator record exists and belongs to current user."""
    creator = db.scalar(select(Creator).where(Creator.user_id == user.user_id))
    if not creator:
        creator = Creator(
            user_id=user.user_id,
            creator_name=user.name,
            bio="Digital content creator & storyteller.",
        )
        db.add(creator)
        db.commit()
        db.refresh(creator)
    return creator


def _ensure_creator_data(creator: Creator, db: Session) -> SocialAccount:
    """Ensure at least one social account (YouTube) and sample/live posts are synced."""
    account = db.scalar(
        select(SocialAccount).where(
            SocialAccount.creator_id == creator.creator_id,
            SocialAccount.platform == "youtube",
        )
    )
    if not account or not account.posts:
        account = sync_youtube_channel_to_db(db, creator.creator_id, "@techcreator")
    return account


class SyncRequest(BaseModel):
    channel_handle: Optional[str] = "@techcreator"
    api_key: Optional[str] = None


@router.post("/youtube/sync")
def sync_youtube(
    data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Synchronize YouTube channel metrics and video statistics."""
    creator = _get_or_create_creator(current_user, db)
    account = sync_youtube_channel_to_db(
        db,
        creator.creator_id,
        channel_handle=data.channel_handle or "@techcreator",
        api_key=data.api_key,
    )
    return {
        "status": "success",
        "message": f"Channel {account.username} synced successfully",
        "platform": account.platform,
        "followers": account.followers,
        "total_posts": len(account.posts),
    }


@router.get("/overview")
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Overall creator metrics: total posts, total views, likes, avg engagement."""
    creator = _get_or_create_creator(current_user, db)
    account = _ensure_creator_data(creator, db)

    posts = db.scalars(
        select(Post).where(Post.account_id == account.account_id)
    ).all()

    total_posts = len(posts)
    total_views = 0
    total_likes = 0
    total_comments = 0
    total_shares = 0
    engagement_rates = []

    for p in posts:
        if p.analytics:
            total_views += p.analytics.views
            total_likes += p.analytics.likes
            total_comments += p.analytics.comments
            total_shares += p.analytics.shares
            if p.analytics.engagement_rate is not None:
                engagement_rates.append(p.analytics.engagement_rate)

    avg_engagement = round(sum(engagement_rates) / max(len(engagement_rates), 1), 2)

    return {
        "platform": account.platform,
        "channel_name": account.username,
        "subscribers": account.followers,
        "total_posts": total_posts,
        "total_views": total_views,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "avg_engagement_rate": avg_engagement,
        "est_revenue": round(total_views * 0.0028, 2),  # Estimated CPM based revenue
    }


@router.get("/posts")
def get_posts(
    sort_by: str = Query("published_at", regex="^(published_at|views|likes|engagement_rate)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve post-level analytics with customizable sorting."""
    creator = _get_or_create_creator(current_user, db)
    account = _ensure_creator_data(creator, db)

    posts = db.scalars(
        select(Post).where(Post.account_id == account.account_id)
    ).all()

    items = []
    for p in posts:
        a = p.analytics
        items.append({
            "post_id": p.post_id,
            "platform_post_id": p.platform_post_id,
            "title": p.caption or "Untitled Video",
            "content_type": p.content_type,
            "thumbnail_url": p.thumbnail_url,
            "post_url": p.post_url,
            "published_at": p.published_at.isoformat() if p.published_at else None,
            "views": a.views if a else 0,
            "likes": a.likes if a else 0,
            "comments": a.comments if a else 0,
            "shares": a.shares if a else 0,
            "reach": a.reach if a and a.reach else 0,
            "impressions": a.impressions if a and a.impressions else 0,
            "watch_time_hours": a.watch_time if a and a.watch_time else 0,
            "engagement_rate": a.engagement_rate if a and a.engagement_rate else 0.0,
        })

    reverse = (order == "desc")
    if sort_by in ("views", "likes", "engagement_rate"):
        items.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
    else:
        items.sort(key=lambda x: x.get("published_at") or "", reverse=reverse)

    return items


@router.get("/posts/top")
def get_top_posts(
    limit: int = 4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve top-performing posts by views and engagement."""
    creator = _get_or_create_creator(current_user, db)
    account = _ensure_creator_data(creator, db)

    posts = db.scalars(
        select(Post).where(Post.account_id == account.account_id)
    ).all()

    items = []
    for p in posts:
        a = p.analytics
        items.append({
            "post_id": p.post_id,
            "platform_post_id": p.platform_post_id,
            "title": p.caption or "Untitled Video",
            "thumbnail_url": p.thumbnail_url,
            "post_url": p.post_url,
            "published_at": p.published_at.strftime("%b %d, %Y") if p.published_at else "Recent",
            "views": a.views if a else 0,
            "likes": a.likes if a else 0,
            "comments": a.comments if a else 0,
            "shares": a.shares if a else 0,
            "engagement_rate": a.engagement_rate if a and a.engagement_rate else 0.0,
        })

    items.sort(key=lambda x: x["views"], reverse=True)
    return items[:limit]


@router.get("/posts/compare")
def compare_posts(
    post_ids: str = Query(..., description="Comma separated post IDs, e.g. 1,2"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Side-by-side post performance comparison."""
    creator = _get_or_create_creator(current_user, db)
    account = _ensure_creator_data(creator, db)

    try:
        ids = [int(i.strip()) for i in post_ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid post IDs format")

    if len(ids) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Please select at least 2 posts to compare")

    posts = db.scalars(
        select(Post).where(
            Post.post_id.in_(ids),
            Post.account_id == account.account_id,
        )
    ).all()

    if len(posts) < 2:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="One or more specified posts were not found")

    compared_items = []
    for p in posts:
        a = p.analytics
        compared_items.append({
            "post_id": p.post_id,
            "title": p.caption or "Untitled",
            "thumbnail_url": p.thumbnail_url,
            "published_at": p.published_at.strftime("%d %b %Y") if p.published_at else "N/A",
            "views": a.views if a else 0,
            "likes": a.likes if a else 0,
            "comments": a.comments if a else 0,
            "shares": a.shares if a else 0,
            "engagement_rate": a.engagement_rate if a and a.engagement_rate else 0.0,
        })

    # Metric comparison winner summary
    p1 = compared_items[0]
    p2 = compared_items[1]
    diff_views = p1["views"] - p2["views"]
    diff_eng = round(p1["engagement_rate"] - p2["engagement_rate"], 2)

    return {
        "compared_posts": compared_items,
        "summary": {
            "views_leader": p1["title"] if diff_views >= 0 else p2["title"],
            "views_difference": abs(diff_views),
            "engagement_leader": p1["title"] if diff_eng >= 0 else p2["title"],
            "engagement_difference": abs(diff_eng),
        },
    }


@router.get("/audience")
def get_audience_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audience growth history and demographic breakdown."""
    creator = _get_or_create_creator(current_user, db)
    account = _ensure_creator_data(creator, db)

    records = db.scalars(
        select(AudienceAnalytics)
        .where(AudienceAnalytics.account_id == account.account_id)
        .order_by(AudienceAnalytics.date.asc())
    ).all()

    growth_history = []
    for r in records:
        growth_history.append({
            "date": r.date.strftime("%d %b"),
            "followers": r.followers or 0,
            "impressions": r.impressions or 0,
            "reach": r.reach or 0,
        })

    latest = records[-1] if records else None
    demographics = {
        "gender": [
            {"name": "Male", "value": latest.male_percentage if latest else 64.5, "color": "#6d4ae8"},
            {"name": "Female", "value": latest.female_percentage if latest else 35.5, "color": "#22c55e"},
        ],
        "age_brackets": [
            ["18-24", 38],
            ["25-34", 44],
            ["35-44", 12],
            ["45+", 6],
        ],
        "top_locations": [
            ["India", 48],
            ["United States", 24],
            ["United Kingdom", 14],
            ["Others", 14],
        ],
        "peak_activity": latest.active_hours.get("peak", "18:00 - 21:00") if latest and latest.active_hours else "18:00 - 21:00",
    }

    return {
        "current_followers": account.followers,
        "growth_history": growth_history,
        "demographics": demographics,
    }
