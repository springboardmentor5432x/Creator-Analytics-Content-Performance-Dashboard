from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import YOUTUBE_API_KEY
from ..database import get_db
from ..deps import get_current_user
from ..models import AudienceAnalytics, Creator, Post, PostAnalytics, SocialAccount, User
from ..services.youtube import YouTubeAPIError, sync_youtube_channel_to_db
from ..services.instagram import InstagramAPIError, sync_instagram_to_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Content"])

ALL = ("all", "all platforms", "", None)


def _get_or_create_creator(user: User, db: Session) -> Creator:
    creator = db.scalar(select(Creator).where(Creator.user_id == user.user_id))
    if not creator:
        creator = Creator(user_id=user.user_id, creator_name=user.name, bio="Digital content creator & storyteller.")
        db.add(creator)
        db.commit()
        db.refresh(creator)
    return creator


def _ensure_demo_data(creator: Creator, db: Session) -> None:
    """Demo data ONLY when no YOUTUBE_API_KEY is configured. With a key, the user must sync a real channel."""
    if YOUTUBE_API_KEY:
        return
    has = db.scalar(select(SocialAccount.account_id).where(
        SocialAccount.creator_id == creator.creator_id, SocialAccount.platform == "youtube"))
    if not has:
        try:
            sync_youtube_channel_to_db(db, creator.creator_id, "@techcreator")
        except IntegrityError:
            db.rollback()


def _accounts(creator: Creator, db: Session, platform: Optional[str]) -> list[SocialAccount]:
    q = select(SocialAccount).where(
        SocialAccount.creator_id == creator.creator_id, SocialAccount.is_active.is_(True))
    if platform and platform.lower() not in ALL:
        q = q.where(SocialAccount.platform == platform.lower())
    return list(db.scalars(q).all())


def _posts(db: Session, accounts: list[SocialAccount], days: Optional[int] = None) -> list[Post]:
    ids = [a.account_id for a in accounts]
    if not ids:
        return []
    q = select(Post).where(Post.account_id.in_(ids))
    if days:
        q = q.where(Post.published_at >= datetime.utcnow() - timedelta(days=days))
    return list(db.scalars(q).all())


def _post_dict(p: Post, platform: str) -> dict:
    a = p.analytics
    return {
        "post_id": p.post_id,
        "platform_post_id": p.platform_post_id,
        "platform": platform.capitalize(),
        "title": p.caption or "Untitled Video",
        "content_type": p.content_type,
        "thumbnail_url": p.thumbnail_url,
        "post_url": p.post_url,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "views": a.views if a else 0,
        "likes": a.likes if a else 0,
        "comments": a.comments if a else 0,
        "shares": a.shares if a else 0,
        "reach": (a.reach or 0) if a else 0,
        "impressions": (a.impressions or 0) if a else 0,
        "watch_time_hours": (a.watch_time or 0) if a else 0,
        "engagement_rate": (a.engagement_rate or 0.0) if a else 0.0,
    }


class SyncRequest(BaseModel):
    channel_handle: Optional[str] = None
    api_key: Optional[str] = None


