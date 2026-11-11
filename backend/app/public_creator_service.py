from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import (
    TrackedCreator,
    TrackedCreatorSnapshot,
    TrackedCreatorVideo,
    TrackedCreatorVideoSnapshot,
    utc_now,
)
from app.youtube_service import (
    get_public_channel,
    get_public_channel_videos,
    parse_provider_datetime,
)

MAX_SYNC_VIDEOS = 200
YOUTUBE_PAGE_SIZE = 50


def _channel_url(channel_id: str) -> str:
    return f"https://www.youtube.com/channel/{channel_id}"


def _upsert_channel_snapshot(
    db: Session,
    creator: TrackedCreator,
    observed_at: datetime,
    channel: dict,
) -> TrackedCreatorSnapshot:
    snapshot = (
        db.query(TrackedCreatorSnapshot)
        .filter_by(tracked_creator_id=creator.id, observed_at=observed_at)
        .one_or_none()
    )
    if snapshot is None:
        snapshot = TrackedCreatorSnapshot(
            tracked_creator_id=creator.id,
            observed_at=observed_at,
        )
        db.add(snapshot)
    snapshot.subscriber_count = channel.get("subscriber_count")
    snapshot.view_count = channel.get("view_count")
    snapshot.video_count = channel.get("video_count")
    snapshot.available_metrics = [
        key
        for key in ("subscriber_count", "view_count", "video_count")
        if channel.get(key) is not None
    ]
    return snapshot


def _upsert_video_snapshot(
    db: Session,
    video: TrackedCreatorVideo,
    observed_at: datetime,
    public_video: dict,
) -> TrackedCreatorVideoSnapshot:
    snapshot = (
        db.query(TrackedCreatorVideoSnapshot)
        .filter_by(tracked_creator_video_id=video.id, observed_at=observed_at)
        .one_or_none()
    )
    if snapshot is None:
        snapshot = TrackedCreatorVideoSnapshot(
            tracked_creator_video_id=video.id,
            observed_at=observed_at,
        )
        db.add(snapshot)
    snapshot.view_count = public_video.get("view_count")
    snapshot.like_count = public_video.get("like_count")
    snapshot.comment_count = public_video.get("comment_count")
    snapshot.available_metrics = [
        key
        for key in ("views", "likes", "comments")
        if public_video.get({
            "views": "view_count",
            "likes": "like_count",
            "comments": "comment_count",
        }[key]) is not None
    ]
    return snapshot


def sync_tracked_creator(
    db: Session,
    creator: TrackedCreator,
    observed_at: datetime | None = None,
    channel_data: dict | None = None,
    continue_older: bool = False,
) -> dict:
    """Refresh public channel/video data, preserving each cumulative observation."""
    timestamp = observed_at or utc_now()
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    channel = channel_data or get_public_channel(creator.channel_id)
    creator.title = channel.get("title") or creator.title
    creator.description = channel.get("description") or ""
    creator.thumbnail_url = channel.get("thumbnail_url")
    creator.channel_url = channel.get("channel_url") or _channel_url(creator.channel_id)
    creator.custom_url = channel.get("custom_url")
    creator.published_at = parse_provider_datetime(channel.get("published_at"))
    creator.subscriber_count = channel.get("subscriber_count")
    creator.view_count = channel.get("view_count")
    creator.video_count = channel.get("video_count")
    creator.hidden_subscriber_count = bool(channel.get("hidden_subscriber_count"))
    creator.uploads_playlist_id = channel.get("uploads_playlist_id")
    creator.last_sync_error = None

    _upsert_channel_snapshot(db, creator, timestamp, channel)
    db.flush()

    videos_seen = 0
    pages_fetched = 0
    next_page_token = None
    page_token = creator.videos_next_page_token if continue_older else None
    seen_page_tokens = set()
    if creator.uploads_playlist_id:
        while videos_seen < MAX_SYNC_VIDEOS:
            page_size = min(YOUTUBE_PAGE_SIZE, MAX_SYNC_VIDEOS - videos_seen)
            page = get_public_channel_videos(
                creator.uploads_playlist_id,
                page_size,
                page_token,
            )
            pages_fetched += 1
            for public_video in page["videos"]:
                video_id = public_video.get("video_id")
                if not video_id:
                    continue
                video = (
                    db.query(TrackedCreatorVideo)
                    .filter_by(
                        tracked_creator_id=creator.id,
                        video_id=video_id,
                    )
                    .one_or_none()
                )
                if video is None:
                    video = TrackedCreatorVideo(
                        tracked_creator_id=creator.id,
                        video_id=video_id,
                        title=public_video.get("title") or "Untitled video",
                        video_url=f"https://www.youtube.com/watch?v={video_id}",
                    )
                    db.add(video)
                    db.flush()
                video.title = public_video.get("title") or "Untitled video"
                video.description = public_video.get("description") or ""
                video.thumbnail_url = public_video.get("thumbnail_url")
                video.video_url = f"https://www.youtube.com/watch?v={video_id}"
                video.channel_id = public_video.get("channel_id")
                video.channel_title = public_video.get("channel_title")
                video.published_at = parse_provider_datetime(
                    public_video.get("published_at")
                )
                video.duration = public_video.get("duration")
                video.last_seen_at = timestamp
                _upsert_video_snapshot(db, video, timestamp, public_video)
                videos_seen += 1
            next_page_token = page.get("next_page_token")
            if (
                not next_page_token
                or next_page_token in seen_page_tokens
                or len(page["videos"]) == 0
            ):
                next_page_token = None
                break
            seen_page_tokens.add(next_page_token)
            page_token = next_page_token

    creator.videos_next_page_token = next_page_token
    creator.more_videos_available = bool(next_page_token)
    creator.last_synced_at = timestamp
    db.flush()
    return {
        "videos_seen": videos_seen,
        "pages_fetched": pages_fetched,
        "more_videos_available": bool(next_page_token),
        "source": "youtube_data_api_public",
        "observed_at": timestamp.isoformat(),
    }


