from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.public_analytics import (
    public_youtube_audience,
    public_youtube_content_analytics,
    public_youtube_growth,
)
from app.models import (
    AccountMetric,
    AudienceInsight,
    ContentMetric,
    ContentPost,
    ContentSnapshot,
    CreatorProfile,
    SocialAccount,
    User,
)

router = APIRouter(prefix="/analytics", tags=["Content and audience analytics"])


def _profile(db: Session, user: User) -> CreatorProfile | None:
    if user.role != "creator":
        return None
    return db.query(CreatorProfile).filter_by(user_id=user.id).first()


def _accounts(
    db: Session,
    profile_id: int,
    platform: str | None = None,
    mode: Literal["live", "demo"] = "live",
) -> list[SocialAccount]:
    query = db.query(SocialAccount).filter_by(creator_profile_id=profile_id)
    query = query.filter(~SocialAccount.platform.ilike("tiktok"))
    if platform:
        query = query.filter(SocialAccount.platform.ilike(platform.strip()))
    query = query.filter(SocialAccount.is_connected.is_(mode == "live"))
    return query.all()


def _date_window(days: int) -> date:
    return date.today() - timedelta(days=days - 1)


def _account_ids(accounts: list[SocialAccount]) -> list[int]:
    return [account.id for account in accounts]


def _content_rows(db: Session, accounts: list[SocialAccount]) -> list[tuple[ContentPost, SocialAccount]]:
    ids = _account_ids(accounts)
    if not ids:
        return []
    return (
        db.query(ContentPost, SocialAccount)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(ContentPost.social_account_id.in_(ids))
        .all()
    )


