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
        .filter(
            SocialAccount.creator_profile_id == profile_id,
            ~SocialAccount.platform.ilike("tiktok"),
        )
    )


def money(value: Decimal | int | float) -> float:
    return round(float(value or 0), 2)


ALL_CONTENT_METRICS = (
    "views", "likes", "comments", "shares", "saves",
    "watch_time_seconds", "reach", "impressions",
)


def _available(metric: ContentMetric) -> set[str]:
    """Legacy rows predate metric availability; treat those as fully populated."""
    return set(metric.metrics_available or ALL_CONTENT_METRICS)


def _data_source(accounts: list[SocialAccount]) -> str:
    if not accounts:
        return "none"
    connected = [account.is_connected for account in accounts]
    if all(connected):
        return "live"
    if not any(connected):
        return "demo"
    return "mixed"


@router.get("/summary")
def summary(
    days: int = Query(default=7, ge=7, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("dashboard:read", "analytics:read")),
):
    profile = get_profile(db, user)
    if profile is None:
        return {
            "followers": 0,
            "views_7d": 0,
            "views_period": 0,
            "selected_days": days,
            "total_engagements": 0,
            "engagement_rate": 0,
            "engagement_rate_period": 0,
            "revenue_mtd": 0,
            "revenue_by_currency": [],
            "posts_count": 0,
            "platforms_count": 0,
            "demo_data": False,
            "data_source": "none",
            "data_status": "no_creator_profile_for_role",
            "metric_availability": {
                "views": False,
                "engagement_rate": False,
                "total_engagements": False,
                "followers": False,
            },
        }

    accounts = db.query(SocialAccount).filter(
        SocialAccount.creator_profile_id == profile.id,
        ~SocialAccount.platform.ilike("tiktok"),
    ).all()
    today = date.today()
    start = today - timedelta(days=days - 1)
    rows = (
        profile_metrics_query(db, profile.id)
        .filter(ContentMetric.recorded_on >= start, ContentMetric.recorded_on <= today)
        .all()
    )
    last_week_rows = [row for row in rows if row.recorded_on >= today - timedelta(days=6)]
    view_rows = [row for row in rows if "views" in _available(row)]
    week_view_rows = [row for row in last_week_rows if "views" in _available(row)]
    interaction_fields = ("likes", "comments", "shares", "saves")
    engagement_rows = [row for row in rows if set(interaction_fields) & _available(row)]
    week_engagement_rows = [row for row in last_week_rows if set(interaction_fields) & _available(row)]
    total_engagements = sum(
        int(getattr(row, field) or 0)
        for row in engagement_rows
        for field in interaction_fields
        if field in _available(row)
    )
    rates = [row.engagement_rate for row in engagement_rows]
    week_rates = [row.engagement_rate for row in week_engagement_rows]
    posts_count = db.query(ContentPost).join(SocialAccount).filter(
        SocialAccount.creator_profile_id == profile.id,
        ~SocialAccount.platform.ilike("tiktok"),
    ).count()
    month_start = date.today().replace(day=1)
    revenue = db.query(RevenueRecord).filter(RevenueRecord.creator_profile_id == profile.id, RevenueRecord.recorded_on >= month_start).all()
    revenue_by_currency: dict[str, Decimal] = defaultdict(Decimal)
    for record in revenue:
        revenue_by_currency[record.currency] += record.amount
    source = _data_source(accounts)
    single_currency_total = (
        money(next(iter(revenue_by_currency.values())))
        if len(revenue_by_currency) == 1
        else (0 if not revenue_by_currency else None)
    )
    return {
        "followers": sum(account.followers_count for account in accounts),
        "views_7d": sum(row.views for row in week_view_rows),
        "views_period": sum(row.views for row in view_rows),
        "selected_days": days,
        "total_engagements": total_engagements,
        "engagement_rate": round(sum(week_rates) / len(week_rates), 2) if week_rates else 0,
        "engagement_rate_period": round(sum(rates) / len(rates), 2) if rates else 0,
        # Currency totals are kept separate. A single scalar is only returned
        # when the Creator has recorded exactly one currency.
        "revenue_mtd": single_currency_total,
        "revenue_by_currency": [
            {"currency": currency, "amount": money(amount)}
            for currency, amount in sorted(revenue_by_currency.items())
        ],
        "posts_count": posts_count,
        "platforms_count": len(accounts),
        "demo_data": source == "demo",
        "data_source": source,
        "data_status": "ok" if accounts else "no_connected_accounts",
        "metric_availability": {
            "views": bool(view_rows),
            "engagement_rate": bool(engagement_rows),
            "total_engagements": bool(engagement_rows),
            "followers": bool(accounts),
        },
    }


@router.get("/trends")
def trends(days: int = Query(default=7, ge=7, le=90), db: Session = Depends(get_db), user: User = Depends(require_permissions("dashboard:read", "analytics:read"))):
    profile = get_profile(db, user)
    if profile is None:
        return {"days": [], "data_source": "none", "metric_availability": {"views": False, "engagement_rate": False}}
    start = date.today() - timedelta(days=days - 1)
    rows = (
        profile_metrics_query(db, profile.id)
        .filter(ContentMetric.recorded_on >= start, ContentMetric.recorded_on <= date.today())
        .all()
    )
    interaction_fields = {"likes", "comments", "shares", "saves"}
    totals: dict[date, dict[str, float]] = defaultdict(lambda: {"views": 0, "engagement": 0, "count": 0})
    for row in rows:
        available = _available(row)
        if "views" in available:
            totals[row.recorded_on]["views"] += row.views
        if interaction_fields & available:
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
    accounts = db.query(SocialAccount).filter(
        SocialAccount.creator_profile_id == profile.id,
        ~SocialAccount.platform.ilike("tiktok"),
    ).all()
    return {
        "days": result,
        "data_source": _data_source(accounts),
        "metric_availability": {
            "views": any("views" in _available(row) for row in rows),
            "engagement_rate": any(interaction_fields & _available(row) for row in rows),
        },
    }