def _snapshot_dict(snapshot: TrackedCreatorSnapshot) -> dict:
    return {
        "observed_at": snapshot.observed_at.isoformat(),
        "subscriber_count": snapshot.subscriber_count,
        "view_count": snapshot.view_count,
        "video_count": snapshot.video_count,
        "available_metrics": snapshot.available_metrics or [],
        "source": snapshot.source,
    }


def _growth_intervals(snapshots: list[TrackedCreatorSnapshot]) -> list[dict]:
    intervals = []
    for previous, current in zip(snapshots, snapshots[1:]):
        def delta(field: str) -> tuple[int | None, bool]:
            before = getattr(previous, field)
            after = getattr(current, field)
            if before is None or after is None:
                return None, False
            if after < before:
                return None, True
            return after - before, False

        views_delta, views_reset = delta("view_count")
        subscribers_delta, subscribers_reset = delta("subscriber_count")
        videos_delta, videos_reset = delta("video_count")
        intervals.append({
            "from_observed_at": previous.observed_at.isoformat(),
            "to_observed_at": current.observed_at.isoformat(),
            "view_count_change": views_delta,
            "subscriber_count_change": subscribers_delta,
            "video_count_change": videos_delta,
            "counter_reset": {
                "views": views_reset,
                "subscribers": subscribers_reset,
                "videos": videos_reset,
            },
            "interpretation": "Change between observations; not assigned to a specific day.",
        })
    return intervals


def tracked_creator_payload(db: Session, creator: TrackedCreator) -> dict:
    channel_snapshots = (
        db.query(TrackedCreatorSnapshot)
        .filter_by(tracked_creator_id=creator.id)
        .order_by(TrackedCreatorSnapshot.observed_at)
        .all()
    )
    videos = (
        db.query(TrackedCreatorVideo)
        .filter_by(tracked_creator_id=creator.id)
        .order_by(desc(TrackedCreatorVideo.published_at))
        .all()
    )
    video_ids = [video.id for video in videos]
    snapshot_rows = (
        db.query(TrackedCreatorVideoSnapshot)
        .filter(TrackedCreatorVideoSnapshot.tracked_creator_video_id.in_(video_ids))
        .order_by(TrackedCreatorVideoSnapshot.observed_at)
        .all()
        if video_ids
        else []
    )
    snapshots_by_video: dict[int, list[TrackedCreatorVideoSnapshot]] = {}
    for snapshot in snapshot_rows:
        snapshots_by_video.setdefault(snapshot.tracked_creator_video_id, []).append(snapshot)

    serialized_videos = []
    for video in videos:
        snapshots = snapshots_by_video.get(video.id, [])
        latest = snapshots[-1] if snapshots else None
        view_count = latest.view_count if latest else None
        like_count = latest.like_count if latest else None
        comment_count = latest.comment_count if latest else None
        proxy = None
        if (
            view_count is not None
            and view_count > 0
            and like_count is not None
            and comment_count is not None
        ):
            proxy = round((like_count + comment_count) * 100 / view_count, 2)
        serialized_videos.append({
            "video_id": video.video_id,
            "title": video.title,
            "description": video.description,
            "thumbnail_url": video.thumbnail_url,
            "video_url": video.video_url,
            "channel_id": video.channel_id,
            "channel_title": video.channel_title,
            "published_at": video.published_at.isoformat() if video.published_at else None,
            "duration": video.duration,
            "view_count": view_count,
            "like_count": like_count,
            "comment_count": comment_count,
            "public_engagement_proxy_rate": proxy,
            "available_metrics": latest.available_metrics if latest else [],
            "source": latest.source if latest else "youtube_data_api_public",
            "snapshots": [
                {
                    "observed_at": snapshot.observed_at.isoformat(),
                    "view_count": snapshot.view_count,
                    "like_count": snapshot.like_count,
                    "comment_count": snapshot.comment_count,
                    "available_metrics": snapshot.available_metrics or [],
                }
                for snapshot in snapshots
            ],
        })

    return {
        "id": creator.id,
        "channel_id": creator.channel_id,
        "title": creator.title,
        "description": creator.description,
        "thumbnail_url": creator.thumbnail_url,
        "channel_url": creator.channel_url,
        "custom_url": creator.custom_url,
        "published_at": creator.published_at.isoformat() if creator.published_at else None,
        "subscriber_count": creator.subscriber_count,
        "view_count": creator.view_count,
        "video_count": creator.video_count,
        "hidden_subscriber_count": creator.hidden_subscriber_count,
        "available_metrics": {
            "subscriber_count": creator.subscriber_count is not None,
            "view_count": creator.view_count is not None,
            "video_count": creator.video_count is not None,
            "watch_time": False,
            "impressions": False,
            "reach": False,
            "shares": False,
            "saves": False,
            "audience_demographics": False,
            "active_hours": False,
        },
        "source": "youtube_data_api_public",
        "analytics_type": "public_creator_tracking",
        "tracked_at": creator.tracked_at.isoformat(),
        "last_synced_at": creator.last_synced_at.isoformat() if creator.last_synced_at else None,
        "last_sync_error": creator.last_sync_error,
        "more_videos_available": creator.more_videos_available,
        "channel_snapshots": [_snapshot_dict(snapshot) for snapshot in channel_snapshots],
        "growth_intervals": _growth_intervals(channel_snapshots),
        "videos": serialized_videos,
    }
