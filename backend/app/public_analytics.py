
"""Public YouTube analytics projections.

Uses real public YouTube Data API snapshots only.
Private owner analytics remain separate.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import (
    TrackedCreator,
    TrackedCreatorSnapshot,
    TrackedCreatorVideo,
    TrackedCreatorVideoSnapshot,
    User,
)

PUBLIC_SOURCE = "youtube_data_api_public"


def _is_youtube_filter(platform: str | None) -> bool:
    return (
        not platform
        or platform.strip().lower() in {"youtube", "youtube public"}
    )


def _tracked_creators(
    db: Session,
    user: User,
    platform: str | None = None,
    mode: str = "live",
) -> list[TrackedCreator]:
    if mode != "live" or not _is_youtube_filter(platform):
        return []

    return (
        db.query(TrackedCreator)
        .filter_by(user_id=user.id)
        .order_by(TrackedCreator.tracked_at.desc())
        .all()
    )


def _latest_video_snapshots(
    db: Session,
    videos: list[TrackedCreatorVideo],
) -> dict[int, list[TrackedCreatorVideoSnapshot]]:
    video_ids = [video.id for video in videos]

    if not video_ids:
        return {}

    rows = (
        db.query(TrackedCreatorVideoSnapshot)
        .filter(
            TrackedCreatorVideoSnapshot.tracked_creator_video_id.in_(
                video_ids
            )
        )
        .order_by(
            TrackedCreatorVideoSnapshot.observed_at.asc()
        )
        .all()
    )

    result = defaultdict(list)

    for row in rows:
        result[row.tracked_creator_video_id].append(row)

    return result


def _video_payload(
    video: TrackedCreatorVideo,
    snapshots: list[TrackedCreatorVideoSnapshot],
) -> dict:
    latest = snapshots[-1] if snapshots else None

    available = (
        set(latest.available_metrics or [])
        if latest
        else set()
    )

    views = (
        latest.view_count
        if latest and "views" in available
        else None
    )

    likes = (
        latest.like_count
        if latest and "likes" in available
        else None
    )

    comments = (
        latest.comment_count
        if latest and "comments" in available
        else None
    )

    engagement = None

    if (
        views is not None
        and views > 0
        and likes is not None
        and comments is not None
    ):
        engagement = round(
            ((likes + comments) / views) * 100,
            2,
        )

    return {
        "video_id": video.video_id,
        "title": video.title,
        "description": video.description,
        "thumbnail_url": video.thumbnail_url,
        "video_url": video.video_url,
        "published_at": (
            video.published_at.isoformat()
            if video.published_at
            else None
        ),
        "duration": video.duration,
        "views": views,
        "likes": likes,
        "comments": comments,
        "engagement_rate": engagement,
        "last_observed_at": (
            latest.observed_at.isoformat()
            if latest
            else None
        ),
        "metric_availability": {
            "views": views is not None,
            "likes": likes is not None,
            "comments": comments is not None,
            "engagement_rate": engagement is not None,
            "shares": False,
            "saves": False,
            "reach": False,
            "impressions": False,
            "watch_time_seconds": False,
        },
        "source": PUBLIC_SOURCE,
    }


def _hashtags_for_videos(
    videos: list[TrackedCreatorVideo],
) -> list[dict]:
    counts = defaultdict(int)

    for video in videos:
        text = (
            f"{video.title or ''} "
            f"{video.description or ''}"
        )

        tags = set()

        for match in re.finditer(
            r"(?<!\w)#([^\s#]{2,80})",
            text,
        ):
            characters = []

            for character in match.group(1):
                category = unicodedata.category(character)

                if (
                    character == "_"
                    or category[0] in {"L", "M", "N"}
                ):
                    characters.append(character)
                else:
                    break

            tag = "".join(characters).lower()

            if len(tag) >= 2:
                tags.add(tag)

        for tag in tags:
            counts[tag] += 1

    return [
        {
            "tag": tag,
            "content_count": count,
            "source": PUBLIC_SOURCE,
        }
        for tag, count in sorted(
            counts.items(),
            key=lambda item: (-item[1], item[0]),
        )[:50]
    ]


def public_youtube_content_analytics(
    db: Session,
    user: User,
    platform: str | None = None,
    mode: str = "live",
) -> dict:
    creators = _tracked_creators(
        db, user, platform, mode
    )

    all_videos = [
        video
        for creator in creators
        for video in (
            db.query(TrackedCreatorVideo)
            .filter_by(tracked_creator_id=creator.id)
            .order_by(desc(TrackedCreatorVideo.published_at))
            .all()
        )
    ]

    snapshots_by_video = _latest_video_snapshots(
        db, all_videos
    )

    creator_results = []

    total_views = 0
    total_likes = 0
    total_comments = 0

    has_views = False
    has_likes = False
    has_comments = False

    engagement_numerator = 0
    engagement_denominator = 0
    engagement_available = False

    for creator in creators:
        videos = [
            video
            for video in all_videos
            if video.tracked_creator_id == creator.id
        ]

        serialized = [
            _video_payload(
                video,
                snapshots_by_video.get(video.id, []),
            )
            for video in videos
        ]

        for item in serialized:
            if item["views"] is not None:
                total_views += item["views"]
                has_views = True

            if item["likes"] is not None:
                total_likes += item["likes"]
                has_likes = True

            if item["comments"] is not None:
                total_comments += item["comments"]
                has_comments = True

            if (
                item["views"] is not None
                and item["views"] > 0
                and item["likes"] is not None
                and item["comments"] is not None
            ):
                engagement_numerator += (
                    item["likes"] + item["comments"]
                )
                engagement_denominator += item["views"]
                engagement_available = True

        creator_results.append({
            "id": creator.id,
            "channel_id": creator.channel_id,
            "title": creator.title,
            "channel_url": creator.channel_url,
            "thumbnail_url": creator.thumbnail_url,
            "subscriber_count": creator.subscriber_count,
            "channel_view_count": creator.view_count,
            "video_count": creator.video_count,
            "tracked_at": creator.tracked_at.isoformat(),
            "last_synced_at": (
                creator.last_synced_at.isoformat()
                if creator.last_synced_at
                else None
            ),
            "videos": serialized,
            "videos_count": len(serialized),
        })

    top_videos = sorted(
        [
            video
            for creator in creator_results
            for video in creator["videos"]
        ],
        key=lambda item: (
            item["views"] is not None,
            item["views"] or -1,
        ),
        reverse=True,
    )

    average_engagement = (
        round(
            engagement_numerator
            * 100
            / engagement_denominator,
            2,
        )
        if engagement_available and engagement_denominator
        else None
    )

    return {
        "source": PUBLIC_SOURCE,
        "creator_count": len(creator_results),
        "video_count": len(all_videos),
        "creators": creator_results,
        "top_videos": top_videos[:20],
        "hashtags": _hashtags_for_videos(all_videos),
        "totals": {
            "views": total_views if has_views else None,
            "likes": total_likes if has_likes else None,
            "comments": total_comments if has_comments else None,
            "average_engagement_rate": average_engagement,
        },
        "metric_availability": {
            "views": has_views,
            "likes": has_likes,
            "comments": has_comments,
            "engagement_rate": engagement_available,
            "shares": False,
            "saves": False,
            "reach": False,
            "impressions": False,
            "watch_time_seconds": False,
        },
        "interpretation": (
            "Values are the latest public lifetime counters "
            "returned by YouTube Data API, not views or "
            "interactions gained during the selected date range. "
            "Daily changes require at least two timestamped "
            "observations."
        ),
    }


def public_youtube_audience(
    db: Session,
    user: User,
    platform: str | None = None,
    mode: str = "live",
) -> dict:
    creators = _tracked_creators(
        db, user, platform, mode
    )

    return {
        "source": PUBLIC_SOURCE,
        "creators": [
            {
                "id": creator.id,
                "channel_id": creator.channel_id,
                "title": creator.title,
                "thumbnail_url": creator.thumbnail_url,
                "subscriber_count": creator.subscriber_count,
                "channel_view_count": creator.view_count,
                "last_synced_at": (
                    creator.last_synced_at.isoformat()
                    if creator.last_synced_at
                    else None
                ),
                "available_metrics": {
                    "age_distribution": False,
                    "gender_distribution": False,
                    "geographic_distribution": False,
                    "device_distribution": False,
                    "active_hours": False,
                    "reach": False,
                    "impressions": False,
                },
            }
            for creator in creators
        ],
        "note": (
            "Public YouTube Data API does not expose audience "
            "demographics, device usage, active hours, reach, "
            "or impressions. These require eligible "
            "owner-authorized YouTube Analytics access and "
            "are intentionally shown as unavailable."
        ),
    }


def public_youtube_growth(
    db: Session,
    user: User,
    days: int = 30,
    platform: str | None = None,
    mode: str = "live",
) -> dict:
    creators = _tracked_creators(
        db, user, platform, mode
    )

    start_date = date.today() - timedelta(days=days - 1)

    results = []

    for creator in creators:
        snapshots = (
            db.query(TrackedCreatorSnapshot)
            .filter_by(tracked_creator_id=creator.id)
            .order_by(
                TrackedCreatorSnapshot.observed_at.asc()
            )
            .all()
        )

        points = []
        previous = None

        for snapshot in snapshots:
            observed = snapshot.observed_at
            changes = {
                "views": None,
                "subscribers": None,
                "videos": None,
            }

            if previous is not None:
                for key, field in (
                    ("views", "view_count"),
                    ("subscribers", "subscriber_count"),
                    ("videos", "video_count"),
                ):
                    before = getattr(previous, field)
                    after = getattr(snapshot, field)

                    if (
                        before is not None
                        and after is not None
                        and after >= before
                    ):
                        changes[key] = after - before

            if observed.date() >= start_date:
                points.append({
                    "observed_at": observed.isoformat(),
                    "label": observed.strftime(
                        "%b %d, %H:%M"
                    ),
                    "subscriber_count": snapshot.subscriber_count,
                    "channel_view_count": snapshot.view_count,
                    "video_count": snapshot.video_count,
                    "changes_since_previous_sync": changes,
                    "available_metrics": (
                        snapshot.available_metrics or []
                    ),
                })

            previous = snapshot

        videos = (
            db.query(TrackedCreatorVideo)
            .filter_by(tracked_creator_id=creator.id)
            .all()
        )

        video_snapshots = _latest_video_snapshots(
            db, videos
        )

        video_trends = []

        for video in videos:
            observations = video_snapshots.get(
                video.id, []
            )

            video_points = []
            previous_video_snapshot = None

            for observation in observations:
                video_changes = {
                    "views": None,
                    "likes": None,
                    "comments": None,
                }

                if previous_video_snapshot is not None:
                    for key, field in (
                        ("views", "view_count"),
                        ("likes", "like_count"),
                        ("comments", "comment_count"),
                    ):
                        before = getattr(
                            previous_video_snapshot, field
                        )
                        after = getattr(observation, field)

                        if (
                            before is not None
                            and after is not None
                            and after >= before
                        ):
                            video_changes[key] = after - before

                if observation.observed_at.date() >= start_date:
                    video_points.append({
                        "observed_at": (
                            observation.observed_at.isoformat()
                        ),
                        "label": observation.observed_at.strftime(
                            "%b %d, %H:%M"
                        ),
                        "views": observation.view_count,
                        "likes": observation.like_count,
                        "comments": observation.comment_count,
                        "changes_since_previous_sync": (
                            video_changes
                        ),
                    })

                previous_video_snapshot = observation

            latest_video_snapshot = (
                observations[-1] if observations else None
            )

            video_trends.append({
                "video_id": video.video_id,
                "title": video.title,
                "video_url": video.video_url,
                "latest_views": (
                    latest_video_snapshot.view_count
                    if latest_video_snapshot
                    else None
                ),
                "points": video_points,
                "observation_count": len(video_points),
            })

        video_trends.sort(
            key=lambda item: (
                item["latest_views"] is not None,
                item["latest_views"] or -1,
            ),
            reverse=True,
        )

        results.append({
            "id": creator.id,
            "channel_id": creator.channel_id,
            "title": creator.title,
            "thumbnail_url": creator.thumbnail_url,
            "last_synced_at": (
                creator.last_synced_at.isoformat()
                if creator.last_synced_at
                else None
            ),
            "points": points,
            "observation_count": len(points),
            "has_comparable_growth": len(points) >= 2,
            "top_video_trends": video_trends[:5],
        })

    return {
        "source": PUBLIC_SOURCE,
        "days": days,
        "creators": results,
        "observation_note": (
            "Each point is a timestamped public counter snapshot. "
            "Changes are calculated between syncs only; no activity "
            "is assigned to days when the app did not observe it. "
            "The first sync is a baseline. Sync again later to build "
            "a growth trend."
        ),
    }