@router.get("/content")
def content_analytics(
    days: int = Query(default=30, ge=7, le=90),
    platform: str | None = Query(default=None, max_length=30),
    mode: Literal["live", "demo"] = Query(default="live"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    public_youtube = public_youtube_content_analytics(
        db, user, platform, mode
    )
    profile = _profile(db, user)
    if profile is None:
        return {
            "days": days,
            "totals": {},
            "posts": [],
            "is_demo": False,
            "data_source": (
                "youtube_public"
                if public_youtube["creator_count"]
                else "none"
            ),
            "public_youtube": public_youtube,
        }
    accounts = _accounts(db, profile.id, platform, mode)
    posts = _content_rows(db, accounts)
    start = _date_window(days)
    result = []
    totals = defaultdict(int)
    totals_availability = defaultdict(bool)
    total_engagement_numerator = 0
    total_engagement_denominator = 0
    has_any_engagement_data = False
    source_flags = set()
    for post, account in posts:
        metric_rows = (
            db.query(ContentMetric)
            .filter(ContentMetric.content_post_id == post.id, ContentMetric.recorded_on >= start)
            .order_by(ContentMetric.recorded_on)
            .all()
        )
        all_rows = db.query(ContentMetric).filter(ContentMetric.content_post_id == post.id).all()
        snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one_or_none()
        fields = ["views", "likes", "comments", "shares", "saves", "watch_time_seconds", "reach", "impressions"]
        row_availability = {
            field for row in metric_rows for field in (row.metrics_available or [])
        }
        sums = {
            field: sum(
                int(getattr(row, field) or 0)
                for row in metric_rows
                if field in (row.metrics_available or [])
            )
            for field in fields
        }
        for field in fields:
            totals[field] += sums[field]
            totals_availability[field] = totals_availability[field] or field in row_availability
        engagement_numerator = 0
        engagement_denominator = 0
        has_engagement_data = False
        for row in metric_rows:
            row_available = set(row.metrics_available or [])
            denominator_field = next(
                (
                    field for field in ("views", "reach", "impressions")
                    if field in row_available and int(getattr(row, field) or 0) > 0
                ),
                None,
            ) or next(
                (field for field in ("views", "reach", "impressions") if field in row_available),
                None,
            )
            interactions_available = [
                field for field in ("likes", "comments", "shares", "saves")
                if field in row_available
            ]
            if denominator_field is None or not interactions_available:
                continue
            engagement_denominator += int(getattr(row, denominator_field) or 0)
            engagement_numerator += sum(int(getattr(row, field) or 0) for field in interactions_available)
            has_engagement_data = True
        total_engagement_denominator += engagement_denominator
        total_engagement_numerator += engagement_numerator
        has_any_engagement_data = has_any_engagement_data or has_engagement_data
        engagement = (
            round(engagement_numerator * 100 / engagement_denominator, 2)
            if has_engagement_data and engagement_denominator
            else (0.0 if has_engagement_data else None)
        )
        source_flags.add("live" if account.is_connected else "demo")
        latest_metric = max(all_rows, key=lambda row: row.recorded_on, default=None)
        available_for_post = {field: field in row_availability for field in fields}
        available_for_post["engagement_rate"] = engagement is not None
        result.append({
            "id": post.id,
            "title": post.title,
            "platform": account.platform,
            "handle": account.handle,
            "content_type": post.content_type,
            "post_url": post.post_url,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "views_period": sums["views"],
            "likes_period": sums["likes"],
            "comments_period": sums["comments"],
            "shares_period": sums["shares"],
            "saves_period": sums["saves"],
            "watch_time_seconds_period": sums["watch_time_seconds"],
            "reach_period": sums["reach"],
            "impressions_period": sums["impressions"],
            "views_total": snapshot.latest_views if snapshot else sum(row.views for row in all_rows),
            "likes_total": snapshot.latest_likes if snapshot else sum(row.likes for row in all_rows),
            "comments_total": snapshot.latest_comments if snapshot else sum(row.comments for row in all_rows),
            "engagement_rate": engagement,
            "metric_availability": available_for_post,
            "last_recorded_on": latest_metric.recorded_on.isoformat() if latest_metric else None,
            "source": "live" if account.is_connected else "demo",
        })
    result.sort(key=lambda item: (item["views_period"], item["views_total"]), reverse=True)
    average_engagement = (
        round(total_engagement_numerator * 100 / total_engagement_denominator, 2)
        if has_any_engagement_data and total_engagement_denominator
        else (0.0 if has_any_engagement_data else None)
    )
    all_sources = set(source_flags)
    if public_youtube["creator_count"]:
        all_sources.add("youtube_public")

    return {
        "days": days,
        "platform": platform,
        "totals": {**dict(totals), "posts_count": len(result), "average_engagement_rate": average_engagement},
        "posts": result,
        "public_youtube": public_youtube,
        "is_demo": bool(source_flags) and source_flags == {"demo"},
        "data_source": "mixed" if len(all_sources) > 1 else next(iter(all_sources), "none"),
        "metric_availability": {
            field: any(bool(item.get("metric_availability", {}).get(field)) for item in result)
            for field in ["views", "likes", "comments", "shares", "saves", "watch_time_seconds", "reach", "impressions", "engagement_rate"]
        },
    }


@router.get("/audience")
def audience_analytics(
    platform: str | None = Query(default=None, max_length=30),
    mode: Literal["live", "demo"] = Query(default="live"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    public_youtube = public_youtube_audience(db, user, platform, mode)
    profile = _profile(db, user)
    if profile is None:
        return {
            "accounts": [],
            "data_source": (
                "youtube_public" if public_youtube["creators"] else "none"
            ),
            "public_youtube": public_youtube,
        }
    accounts = _accounts(db, profile.id, platform, mode)
    result = []
    sources = set()
    for account in accounts:
        insight = (
            db.query(AudienceInsight)
            .filter_by(social_account_id=account.id)
            .order_by(AudienceInsight.recorded_on.desc())
            .first()
        )
        source = "live" if account.is_connected else "demo"
        sources.add(source)
        insight_available = set(insight.metrics_available or []) if insight else set()
        if insight:
            for field in (
                "age_distribution", "gender_distribution",
                "geographic_distribution", "device_distribution", "active_hours",
            ):
                if getattr(insight, field):
                    insight_available.add(field)
            if not account.is_connected:
                if insight.reach:
                    insight_available.add("reach")
                if insight.impressions:
                    insight_available.add("impressions")
        data = {
            "account_id": account.id,
            "platform": account.platform,
            "handle": account.handle,
            "followers_count": account.followers_count,
            "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
            "source": source,
            "recorded_on": insight.recorded_on.isoformat() if insight else None,
            "age_distribution": insight.age_distribution if insight else {},
            "gender_distribution": insight.gender_distribution if insight else {},
            "geographic_distribution": insight.geographic_distribution if insight else {},
            "device_distribution": insight.device_distribution if insight else {},
            "active_hours": insight.active_hours if insight else {},
            "reach": insight.reach if insight else None,
            "impressions": insight.impressions if insight else None,
            "available_metrics": {
                "age_distribution": "age_distribution" in insight_available,
                "gender_distribution": "gender_distribution" in insight_available,
                "geographic_distribution": "geographic_distribution" in insight_available,
                "device_distribution": "device_distribution" in insight_available,
                "active_hours": "active_hours" in insight_available,
                "reach": "reach" in insight_available,
                "impressions": "impressions" in insight_available,
            },
        }
        result.append(data)
    if public_youtube["creators"]:
        sources.add("youtube_public")

    return {
        "accounts": result,
        "public_youtube": public_youtube,
        "data_source": "mixed" if len(sources) > 1 else next(iter(sources), "none"),
        "note": "Demographics and account insights depend on each platform's granted API permissions. Metrics marked unavailable are not estimated or replaced with zero-valued claims.",
    }


@router.get("/growth")
def growth_trends(
    days: int = Query(default=30, ge=7, le=90),
    platform: str | None = Query(default=None, max_length=30),
    mode: Literal["live", "demo"] = Query(default="live"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    public_youtube = public_youtube_growth(
        db, user, days, platform, mode
    )
    profile = _profile(db, user)
    if profile is None:
        return {
            "days": [],
            "insights": [],
            "data_source": (
                "youtube_public" if public_youtube["creators"] else "none"
            ),
            "public_youtube": public_youtube,
        }
    accounts = _accounts(db, profile.id, platform, mode)
    account_ids = _account_ids(accounts)
    post_account = {
        post.id: account for post, account in _content_rows(db, accounts)
    }
    post_ids = list(post_account)
    start = _date_window(days)
    trend = defaultdict(lambda: {
        "values": defaultdict(int),
        "available": set(),
        "engagement_numerator": 0,
        "engagement_denominator": 0,
    })
    if post_ids:
        metric_rows = db.query(ContentMetric).filter(ContentMetric.content_post_id.in_(post_ids), ContentMetric.recorded_on >= start).all()
        for row in metric_rows:
            bucket = trend[row.recorded_on]
            account = post_account[row.content_post_id]
            available = set(row.metrics_available or [])
            bucket["available"].update(available)
            for field in ("views", "likes", "comments", "shares", "saves", "watch_time_seconds"):
                if field in available:
                    bucket["values"][field] += int(getattr(row, field) or 0)
            denominator_field = next(
                (
                    field for field in ("views", "reach", "impressions")
                    if field in available and int(getattr(row, field) or 0) > 0
                ),
                None,
            ) or next(
                (field for field in ("views", "reach", "impressions") if field in available),
                None,
            )
            interaction_fields = [
                field for field in ("likes", "comments", "shares", "saves")
                if field in available
            ]
            if denominator_field is not None and interaction_fields:
                bucket["engagement_denominator"] += int(getattr(row, denominator_field) or 0)
                bucket["engagement_numerator"] += sum(
                    int(getattr(row, field) or 0) for field in interaction_fields
                )
                bucket["available"].add("engagement_rate")
    if account_ids:
        account_rows = db.query(AccountMetric).filter(AccountMetric.social_account_id.in_(account_ids), AccountMetric.recorded_on >= start).all()
        for row in account_rows:
            bucket = trend[row.recorded_on]
            available = set(row.metrics_available or [])
            if {"followers_gained", "followers_lost"} <= available:
                bucket["values"]["net_followers"] += int(row.followers_gained or 0) - int(row.followers_lost or 0)
                bucket["available"].add("net_followers")
            if {"subscribers_gained", "subscribers_lost"} <= available:
                bucket["values"]["net_subscribers"] += int(row.subscribers_gained or 0) - int(row.subscribers_lost or 0)
                bucket["available"].add("net_subscribers")
    daily = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        bucket = trend[day]
        available = bucket["available"]
        values = bucket["values"]
        engagement_rate = (
            round(bucket["engagement_numerator"] * 100 / bucket["engagement_denominator"], 2)
            if "engagement_rate" in available and bucket["engagement_denominator"]
            else (0.0 if "engagement_rate" in available else None)
        )
        daily.append({
            "date": day.isoformat(),
            "label": day.strftime("%b %d"),
            "views": values["views"] if "views" in available else None,
            "likes": values["likes"] if "likes" in available else None,
            "comments": values["comments"] if "comments" in available else None,
            "shares": values["shares"] if "shares" in available else None,
            "watch_time_seconds": values["watch_time_seconds"] if "watch_time_seconds" in available else None,
            "engagement_rate": engagement_rate,
            "net_followers": values["net_followers"] if "net_followers" in available else None,
            "net_subscribers": values["net_subscribers"] if "net_subscribers" in available else None,
            "metric_availability": {
                field: field in available
                for field in (
                    "views", "net_followers", "net_subscribers",
                    "engagement_rate", "watch_time_seconds",
                )
            },
        })
    sources = {"live" if account.is_connected else "demo" for account in accounts}
    if public_youtube["creators"]:
        sources.add("youtube_public")
    nonzero = [item for item in daily if item["views"] is not None and item["views"] > 0]
    insights = []
    if nonzero:
        best = max(nonzero, key=lambda item: item["views"])
        insights.append({"kind": "top_day", "label": f"Highest-view day: {best['label']}", "value": best["views"]})
        values = [item["views"] for item in daily]
        if values[0] is not None and values[-1] is not None and values[0] > 0:
            change = round((values[-1] - values[0]) * 100 / values[0], 2)
            insights.append({"kind": "views_change", "label": "Change from first to last day in range", "value_percent": change})
    return {
        "days": daily,
        "insights": insights,
        "platform": platform,
        "public_youtube": public_youtube,
        "data_source": "mixed" if len(sources) > 1 else next(iter(sources), "none"),
        "is_demo": bool(sources) and sources == {"demo"},
        "metric_availability": {
            field: any(item["metric_availability"][field] for item in daily)
            for field in ("views", "net_followers", "net_subscribers", "engagement_rate", "watch_time_seconds")
        },
    }


@router.get("/hashtags")
def hashtag_analysis(
    platform: str | None = Query(default=None, max_length=30),
    mode: Literal["live", "demo"] = Query(default="live"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Extract hashtags from stored posts and public YouTube metadata."""
    profile = _profile(db, user)
    counts = defaultdict(int)
    sources = set()

    if profile is not None:
        for post, account in _content_rows(
            db, _accounts(db, profile.id, platform, mode)
        ):
            tags = {
                tag.lower()
                for tag in re.findall(
                    r"(?<!\w)#([A-Za-z0-9_]{2,50})", post.title or ""
                )
            }
            for tag in tags:
                counts[tag] += 1
            if tags:
                sources.add("live" if account.is_connected else "demo")

    public_youtube = public_youtube_content_analytics(
        db, user, platform, mode
    )
    for item in public_youtube["hashtags"]:
        counts[item["tag"]] += item["content_count"]
    if public_youtube["creator_count"]:
        sources.add("youtube_public")

    return {
        "hashtags": [
            {"tag": tag, "content_count": count}
            for tag, count in sorted(
                counts.items(), key=lambda pair: (-pair[1], pair[0])
            )
        ],
        "data_source": (
            "mixed" if len(sources) > 1 else next(iter(sources), "none")
        ),
        "public_youtube": {
            "creator_count": public_youtube["creator_count"],
            "hashtags": public_youtube["hashtags"],
            "source": public_youtube["source"],
        },
        "note": (
            "Hashtags are counted once per stored content item. Public "
            "YouTube analysis uses tracked video titles and descriptions; "
            "connected-platform analysis currently uses stored post titles."
        ),
    }
