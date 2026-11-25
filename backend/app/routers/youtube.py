
import os
import json
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query 
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..deps import get_current_user


# Load backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter(
    prefix="/youtube",
    tags=["YouTube"]
)

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

# Public YouTube channel: T-Series
DEFAULT_CHANNEL_ID = "UCq-Fj5jknLsUf-MWSy4_brA"


def youtube_request(endpoint: str, params: dict):
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="YouTube API key missing. Check backend/.env"
        )

    query = urlencode({
        **params,
        "key": api_key
    })

    url = f"{YOUTUBE_API_URL}/{endpoint}?{query}"

    request = Request(
        url,
        headers={"Accept": "application/json"}
    )

    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))

    except HTTPError as error:
        try:
            error_data = json.loads(error.read().decode("utf-8"))
            message = error_data.get("error", {}).get(
                "message",
                "YouTube API request failed"
            )
        except Exception:
            message = "YouTube API request failed"

        raise HTTPException(
            status_code=502,
            detail=message
        )

    except (URLError, TimeoutError):
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to YouTube API"
        )


@router.post("/sync")
def sync_youtube_channel(
    channel_id: str = Query(
        DEFAULT_CHANNEL_ID,
        min_length=10
    ),
    max_videos: int = Query(
        50,
        ge=1,
        le=200
    ),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    # 1. Fetch channel information
    channel_data = youtube_request(
        "channels",
        {
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
            "maxResults": 1
        }
    )

    items = channel_data.get("items", [])

    if not items:
        raise HTTPException(
            status_code=404,
            detail="YouTube channel not found"
        )

    channel = items[0]

    channel_title = channel.get(
        "snippet", {}
    ).get("title", "YouTube Channel")

    statistics = channel.get("statistics", {})

    uploads_playlist = (
        channel.get("contentDetails", {})
        .get("relatedPlaylists", {})
        .get("uploads")
    )

    now = datetime.now(timezone.utc)

    try:
        # 2. Create or update social account
        account = db.query(models.SocialAccount).filter_by(
            user_id=user.id,
            platform="YouTube",
            platform_account_id=channel_id
        ).first()

        if account is None:
            account = models.SocialAccount(
                user_id=user.id,
                platform="YouTube",
                platform_account_id=channel_id,
                account_name=channel_title,
                connected_at=now,
                updated_at=now
            )

            db.add(account)
            db.flush()

        else:
            account.account_name = channel_title
            account.updated_at = now

        # 3. Save subscriber count
        audience = models.AudienceAnalytics(
            social_account_id=account.id,
            subscriber_count=int(
                statistics.get("subscriberCount", 0) or 0
            ),
            recorded_at=now
        )

        db.add(audience)

        # 4. Fetch uploaded video IDs
        video_ids = []
        next_page_token = None

        while uploads_playlist and len(video_ids) < max_videos:
            params = {
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist,
                "maxResults": min(
                    50,
                    max_videos - len(video_ids)
                )
            }

            if next_page_token:
                params["pageToken"] = next_page_token

            playlist_data = youtube_request(
                "playlistItems",
                params
            )

            for item in playlist_data.get("items", []):
                video_id = (
                    item.get("contentDetails", {})
                    .get("videoId")
                )

                if video_id:
                    video_ids.append(video_id)

            next_page_token = playlist_data.get(
                "nextPageToken"
            )

            if not next_page_token:
                break

        # 5. Fetch video statistics and save posts
        synced_count = 0

        for start in range(0, len(video_ids), 50):
            batch_ids = video_ids[start:start + 50]

            videos_data = youtube_request(
                "videos",
                {
                    "part": "snippet,statistics",
                    "id": ",".join(batch_ids)
                }
            )

            for video in videos_data.get("items", []):
                video_id = video["id"]

                snippet = video.get("snippet", {})
                video_stats = video.get("statistics", {})

                published_at = None
                published_text = snippet.get("publishedAt")

                if published_text:
                    try:
                        published_at = datetime.fromisoformat(
                            published_text.replace("Z", "+00:00")
                        )
                    except ValueError:
                        published_at = None

                post = db.query(models.Post).filter_by(
                    social_account_id=account.id,
                    platform_post_id=video_id
                ).first()

                if post is None:
                    post = models.Post(
                        social_account_id=account.id,
                        platform_post_id=video_id,
                        title=snippet.get(
                            "title",
                            "Untitled video"
                        ),
                        published_at=published_at,
                        created_at=now,
                        updated_at=now
                    )

                    db.add(post)
                    db.flush()

                else:
                    post.title = snippet.get(
                        "title",
                        post.title
                    )

                    if published_at:
                        post.published_at = published_at

                    post.updated_at = now

                # Save a fresh analytics snapshot
                analytics = models.PostAnalytics(
                    post_id=post.id,
                    views=int(
                        video_stats.get("viewCount", 0) or 0
                    ),
                    likes=int(
                        video_stats.get("likeCount", 0) or 0
                    ),
                    comments=int(
                        video_stats.get("commentCount", 0) or 0
                    ),
                    shares=0,
                    reach=0,
                    recorded_at=now
                )

                db.add(analytics)
                synced_count += 1

        # 6. Commit all database changes
        db.commit()

        return {
            "success": True,
            "message": "YouTube channel synced successfully",
            "channel_name": channel_title,
            "channel_id": channel_id,
            "subscribers": int(
                statistics.get("subscriberCount", 0) or 0
            ),
            "channel_total_views": int(
                statistics.get("viewCount", 0) or 0
            ),
            "channel_video_count": int(
                statistics.get("videoCount", 0) or 0
            ),
            "videos_synced": synced_count,
            "channel_url": (
                f"https://www.youtube.com/channel/{channel_id}"
            ),
            "note": (
                "Only public YouTube statistics are imported. "
                "Private YouTube Studio analytics are not available."
            )
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"YouTube sync failed: {str(error)}"
        )


@router.get("/channel")
def get_youtube_channel(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    account = db.query(models.SocialAccount).filter_by(
        user_id=user.id,
        platform="YouTube"
    ).order_by(
        models.SocialAccount.updated_at.desc()
    ).first()

    if account is None:
        return {
            "connected": False,
            "message": "No YouTube channel synced yet"
        }

    audience = db.query(
        models.AudienceAnalytics
    ).filter_by(
        social_account_id=account.id
    ).order_by(
        models.AudienceAnalytics.recorded_at.desc()
    ).first()

    return {
        "connected": True,
        "channel_name": account.account_name,
        "channel_id": account.platform_account_id,
        "subscribers": (
            int(audience.subscriber_count or 0)
            if audience else 0
        ),
        "channel_url": (
            f"https://www.youtube.com/channel/"
            f"{account.platform_account_id}"
        )
    }