@router.get("/platforms")
def platforms(
    days: int = Query(default=7, ge=7, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("dashboard:read", "analytics:read")),
):
    profile = get_profile(db, user)
    if profile is None:
        return {"platforms": [], "data_source": "none", "metric_availability": {"views": False, "followers": False}}
    accounts = db.query(SocialAccount).filter(
        SocialAccount.creator_profile_id == profile.id,
        ~SocialAccount.platform.ilike("tiktok"),
    ).all()
    today = date.today()
    start = today - timedelta(days=days - 1)
    week_start = today - timedelta(days=6)
    rows = (
        db.query(
            ContentMetric.views,
            ContentMetric.metrics_available,
            ContentPost.social_account_id,
            ContentMetric.recorded_on,
        )
        .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(
            SocialAccount.creator_profile_id == profile.id,
            ~SocialAccount.platform.ilike("tiktok"),
            ContentMetric.recorded_on >= start,
            ContentMetric.recorded_on <= today,
        )
        .all()
    )
    views_by_account: dict[int, int] = defaultdict(int)
    week_views_by_account: dict[int, int] = defaultdict(int)
    views_seen: set[int] = set()
    week_views_seen: set[int] = set()
    for views, metrics_available, account_id, recorded_on in rows:
        if "views" in set(metrics_available or ALL_CONTENT_METRICS):
            views_by_account[account_id] += views
            views_seen.add(account_id)
            if recorded_on >= week_start:
                week_views_by_account[account_id] += views
                week_views_seen.add(account_id)
    output = []
    for account in accounts:
        output.append({
            "platform": account.platform,
            "handle": account.handle,
            "followers": account.followers_count,
            "views_7d": week_views_by_account[account.id],
            "views_period": views_by_account[account.id],
            "selected_days": days,
            "connected": account.is_connected,
            "data_source": "live" if account.is_connected else "demo",
            "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
            "metric_availability": {
                "views": account.id in views_seen,
                "views_7d": account.id in week_views_seen,
                "followers": True,
            },
        })
    output.sort(key=lambda row: row["views_period"], reverse=True)
    return {
        "platforms": output,
        "data_source": _data_source(accounts),
        "metric_availability": {"views": bool(views_seen), "followers": bool(accounts)},
    }


@router.get("/top-content")
def top_content(
    limit: int = Query(default=5, ge=1, le=20),
    days: int = Query(default=7, ge=7, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("dashboard:read", "analytics:read")),
):
    profile = get_profile(db, user)
    if profile is None:
        return {"posts": [], "data_source": "none", "metric_availability": {"views": False, "engagement_rate": False}}
    today = date.today()
    start = today - timedelta(days=days - 1)
    week_start = today - timedelta(days=6)
    metrics = (
        profile_metrics_query(db, profile.id)
        .filter(ContentMetric.recorded_on >= start, ContentMetric.recorded_on <= today)
        .all()
    )
    interaction_fields = {"likes", "comments", "shares", "saves"}
    views_by_post: dict[int, int] = defaultdict(int)
    week_views_by_post: dict[int, int] = defaultdict(int)
    engagement_by_post: dict[int, list[float]] = defaultdict(list)
    views_seen: set[int] = set()
    week_views_seen: set[int] = set()
    engagement_seen: set[int] = set()
    for metric in metrics:
        available = _available(metric)
        if "views" in available:
            views_by_post[metric.content_post_id] += metric.views
            views_seen.add(metric.content_post_id)
            if metric.recorded_on >= week_start:
                week_views_by_post[metric.content_post_id] += metric.views
                week_views_seen.add(metric.content_post_id)
        if interaction_fields & available:
            engagement_by_post[metric.content_post_id].append(metric.engagement_rate)
            engagement_seen.add(metric.content_post_id)
    posts = db.query(ContentPost, SocialAccount.platform).join(SocialAccount).filter(
        SocialAccount.creator_profile_id == profile.id,
        ~SocialAccount.platform.ilike("tiktok"),
    ).all()
    result = []
    for post, platform in posts:
        result.append({
            "id": post.id,
            "title": post.title,
            "platform": platform,
            "content_type": post.content_type,
            "views_7d": week_views_by_post[post.id],
            "views_period": views_by_post[post.id],
            "selected_days": days,
            "engagement_rate": round(sum(engagement_by_post[post.id]) / len(engagement_by_post[post.id]), 2) if engagement_by_post[post.id] else 0,
            "metric_availability": {
                "views": post.id in views_seen,
                "views_7d": post.id in week_views_seen,
                "engagement_rate": post.id in engagement_seen,
            },
        })
    result.sort(key=lambda row: row["views_period"], reverse=True)
    accounts = db.query(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
    return {
        "posts": result[:limit],
        "data_source": _data_source(accounts),
        "metric_availability": {
            "views": bool(views_seen),
            "engagement_rate": bool(engagement_seen),
        },
    }
