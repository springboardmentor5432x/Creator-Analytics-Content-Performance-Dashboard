
"""YouTube OAuth, Data API, and Analytics API helpers.

This module never logs OAuth tokens or raw provider response bodies.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import re
from urllib.parse import unquote, urlencode, urlparse

import httpx

from app.config import settings

YOUTUBE_DATA_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly"
YOUTUBE_SCOPES = (YOUTUBE_DATA_SCOPE, YOUTUBE_ANALYTICS_SCOPE)


class YouTubeProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(YOUTUBE_SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return f"{settings.google_oauth_authorize_url}?{urlencode(params)}"


def public_data_get(endpoint: str, params: dict | None = None) -> dict:
    """Call the public YouTube Data API using a backend-only API key.

    The key is never returned to the caller or included in error messages.
    """
    if not settings.youtube_api_key:
        raise YouTubeProviderError(
            "YouTube public lookup is not configured. Set YOUTUBE_API_KEY in backend/.env.",
            503,
        )

    request_params = dict(params or {})
    request_params["key"] = settings.youtube_api_key
    url = f"{settings.youtube_data_api_base_url}/{endpoint.lstrip('/')}"

    try:
        with httpx.Client(timeout=settings.http_timeout_seconds) as client:
            response = client.get(url, params=request_params)
    except httpx.RequestError as exc:
        raise YouTubeProviderError(
            "Could not reach the public YouTube Data API.", 502
        ) from exc

    if response.is_error:
        status_code = response.status_code

        if status_code == 400:
            raise YouTubeProviderError(
                "YouTube rejected the public lookup request. Check the channel/video ID or search query.",
                400,
            )
        if status_code == 403:
            raise YouTubeProviderError(
                "YouTube Data API access or quota is unavailable. Check API enablement, key restrictions, and quota.",
                403,
            )
        if status_code == 404:
            raise YouTubeProviderError(
                "The requested public YouTube resource was not found.", 404
            )
        if status_code == 429:
            raise YouTubeProviderError(
                "YouTube Data API rate limit reached. Retry later.", 429
            )

        raise YouTubeProviderError(
            f"YouTube Data API request failed (HTTP {status_code}).",
            502 if status_code < 500 else status_code,
        )

    try:
        return response.json()
    except ValueError as exc:
        raise YouTubeProviderError(
            "YouTube Data API returned invalid JSON.", 502
        ) from exc


def _normalise_public_video(item: dict) -> dict:
    snippet = item.get("snippet") or {}
    statistics = item.get("statistics") or {}
    content = item.get("contentDetails") or {}

    thumbnails = snippet.get("thumbnails") or {}
    thumbnail = (
        thumbnails.get("high")
        or thumbnails.get("medium")
        or thumbnails.get("default")
        or {}
    )

    return {
        "video_id": item.get("id"),
        "title": snippet.get("title") or "Untitled video",
        "description": snippet.get("description") or "",
        "channel_id": snippet.get("channelId"),
        "channel_title": snippet.get("channelTitle"),
        "published_at": snippet.get("publishedAt"),
        "thumbnail_url": thumbnail.get("url"),
        "view_count": (
            int(statistics["viewCount"])
            if statistics.get("viewCount") is not None
            else None
        ),
        "like_count": (
            int(statistics.get("likeCount", 0) or 0)
            if "likeCount" in statistics
            else None
        ),
        "comment_count": (
            int(statistics.get("commentCount", 0) or 0)
            if "commentCount" in statistics
            else None
        ),
        "duration": content.get("duration"),
        "source": "youtube_data_api_public",
    }


def search_public_videos(
    query: str,
    max_results: int = 10,
    channel_id: str | None = None,
) -> list[dict]:
    """Search public videos and enrich search results with public statistics."""

    search_params = {
        "part": "snippet",
        "type": "video",
        "q": query,
        "maxResults": max(1, min(int(max_results), 25)),
    }

    if channel_id:
        search_params["channelId"] = channel_id

    search_data = public_data_get("search", search_params)

    video_ids = [
        str((item.get("id") or {}).get("videoId"))
        for item in (search_data.get("items") or [])
        if (item.get("id") or {}).get("videoId")
    ]

    if not video_ids:
        return []

    detail_data = public_data_get(
        "videos",
        {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(video_ids),
            "maxResults": len(video_ids),
        },
    )

    return [
        _normalise_public_video(item)
        for item in (detail_data.get("items") or [])
    ]


def get_public_channel(channel_id: str) -> dict:
    """Return public channel metadata and statistics for a channel ID."""

    data = public_data_get(
        "channels",
        {
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
            "maxResults": 1,
        },
    )

    items = data.get("items") or []

    if not items:
        raise YouTubeProviderError(
            "Public YouTube channel was not found.", 404
        )

    return _normalise_public_channel(items[0])


def _normalise_public_channel(item: dict) -> dict:
    snippet = item.get("snippet") or {}
    stats = item.get("statistics") or {}
    details = item.get("contentDetails") or {}

    thumbnails = snippet.get("thumbnails") or {}
    thumbnail = (
        thumbnails.get("high")
        or thumbnails.get("medium")
        or thumbnails.get("default")
        or {}
    )

    return {
        "channel_id": item.get("id"),
        "title": snippet.get("title"),
        "description": snippet.get("description") or "",
        "custom_url": snippet.get("customUrl"),
        "published_at": snippet.get("publishedAt"),
        "thumbnail_url": thumbnail.get("url"),
        "view_count": (
            int(stats["viewCount"])
            if stats.get("viewCount") is not None
            else None
        ),
        "subscriber_count": (
            int(stats["subscriberCount"])
            if stats.get("subscriberCount") is not None
            else None
        ),
        "video_count": (
            int(stats["videoCount"])
            if stats.get("videoCount") is not None
            else None
        ),
        "hidden_subscriber_count": bool(
            stats.get("hiddenSubscriberCount", False)
        ),
        "uploads_playlist_id": (
            details.get("relatedPlaylists") or {}
        ).get("uploads"),
        "channel_url": f"https://www.youtube.com/channel/{item.get('id')}",
        "source": "youtube_data_api_public",
    }


def search_public_channels(query: str, max_results: int = 10) -> list[dict]:
    """Search public channels and enrich all results with public channel statistics."""
    data = public_data_get(
        "search",
        {
            "part": "snippet",
            "type": "channel",
            "q": query,
            "maxResults": max(1, min(int(max_results), 25)),
        },
    )
    search_items = data.get("items") or []
    channel_ids = [
        str((item.get("id") or {}).get("channelId"))
        for item in search_items
        if (item.get("id") or {}).get("channelId")
    ]
    if not channel_ids:
        return []

    detail_data = public_data_get(
        "channels",
        {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(channel_ids),
            "maxResults": len(channel_ids),
        },
    )
    details = {
        item.get("id"): _normalise_public_channel(item)
        for item in (detail_data.get("items") or [])
        if item.get("id")
    }
    results = []
    for item in search_items:
        channel_id = (item.get("id") or {}).get("channelId")
        channel = details.get(channel_id)
        if channel:
            results.append(channel)
            continue
        snippet = item.get("snippet") or {}
        thumbnails = snippet.get("thumbnails") or {}
        thumbnail = thumbnails.get("high") or thumbnails.get("medium") or thumbnails.get("default") or {}
        results.append({
            "channel_id": channel_id,
            "title": snippet.get("title"),
            "description": snippet.get("description") or "",
            "custom_url": snippet.get("customUrl"),
            "published_at": snippet.get("publishedAt"),
            "thumbnail_url": thumbnail.get("url"),
            "view_count": None,
            "subscriber_count": None,
            "video_count": None,
            "hidden_subscriber_count": None,
            "uploads_playlist_id": None,
            "channel_url": f"https://www.youtube.com/channel/{channel_id}",
            "source": "youtube_data_api_public",
        })
    return results


def resolve_public_channel(identifier: str) -> dict:
    """Resolve a YouTube channel ID, handle, or canonical channel URL."""
    value = unquote(identifier.strip())
    if not value:
        raise YouTubeProviderError("Enter a YouTube channel ID, handle, or URL.", 400)

    path = urlparse(value).path if "://" in value else value
    channel_match = re.search(r"/channel/(UC[A-Za-z0-9_-]{20,30})", path)
    if channel_match:
        return get_public_channel(channel_match.group(1))

    channel_id = value if re.fullmatch(r"UC[A-Za-z0-9_-]{20,30}", value) else None
    if channel_id:
        return get_public_channel(channel_id)

    handle_match = re.search(r"/@([A-Za-z0-9._-]+)", path)
    handle = handle_match.group(1) if handle_match else (
        value[1:] if value.startswith("@") else None
    )
    if handle:
        response = public_data_get(
            "channels",
            {
                "part": "snippet,statistics,contentDetails",
                "forHandle": handle,
                "maxResults": 1,
            },
        )
        items = response.get("items") or []
        if items:
            return _normalise_public_channel(items[0])
        raise YouTubeProviderError("Public YouTube channel handle was not found.", 404)

    username_match = re.search(r"/user/([A-Za-z0-9._-]+)", path)
    username = username_match.group(1) if username_match else None
    if username:
        response = public_data_get(
            "channels",
            {
                "part": "snippet,statistics,contentDetails",
                "forUsername": username,
                "maxResults": 1,
            },
        )
        items = response.get("items") or []
        if items:
            return _normalise_public_channel(items[0])
        raise YouTubeProviderError("Public YouTube username was not found.", 404)

    raise YouTubeProviderError(
        "Could not resolve this channel directly. Search for the channel and select a result.",
        400,
    )


def get_public_channel_videos(
    uploads_playlist_id: str,
    max_results: int = 50,
    page_token: str | None = None,
) -> dict:
    """Fetch one uploads-playlist page and batch-enrich its videos with public metrics."""
    page_size = max(1, min(int(max_results), 50))
    params = {
        "part": "contentDetails,snippet",
        "playlistId": uploads_playlist_id,
        "maxResults": page_size,
    }
    if page_token:
        params["pageToken"] = page_token
    playlist = public_data_get("playlistItems", params)
    video_ids = [
        str((item.get("contentDetails") or {}).get("videoId"))
        for item in (playlist.get("items") or [])
        if (item.get("contentDetails") or {}).get("videoId")
    ]
    if not video_ids:
        return {"videos": [], "next_page_token": playlist.get("nextPageToken")}
    detail_data = public_data_get(
        "videos",
        {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(video_ids),
            "maxResults": len(video_ids),
        },
    )
    videos = [
        _normalise_public_video(item)
        for item in (detail_data.get("items") or [])
    ]
    return {
        "videos": videos,
        "next_page_token": playlist.get("nextPageToken"),
    }


def get_public_video(video_id: str) -> dict:
    """Return public video metadata and statistics for a video ID."""

    data = public_data_get(
        "videos",
        {
            "part": "snippet,statistics,contentDetails",
            "id": video_id,
            "maxResults": 1,
        },
    )

    items = data.get("items") or []

    if not items:
        raise YouTubeProviderError(
            "Public YouTube video was not found.", 404
        )

    return _normalise_public_video(items[0])


def _provider_message(
    response: httpx.Response,
    service: str,
) -> YouTubeProviderError:
    status = response.status_code

    if status == 401:
        return YouTubeProviderError(
            f"{service} rejected the access token. Reconnect the YouTube account.",
            401,
        )

    if status == 403:
        return YouTubeProviderError(
            f"{service} permission or API access is unavailable. Check Google Cloud API enablement and OAuth scopes.",
            403,
        )

    if status == 404:
        return YouTubeProviderError(
            f"{service} resource was not found or is not visible to this account.",
            404,
        )

    if status == 429:
        return YouTubeProviderError(
            f"{service} rate/quota limit reached. Retry later.",
            429,
        )

    return YouTubeProviderError(
        f"{service} request failed (HTTP {status}).",
        502 if status < 500 else status,
    )


def exchange_authorization_code(code: str) -> dict:
    """Exchange Google's OAuth authorization code for tokens."""

    payload = {
        "code": code,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        with httpx.Client(
            timeout=settings.http_timeout_seconds
        ) as client:
            response = client.post(
                settings.google_oauth_token_url,
                data=payload,
            )
    except httpx.RequestError as exc:
        raise YouTubeProviderError(
            "Could not reach Google's OAuth service.", 502
        ) from exc

    if response.is_error:
        raise YouTubeProviderError(
            "Google rejected the OAuth authorization code. Try connecting again.",
            400,
        )

    data = response.json()

    if not data.get("access_token"):
        raise YouTubeProviderError(
            "Google OAuth did not return an access token.", 502
        )

    return data


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired Google access token."""

    payload = {
        "refresh_token": refresh_token,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "grant_type": "refresh_token",
    }

    try:
        with httpx.Client(
            timeout=settings.http_timeout_seconds
        ) as client:
            response = client.post(
                settings.google_oauth_token_url,
                data=payload,
            )
    except httpx.RequestError as exc:
        raise YouTubeProviderError(
            "Could not reach Google's token refresh service.", 502
        ) from exc

    if response.is_error:
        raise YouTubeProviderError(
            "Google rejected the refresh token. Reconnect the YouTube account.",
            401,
        )

    data = response.json()

    if not data.get("access_token"):
        raise YouTubeProviderError(
            "Google token refresh returned no access token.", 502
        )

    return data


def google_get(
    url: str,
    access_token: str,
    params: dict | None = None,
) -> dict:
    """Perform an authenticated GET against a Google YouTube API."""

    try:
        with httpx.Client(
            timeout=settings.http_timeout_seconds
        ) as client:
            response = client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params=params or {},
            )
    except httpx.RequestError as exc:
        raise YouTubeProviderError(
            "Could not reach the YouTube API. Check internet connectivity and retry.",
            502,
        ) from exc

    if response.is_error:
        service = (
            "YouTube Analytics API"
            if "youtubeanalytics" in url
            else "YouTube Data API"
        )
        raise _provider_message(response, service)

    try:
        return response.json()
    except ValueError as exc:
        raise YouTubeProviderError(
            "YouTube returned an invalid JSON response.", 502
        ) from exc


def get_my_channel(access_token: str) -> dict:
    """Get the channel owned by the OAuth-authorized Google account."""

    data = google_get(
        f"{settings.youtube_data_api_base_url}/channels",
        access_token,
        {
            "part": "snippet,statistics,contentDetails",
            "mine": "true",
            "maxResults": 5,
        },
    )

    items = data.get("items") or []

    if not items:
        raise YouTubeProviderError(
            "No YouTube channel was returned for the authorized Google account.",
            404,
        )

    return items[0]


def get_channel_by_id(
    access_token: str,
    channel_id: str,
) -> dict:
    """Get a channel by its YouTube channel ID."""

    data = google_get(
        f"{settings.youtube_data_api_base_url}/channels",
        access_token,
        {
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
            "maxResults": 1,
        },
    )

    items = data.get("items") or []

    if not items:
        raise YouTubeProviderError(
            "The connected YouTube channel is no longer available.",
            404,
        )

    return items[0]


def get_recent_videos(
    access_token: str,
    uploads_playlist_id: str,
    max_results: int = 50,
) -> list[dict]:
    """Get up to 50 recent videos from a channel uploads playlist."""

    playlist = google_get(
        f"{settings.youtube_data_api_base_url}/playlistItems",
        access_token,
        {
            "part": "contentDetails,snippet",
            "playlistId": uploads_playlist_id,
            "maxResults": min(max_results, 50),
        },
    )

    ids = [
        item.get("contentDetails", {}).get("videoId")
        for item in playlist.get("items", [])
    ]
    ids = [video_id for video_id in ids if video_id]

    if not ids:
        return []

    data = google_get(
        f"{settings.youtube_data_api_base_url}/videos",
        access_token,
        {
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(ids),
            "maxResults": 50,
        },
    )

    return data.get("items") or []


def analytics_report(
    access_token: str,
    params: dict,
) -> dict:
    """Request an authorized YouTube Analytics report."""

    defaults = {"ids": "channel==MINE"}
    defaults.update(params)

    return google_get(
        settings.youtube_analytics_api_base_url,
        access_token,
        defaults,
    )


def rows_as_dicts(report: dict) -> list[dict]:
    """Convert a YouTube Analytics tabular response to dictionaries."""

    headers = [
        column.get("name")
        for column in (report.get("columnHeaders") or [])
    ]

    output = []

    for row in report.get("rows") or []:
        if len(row) != len(headers):
            continue

        output.append(dict(zip(headers, row)))

    return output


def iso_day(value: str) -> date:
    return date.fromisoformat(value[:10])


def parse_provider_datetime(
    value: str | None,
) -> datetime | None:
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
        return (
            parsed
            if parsed.tzinfo
            else parsed.replace(tzinfo=timezone.utc)
        )
    except ValueError:
        return None


def report_window(
    days: int = 30,
) -> tuple[date, date]:
    today = date.today()
    # YouTube Analytics can lag; request fully elapsed days only.
    return today - timedelta(days=days), today - timedelta(days=1)


# Runtime sync functions are kept separate from HTTP endpoints so their
# mapping and error-handling logic can be tested without live credentials.
def _as_int(value) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _upsert_content_metric(
    db,
    post,
    recorded_on: date,
    values: dict,
    source: str = "youtube_analytics_api",
) -> None:
    from app.models import ContentMetric

    views = _as_int(values.get("views"))
    likes = _as_int(values.get("likes"))
    comments = _as_int(values.get("comments"))
    shares = _as_int(values.get("shares"))
    watched_minutes = _as_int(
        values.get("estimatedMinutesWatched")
    )

    # YouTube does not expose an Instagram-style save counter.
    # Reach/impressions are not inferred from views.
    rate = (
        round(((likes + comments + shares) / views) * 100, 2)
        if views
        else 0.0
    )

    metric = (
        db.query(ContentMetric)
        .filter_by(
            content_post_id=post.id,
            recorded_on=recorded_on,
        )
        .one_or_none()
    )

    fields = {
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "watch_time_seconds": watched_minutes * 60,
        "engagement_rate": rate,
    }
    available = [
        field
        for field in ("views", "likes", "comments", "shares")
        if field in values
    ]
    if "estimatedMinutesWatched" in values:
        available.append("watch_time_seconds")

    if metric is None:
        metric = ContentMetric(
            content_post_id=post.id,
            recorded_on=recorded_on,
            metrics_available=available,
            **fields,
        )
        db.add(metric)
    else:
        for key, val in fields.items():
            setattr(metric, key, val)
        metric.metrics_available = available


def sync_youtube_account(
    db,
    social_account,
    access_token: str,
) -> dict:
    """Fetch recent videos, daily channel metrics and audience reports."""

    from app.models import (
        AccountMetric,
        AudienceInsight,
        ContentMetric,
        ContentPost,
        ContentSnapshot,
    )

    warnings: list[str] = []

    # The credential's provider account ID is resolved by the caller
    # and copied to the social account transiently.
    channel_id = getattr(
        social_account,
        "_provider_account_id",
        None,
    )

    channel = (
        get_channel_by_id(access_token, channel_id)
        if channel_id
        else get_my_channel(access_token)
    )

    actual_channel_id = channel.get("id")

    if not actual_channel_id:
        raise YouTubeProviderError(
            "YouTube channel response did not include a channel ID.",
            502,
        )

    snippet = channel.get("snippet") or {}
    stats = channel.get("statistics") or {}
    details = channel.get("contentDetails") or {}

    custom_url = snippet.get("customUrl")

    if custom_url:
        social_account.handle = (
            custom_url
            if custom_url.startswith("@")
            else f"@{custom_url}"
        )

    social_account.profile_url = (
        f"https://www.youtube.com/channel/{actual_channel_id}"
    )
    social_account.followers_count = _as_int(
        stats.get("subscriberCount")
    )
    social_account.is_connected = True

    now = datetime.now(timezone.utc)
    social_account.last_synced_at = now

    uploads_id = (
        (details.get("relatedPlaylists") or {}).get("uploads")
    )

    videos = (
        get_recent_videos(access_token, uploads_id, 50)
        if uploads_id
        else []
    )

    posts_by_video_id: dict[str, ContentPost] = {}
    snapshots_before: dict[
        str,
        ContentSnapshot | None,
    ] = {}
    stats_by_video: dict[str, dict] = {}

    for video in videos:
        video_id = video.get("id")

        if not video_id:
            continue

        video_snippet = video.get("snippet") or {}
        video_stats = video.get("statistics") or {}

        existing = (
            db.query(ContentPost)
            .filter_by(external_post_id=video_id)
            .one_or_none()
        )

        if (
            existing is not None
            and existing.social_account_id != social_account.id
        ):
            warnings.append(
                "A video belonging to another connected profile was skipped."
            )
            continue

        if existing is None:
            existing = ContentPost(
                social_account_id=social_account.id,
                external_post_id=video_id,
                title=(
                    video_snippet.get("title")
                    or "Untitled video"
                )[:250],
                content_type="Video",
            )
            db.add(existing)
            db.flush()
        else:
            existing.title = (
                video_snippet.get("title")
                or "Untitled video"
            )[:250]

        existing.post_url = (
            f"https://www.youtube.com/watch?v={video_id}"
        )
        existing.published_at = parse_provider_datetime(
            video_snippet.get("publishedAt")
        )

        posts_by_video_id[video_id] = existing

        snapshot = (
            db.query(ContentSnapshot)
            .filter_by(content_post_id=existing.id)
            .one_or_none()
        )

        snapshots_before[video_id] = snapshot

        stats_by_video[video_id] = {
            "views": _as_int(video_stats.get("viewCount")),
            "likes": _as_int(video_stats.get("likeCount")),
            "comments": _as_int(video_stats.get("commentCount")),
        }

    start_date, end_date = report_window(30)

    video_report = None

    if posts_by_video_id:
        try:
            ids = ",".join(posts_by_video_id.keys())

            video_report = analytics_report(
                access_token,
                {
                    "startDate": start_date.isoformat(),
                    "endDate": end_date.isoformat(),
                    "metrics": (
                        "views,likes,comments,shares,"
                        "estimatedMinutesWatched"
                    ),
                    "dimensions": "day,video",
                    "filters": f"video=={ids}",
                    "sort": "day",
                    "maxResults": 2000,
                },
            )
        except YouTubeProviderError:
            warnings.append(
                "Video-level daily history is unavailable; "
                "cumulative video statistics were synced instead."
            )

    analytics_rows = (
        rows_as_dicts(video_report)
        if video_report
        else []
    )

    for row in analytics_rows:
        video_id = str(row.get("video", ""))
        post = posts_by_video_id.get(video_id)

        if post is None or not row.get("day"):
            continue

        try:
            recorded_on = iso_day(str(row["day"]))
        except (ValueError, TypeError):
            continue

        _upsert_content_metric(
            db,
            post,
            recorded_on,
            row,
        )

    # Keep a current cumulative snapshot.
    # If Analytics API has no daily rows, calculate changes since
    # the last snapshot. The first sync is a baseline, not a made-up
    # daily view count.
    for video_id, post in posts_by_video_id.items():
        current = stats_by_video[video_id]
        snapshot = snapshots_before[video_id]

        previous_date = (
            snapshot.fetched_at.date()
            if snapshot and snapshot.fetched_at
            else None
        )

        if not analytics_rows:
            if (
                snapshot
                and previous_date
                and previous_date < date.today()
            ):
                previous = {
                    "views": snapshot.latest_views,
                    "likes": snapshot.latest_likes,
                    "comments": snapshot.latest_comments,
                }

                delta = {
                    key: max(current[key] - previous[key], 0)
                    for key in current
                }

                _upsert_content_metric(
                    db,
                    post,
                    date.today(),
                    delta,
                    source="youtube_data_api_delta",
                )

            elif (
                not snapshot
                and not db.query(ContentMetric)
                .filter_by(
                    content_post_id=post.id,
                    recorded_on=date.today(),
                )
                .first()
            ):
                _upsert_content_metric(
                    db,
                    post,
                    date.today(),
                    {},
                    source="youtube_data_api_baseline",
                )

        if snapshot is None:
            snapshot = ContentSnapshot(
                content_post_id=post.id
            )
            db.add(snapshot)

        snapshot.latest_views = current["views"]
        snapshot.latest_likes = current["likes"]
        snapshot.latest_comments = current["comments"]
        snapshot.metrics_available = (
            ["views", "likes", "comments"]
            + (
                ["shares", "watch_time_seconds"]
                if analytics_rows
                else []
            )
        )
        snapshot.fetched_at = now
        snapshot.source = "youtube_data_api"

    channel_report = None

    try:
        channel_report = analytics_report(
            access_token,
            {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "metrics": (
                    "views,likes,comments,shares,"
                    "estimatedMinutesWatched,"
                    "subscribersGained,subscribersLost"
                ),
                "dimensions": "day",
                "sort": "day",
                "maxResults": 100,
            },
        )
    except YouTubeProviderError:
        warnings.append(
            "Daily channel history is unavailable; "
            "current channel profile counts were still synced."
        )

    channel_rows = (
        rows_as_dicts(channel_report)
        if channel_report
        else []
    )

    channel_available = (
        [
            "views",
            "likes",
            "comments",
            "shares",
            "watch_time_seconds",
            "subscribers_gained",
            "subscribers_lost",
        ]
        if channel_report
        else ["followers_count"]
    )

    for row in channel_rows:
        try:
            day = iso_day(str(row.get("day", "")))
        except (ValueError, TypeError):
            continue

        entry = (
            db.query(AccountMetric)
            .filter_by(
                social_account_id=social_account.id,
                recorded_on=day,
            )
            .one_or_none()
        )

        fields = {
            "views": _as_int(row.get("views")),
            "likes": _as_int(row.get("likes")),
            "comments": _as_int(row.get("comments")),
            "shares": _as_int(row.get("shares")),
            "watch_time_seconds": (
                _as_int(row.get("estimatedMinutesWatched")) * 60
            ),
            "subscribers_gained": _as_int(
                row.get("subscribersGained")
            ),
            "subscribers_lost": _as_int(
                row.get("subscribersLost")
            ),
            "followers_gained": _as_int(
                row.get("subscribersGained")
            ),
            "followers_lost": _as_int(
                row.get("subscribersLost")
            ),
            "source": "youtube_analytics_api",
            "metrics_available": channel_available,
        }

        if entry is None:
            entry = AccountMetric(
                social_account_id=social_account.id,
                recorded_on=day,
                **fields,
            )
            db.add(entry)
        else:
            for key, value in fields.items():
                setattr(entry, key, value)

    today_metric = (
        db.query(AccountMetric)
        .filter_by(
            social_account_id=social_account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if today_metric is None:
        today_metric = AccountMetric(
            social_account_id=social_account.id,
            recorded_on=date.today(),
            followers_count=social_account.followers_count,
            metrics_available=channel_available,
            source="youtube_data_api_snapshot",
        )
        db.add(today_metric)
    else:
        today_metric.followers_count = (
            social_account.followers_count
        )

    audience_status = {
        "age_distribution": False,
        "gender_distribution": False,
        "geographic_distribution": False,
        "device_distribution": False,
        "active_hours": False,
        "reach": False,
        "impressions": False,
    }

    audience_values: dict[str, dict] = {}

    audience_requests = {
        "demographics": {
            "metrics": "viewerPercentage",
            "dimensions": "ageGroup,gender",
            "maxResults": 100,
        },
        "geography": {
            "metrics": "views",
            "dimensions": "country",
            "sort": "-views",
            "maxResults": 25,
        },
        "devices": {
            "metrics": "views",
            "dimensions": "deviceType",
            "sort": "-views",
            "maxResults": 20,
        },
    }

    for key, request_params in audience_requests.items():
        params = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            **request_params,
        }

        try:
            report = analytics_report(
                access_token,
                params,
            )
            audience_values[key] = rows_as_dicts(report)
        except YouTubeProviderError:
            warnings.append(
                f"Audience {key} report is unavailable "
                "for this channel or date range."
            )
            audience_values[key] = []

    age_distribution: dict[str, float] = {}
    gender_distribution: dict[str, float] = {}

    for row in audience_values.get("demographics", []):
        age = str(row.get("ageGroup", "Unknown"))
        gender = str(row.get("gender", "Unknown"))
        pct = float(row.get("viewerPercentage") or 0)

        age_distribution[age] = round(
            age_distribution.get(age, 0.0) + pct,
            2,
        )
        gender_distribution[gender] = round(
            gender_distribution.get(gender, 0.0) + pct,
            2,
        )

    geography = {
        str(row.get("country", "Unknown")): _as_int(
            row.get("views")
        )
        for row in audience_values.get("geography", [])
    }

    devices = {
        str(row.get("deviceType", "Unknown")): _as_int(
            row.get("views")
        )
        for row in audience_values.get("devices", [])
    }

    audience_status["age_distribution"] = bool(age_distribution)
    audience_status["gender_distribution"] = bool(gender_distribution)
    audience_status["geographic_distribution"] = bool(geography)
    audience_status["device_distribution"] = bool(devices)

    insight = (
        db.query(AudienceInsight)
        .filter_by(
            social_account_id=social_account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if insight is None:
        insight = AudienceInsight(
            social_account_id=social_account.id,
            recorded_on=date.today(),
        )
        db.add(insight)

    # Do not replace useful last-synced data with an empty report.
    if age_distribution:
        insight.age_distribution = age_distribution
    elif insight.age_distribution is None:
        insight.age_distribution = {}

    if gender_distribution:
        insight.gender_distribution = gender_distribution
    elif insight.gender_distribution is None:
        insight.gender_distribution = {}

    if geography:
        insight.geographic_distribution = geography
    elif insight.geographic_distribution is None:
        insight.geographic_distribution = {}

    if devices:
        insight.device_distribution = devices
    elif insight.device_distribution is None:
        insight.device_distribution = {}

    # The supported reports here don't provide audience active hours.
    # Don't substitute invented sample values.
    insight.active_hours = {}
    insight.reach = 0
    insight.impressions = 0
    insight.metrics_available = [
        metric for metric, is_available in audience_status.items()
        if is_available
    ]

    for key, value in audience_status.items():
        if value:
            audience_status[key] = True

    db.flush()

    return {
        "platform": "YouTube",
        "channel_id": actual_channel_id,
        "handle": social_account.handle,
        "followers": social_account.followers_count,
        "videos_synced": len(posts_by_video_id),
        "daily_video_rows_synced": len(analytics_rows),
        "daily_channel_rows_synced": len(channel_rows),
        "audience_available": audience_status,
        "available_content_metrics": [
            "views",
            "likes",
            "comments",
            "shares",
            "watch_time_seconds",
        ],
        "unavailable_content_metrics": [
            "saves",
            "reach",
            "impressions",
        ],
        "warnings": warnings,
        "last_synced_at": now.isoformat(),
    }
