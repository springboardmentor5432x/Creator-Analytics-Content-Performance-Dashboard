from __future__ import annotations

import re
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import TrackedCreator, User
from app.public_creator_service import sync_tracked_creator, tracked_creator_payload
from app.youtube_service import (
    YouTubeProviderError,
    get_public_channel,
    resolve_public_channel,
    search_public_channels,
)

router = APIRouter(prefix="/creators", tags=["Public creator tracking"])


class TrackYouTubeCreatorRequest(BaseModel):
    channel_id: str = Field(min_length=8, max_length=80)


def _creator_or_404(db: Session, user: User, creator_id: int) -> TrackedCreator:
    creator = (
        db.query(TrackedCreator)
        .filter_by(id=creator_id, user_id=user.id)
        .one_or_none()
    )
    if creator is None:
        raise HTTPException(status_code=404, detail="Tracked creator was not found.")
    return creator


def _public_api_error(error: YouTubeProviderError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=str(error))


def _channel_results(value: str, max_results: int) -> list[dict]:
    normalized = value.strip()
    if normalized.startswith("@") or re.fullmatch(r"UC[A-Za-z0-9_-]{20,30}", normalized):
        return [resolve_public_channel(normalized)]
    if "youtube.com/" in normalized.lower():
        path = urlparse(normalized if "://" in normalized else f"https://{normalized}").path
        if re.search(r"/(?:channel/UC[A-Za-z0-9_-]{20,30}|@[^/]+|user/[^/]+)(?:/|$)", path):
            return [resolve_public_channel(normalized)]
        segments = [unquote(segment) for segment in path.split("/") if segment]
        slug = next(
            (segments[index + 1] for index, segment in enumerate(segments[:-1]) if segment.lower() == "c"),
            segments[-1] if segments else normalized,
        )
        return search_public_channels(slug.lstrip("@"), max_results)
    return search_public_channels(normalized, max_results)


def _summary(creator: TrackedCreator) -> dict:
    return {
        "id": creator.id,
        "channel_id": creator.channel_id,
        "title": creator.title,
        "description": creator.description,
        "thumbnail_url": creator.thumbnail_url,
        "channel_url": creator.channel_url,
        "custom_url": creator.custom_url,
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
            "audience_demographics": False,
            "active_hours": False,
        },
        "source": "youtube_data_api_public",
        "analytics_type": "public_creator_tracking",
        "tracked_at": creator.tracked_at.isoformat(),
        "last_synced_at": creator.last_synced_at.isoformat() if creator.last_synced_at else None,
        "last_sync_error": creator.last_sync_error,
        "more_videos_available": creator.more_videos_available,
    }


@router.get("/youtube/search")
def search_youtube_creators(
    query: str = Query(min_length=2, max_length=200),
    max_results: int = Query(default=10, ge=1, le=25),
    _user: User = Depends(get_current_user),
):
    """Search real public YouTube channels or directly resolve a channel ID/handle/URL."""
    value = query.strip()
    try:
        channels = _channel_results(value, max_results)
        return {
            "channels": channels,
            "count": len(channels),
            "source": "youtube_data_api_public",
        }
    except YouTubeProviderError as exc:
        if (value.startswith("@") or re.fullmatch(r"UC[A-Za-z0-9_-]{20,30}", value)) and exc.status_code == 404:
            return {"channels": [], "count": 0, "source": "youtube_data_api_public"}
        raise _public_api_error(exc) from exc


@router.get("/youtube/resolve")
def resolve_youtube_creator(
    identifier: str = Query(min_length=2, max_length=200),
    _user: User = Depends(get_current_user),
):
    try:
        return resolve_public_channel(identifier)
    except YouTubeProviderError as exc:
        raise _public_api_error(exc) from exc


@router.get("/youtube/tracked")
def list_tracked_youtube_creators(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creators = (
        db.query(TrackedCreator)
        .filter_by(user_id=user.id)
        .order_by(TrackedCreator.tracked_at.desc())
        .all()
    )
    return {
        "creators": [_summary(creator) for creator in creators],
        "count": len(creators),
        "source": "youtube_data_api_public",
    }


@router.post(
    "/youtube/tracked",
    status_code=status.HTTP_201_CREATED,
)
def track_youtube_creator(
    request: TrackYouTubeCreatorRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    channel_id = request.channel_id.strip()
    existing = (
        db.query(TrackedCreator)
        .filter_by(user_id=user.id, channel_id=channel_id)
        .one_or_none()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="This YouTube creator is already tracked.")

    try:
        channel = get_public_channel(channel_id)
        if not channel.get("channel_id"):
            raise HTTPException(status_code=502, detail="YouTube did not return a valid channel ID.")
        creator = TrackedCreator(
            user_id=user.id,
            channel_id=channel["channel_id"],
            title=channel.get("title") or "Untitled channel",
            description=channel.get("description") or "",
            thumbnail_url=channel.get("thumbnail_url"),
            channel_url=channel.get("channel_url") or f"https://www.youtube.com/channel/{channel['channel_id']}",
            custom_url=channel.get("custom_url"),
            subscriber_count=channel.get("subscriber_count"),
            view_count=channel.get("view_count"),
            video_count=channel.get("video_count"),
            hidden_subscriber_count=bool(channel.get("hidden_subscriber_count")),
            uploads_playlist_id=channel.get("uploads_playlist_id"),
        )
        db.add(creator)
        db.flush()
        sync = sync_tracked_creator(db, creator, channel_data=channel)
        db.commit()
        db.refresh(creator)
    except YouTubeProviderError as exc:
        db.rollback()
        raise _public_api_error(exc) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This YouTube creator is already tracked.") from exc

    payload = tracked_creator_payload(db, creator)
    payload["sync"] = sync
    return payload


@router.get("/youtube/tracked/{creator_id}")
def get_tracked_youtube_creator(
    creator_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = _creator_or_404(db, user, creator_id)
    return tracked_creator_payload(db, creator)


@router.post("/youtube/tracked/{creator_id}/sync")
def sync_youtube_creator(
    creator_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = _creator_or_404(db, user, creator_id)
    try:
        sync = sync_tracked_creator(db, creator)
        db.commit()
        db.refresh(creator)
    except YouTubeProviderError as exc:
        db.rollback()
        creator = _creator_or_404(db, user, creator_id)
        creator.last_sync_error = str(exc)
        db.commit()
        raise _public_api_error(exc) from exc
    payload = tracked_creator_payload(db, creator)
    payload["sync"] = sync
    return payload


@router.post("/youtube/tracked/{creator_id}/load-more")
def load_more_youtube_creator_videos(
    creator_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = _creator_or_404(db, user, creator_id)
    if not creator.more_videos_available or not creator.videos_next_page_token:
        raise HTTPException(status_code=409, detail="No older public videos are available to load.")
    try:
        sync = sync_tracked_creator(db, creator, continue_older=True)
        db.commit()
        db.refresh(creator)
    except YouTubeProviderError as exc:
        db.rollback()
        creator = _creator_or_404(db, user, creator_id)
        creator.last_sync_error = str(exc)
        db.commit()
        raise _public_api_error(exc) from exc
    payload = tracked_creator_payload(db, creator)
    payload["sync"] = sync
    return payload


@router.delete("/youtube/tracked/{creator_id}", status_code=status.HTTP_204_NO_CONTENT)
def untrack_youtube_creator(
    creator_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = _creator_or_404(db, user, creator_id)
    db.delete(creator)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