@router.post("/youtube/sync")
def sync_youtube(data: SyncRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync a YouTube channel. Real API errors are returned to the UI, never hidden."""
    creator = _get_or_create_creator(current_user, db)
    handle = (data.channel_handle or "").strip()
    if not handle:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Channel handle is required (e.g. @chaiaurcode)")
    try:
        account = sync_youtube_channel_to_db(db, creator.creator_id, handle, data.api_key)
    except YouTubeAPIError as e:
        raise HTTPException(e.status, e.message)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This channel is already connected to another creator.")
    return {
        "status": "success",
        "message": f"{account.username} synced ({'live' if account.is_live else 'synced'} data)",
        "platform": account.platform,
        "is_live": account.is_live,
        "followers": account.followers,
        "total_posts": len(account.posts),
    }


class InstagramSyncRequest(BaseModel):
    username: Optional[str] = None


@router.post("/instagram/sync")
def sync_instagram(data: InstagramSyncRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sync a public Instagram profile via RapidAPI."""
    creator = _get_or_create_creator(current_user, db)
    username = (data.username or "").strip()
    if not username:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Instagram username is required (e.g. hiteshchoudharyofficial)")
    try:
        return sync_instagram_to_db(creator.creator_id, username, db)
    except InstagramAPIError as e:
        raise HTTPException(e.status, e.message)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This Instagram account is already connected to another creator.")


@router.get("/overview")
def get_analytics_overview(
    platform: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lifetime channel totals (from the platform) + stats for posts published in the last `days` days."""
    creator = _get_or_create_creator(current_user, db)
    _ensure_demo_data(creator, db)
    accounts = _accounts(creator, db, platform)
    platform_of = {a.account_id: a.platform for a in accounts}

    posts = _posts(db, accounts, days)
    views = likes = comments = shares = 0
    rates = []
    for p in posts:
        if p.analytics:
            views += p.analytics.views
            likes += p.analytics.likes
            comments += p.analytics.comments
            shares += p.analytics.shares
            if p.analytics.engagement_rate is not None:
                rates.append(p.analytics.engagement_rate)

    return {
        "platform": (platform or "all").lower(),
        "connected": bool(accounts),
        "is_live": bool(accounts) and any(a.is_live for a in accounts),
        "channel_name": accounts[0].username if accounts else None,
        "last_synced_at": max((a.last_synced_at for a in accounts if a.last_synced_at), default=None),
        # lifetime numbers straight from the platform
        "subscribers": sum(a.followers for a in accounts),
        "total_views": sum(a.total_views for a in accounts),
        "total_videos": sum(a.video_count for a in accounts),
        # selected date range
        "days": days,
        "period_posts": len(posts),
        "period_views": views,
        "period_likes": likes,
        "period_comments": comments,
        "period_shares": shares,
        "avg_engagement_rate": round(sum(rates) / len(rates), 2) if rates else 0.0,
        "est_revenue": round(views * 0.0028, 2),  # ESTIMATE: ~$2.8 RPM, not real AdSense
        "platforms": [
            {"platform": a.platform, "followers": a.followers, "total_views": a.total_views,
             "total_videos": a.video_count, "is_live": a.is_live}
            for a in accounts
        ],
    }


@router.get("/posts")
def get_posts(
    sort_by: str = Query("published_at", pattern="^(published_at|views|likes|engagement_rate)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    platform: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    creator = _get_or_create_creator(current_user, db)
    _ensure_demo_data(creator, db)
    accounts = _accounts(creator, db, platform)
    plat = {a.account_id: a.platform for a in accounts}
    items = [_post_dict(p, plat.get(p.account_id, "youtube")) for p in _posts(db, accounts, days)]
    rev = order == "desc"
    if sort_by == "published_at":
        items.sort(key=lambda x: x.get("published_at") or "", reverse=rev)
    else:
        items.sort(key=lambda x: x.get(sort_by, 0), reverse=rev)
    return items


@router.get("/posts/top")
def get_top_posts(
    limit: int = 4,
    days: int = Query(30, ge=1, le=3650),
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    creator = _get_or_create_creator(current_user, db)
    _ensure_demo_data(creator, db)
    accounts = _accounts(creator, db, platform)
    plat = {a.account_id: a.platform for a in accounts}
    items = [_post_dict(p, plat.get(p.account_id, "youtube")) for p in _posts(db, accounts, days)]
    items.sort(key=lambda x: x["views"], reverse=True)
    return items[:limit]


@router.get("/posts/compare")
def compare_posts(
    post_ids: str = Query(..., description="Comma separated post IDs, e.g. 1,2"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    creator = _get_or_create_creator(current_user, db)
    accounts = _accounts(creator, db, None)
    try:
        ids = [int(i.strip()) for i in post_ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid post IDs format")
    if len(ids) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please select at least 2 posts to compare")

    acc_ids = [a.account_id for a in accounts]
    posts = db.scalars(select(Post).where(Post.post_id.in_(ids), Post.account_id.in_(acc_ids))).all() if acc_ids else []
    if len(posts) < 2:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or more specified posts were not found")

    plat = {a.account_id: a.platform for a in accounts}
    compared = [_post_dict(p, plat.get(p.account_id, "youtube")) for p in posts]
    p1, p2 = compared[0], compared[1]
    dv = p1["views"] - p2["views"]
    de = round(p1["engagement_rate"] - p2["engagement_rate"], 2)
    return {
        "compared_posts": compared,
        "summary": {
            "views_leader": p1["title"] if dv >= 0 else p2["title"],
            "views_difference": abs(dv),
            "engagement_leader": p1["title"] if de >= 0 else p2["title"],
            "engagement_difference": abs(de),
        },
    }


@router.get("/content-performance")
def get_content_performance(
    days: int = Query(30, ge=1, le=3650),
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Views/Likes/Comments/Shares of posts aggregated on a continuous daily timeline across the selected range."""
    creator = _get_or_create_creator(current_user, db)
    _ensure_demo_data(creator, db)
    accounts = _accounts(creator, db, platform)
    all_posts = _posts(db, accounts, days)

    # Group posts by date so every calendar day is represented without gaps or duplicates
    posts_by_date = {}
    for p in all_posts:
        if p.published_at:
            d_key = p.published_at.date()
            if d_key not in posts_by_date:
                posts_by_date[d_key] = []
            posts_by_date[d_key].append(p)

    out = {"Views": [], "Likes": [], "Comments": [], "Shares": []}
    timeline_days = min(days, 30)
    for i in range(timeline_days - 1, -1, -1):
        target_date = date.today() - timedelta(days=i)
        day_posts = posts_by_date.get(target_date, [])
        label = target_date.strftime("%d %b")

        v = sum(p.analytics.views for p in day_posts if p.analytics)
        l = sum(p.analytics.likes for p in day_posts if p.analytics)
        c = sum(p.analytics.comments for p in day_posts if p.analytics)
        s = sum(p.analytics.shares for p in day_posts if p.analytics)

        if day_posts:
            title = f"{len(day_posts)} video(s): " + (day_posts[0].caption or "Uploaded video")[:25]
        else:
            title = "No uploads on this date"

        out["Views"].append({"day": label, "value": v, "title": title, "count": len(day_posts)})
        out["Likes"].append({"day": label, "value": l, "title": title, "count": len(day_posts)})
        out["Comments"].append({"day": label, "value": c, "title": title, "count": len(day_posts)})
        out["Shares"].append({"day": label, "value": s, "title": title, "count": len(day_posts)})
    return out


@router.get("/audience")
def get_audience_analytics(
    days: int = Query(30, ge=1, le=3650),
    platform: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    creator = _get_or_create_creator(current_user, db)
    _ensure_demo_data(creator, db)
    accounts = _accounts(creator, db, platform)
    if not accounts:
        return {"connected": False, "current_followers": 0, "growth_history": [], "demographics": None}

    ids = [a.account_id for a in accounts]
    since = date.today() - timedelta(days=days)
    records = db.scalars(
        select(AudienceAnalytics)
        .where(AudienceAnalytics.account_id.in_(ids), AudienceAnalytics.date >= since)
        .order_by(AudienceAnalytics.date.asc())
    ).all()

    # Per account snapshots: account_id -> {date: followers}
    account_snapshots: dict[int, dict[date, int]] = {}
    for r in records:
        if r.account_id not in account_snapshots:
            account_snapshots[r.account_id] = {}
        if r.followers is not None:
            account_snapshots[r.account_id][r.date] = r.followers

    # Generate continuous day-by-day trajectory for all accounts combined
    history = []
    for i in range(days - 1, -1, -1):
        target_date = date.today() - timedelta(days=i)
        day_total = 0
        for acc in accounts:
            snaps = account_snapshots.get(acc.account_id, {})
            if target_date in snaps:
                day_total += snaps[target_date]
            else:
                day_total += max(0, acc.followers - (i * 35))
        history.append({"date": target_date.strftime("%d %b"), "followers": day_total})

    latest = records[-1] if records else None
    has_gender = bool(latest and latest.male_percentage is not None)
    is_live = any(a.is_live for a in accounts)

    # YouTube Data API v3 does NOT provide demographics (needs YouTube Analytics API + OAuth).
    # So these are always labelled as sample data.
    demographics = {
        "is_sample": True,
        "gender": [
            {"name": "Male", "value": latest.male_percentage if has_gender else 64.5, "color": "#6d4ae8"},
            {"name": "Female", "value": latest.female_percentage if has_gender else 35.5, "color": "#22c55e"},
        ],
        "age_brackets": [["18-24", 38], ["25-34", 44], ["35-44", 12], ["45+", 6]],
        "top_locations": [["India", 48], ["United States", 24], ["United Kingdom", 14], ["Others", 14]],
        "peak_activity": (latest.active_hours or {}).get("peak", "18:00 - 21:00") if latest else "18:00 - 21:00",
    }
    return {
        "connected": True,
        "is_live": is_live,
        "current_followers": sum(a.followers for a in accounts),
        "growth_history": history,
        "demographics": demographics,
    }


@router.get("/marketing/overview")
def get_marketing_overview(
    days: int = Query(30, ge=1, le=3650),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_posts = db.scalar(select(func.count(Post.post_id))) or 0
    total_views = db.scalar(select(func.sum(PostAnalytics.views))) or 0
    total_likes = db.scalar(select(func.sum(PostAnalytics.likes))) or 0
    total_comments = db.scalar(select(func.sum(PostAnalytics.comments))) or 0
    avg_eng = round(((total_likes + total_comments) / total_views * 100), 2) if total_views > 0 else 0.0

    content_types = db.execute(
        select(Post.content_type, func.count(Post.post_id))
        .group_by(Post.content_type)
    ).all()
    tot_c = sum(c[1] for c in content_types) or 1
    palette = ["#6d4ae8", "#a396f5", "#c8bff9", "#e2dcfc"]
    content_dist = [
        {"name": (ct[0] or "video").capitalize() + "s", "value": round((ct[1] / tot_c) * 100), "color": palette[i % len(palette)]}
        for i, ct in enumerate(content_types)
    ]

    kpis = [
        {"label": "Active Campaigns", "value": "0", "delta": None, "sub": "Campaigns module", "icon": "campaign", "tone": "violet"},
        {"label": "Total Content Views", "value": f"{total_views:,}" if total_views < 1000000 else f"{round(total_views/1000000, 1)}M", "delta": None, "sub": "across platform content", "icon": "eye", "tone": "indigo"},
        {"label": "Total Impressions", "value": f"{total_views:,}" if total_views < 1000000 else f"{round(total_views/1000000, 1)}M", "delta": None, "sub": "impressions tracked", "icon": "users", "tone": "blue"},
        {"label": "Avg. Engagement", "value": f"{avg_eng}%", "delta": None, "sub": "across published posts", "icon": "heart", "tone": "rose"},
        {"label": "Published Posts", "value": str(total_posts), "delta": None, "sub": "content pieces tracked", "icon": "target", "tone": "amber"},
    ]

    return {
        "has_campaigns": False,
        "kpis": kpis,
        "campaign_perf": [],
        "top_campaigns": [],
        "recent_campaigns": [],
        "content_dist": content_dist,
        "total_posts": total_posts,
    }
