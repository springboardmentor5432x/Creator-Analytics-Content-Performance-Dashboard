
"""Facebook Pages Graph API adapter; page tokens are always stored encrypted."""
from __future__ import annotations

from datetime import date, datetime, timezone
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.models import (
    AccountMetric,
    AudienceInsight,
    ContentMetric,
    ContentPost,
    ContentSnapshot,
)

# Meta deprecated the standalone read_insights permission and many apps now get
# "Invalid Scopes" for pages_read_user_content. Page post/insight access is
# covered by pages_read_engagement.
FACEBOOK_SCOPES = (
    "pages_show_list",
    "pages_read_engagement",
)


class FacebookProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _version_base() -> str:
    return (
        f"{settings.facebook_graph_api_base_url.rstrip('/')}/"
        f"{settings.meta_graph_api_version}"
    )


def build_authorization_url(state: str) -> str:
    """Build a Facebook OAuth URL with either Business Login config or scopes."""

    config_id = getattr(
        settings,
        "facebook_oauth_config_id",
        "",
    ).strip()

    params = {
        "client_id": settings.meta_oauth_client_id,
        "redirect_uri": settings.facebook_oauth_redirect_uri,
        "response_type": "code",
        "state": state,
    }
    if config_id:
        params["config_id"] = config_id
    else:
        params["scope"] = ",".join(FACEBOOK_SCOPES)

    return (
        f"{settings.facebook_oauth_authorize_url.rstrip('/')}/"
        f"{settings.meta_graph_api_version}/dialog/oauth?"
        f"{urlencode(params)}"
    )


def _request(
    method: str,
    url: str,
    *,
    params=None,
    data=None,
    json=None,
    bearer=None,
) -> dict:
    headers = (
        {"Authorization": f"Bearer {bearer}"}
        if bearer
        else {}
    )

    try:
        with httpx.Client(
            timeout=settings.http_timeout_seconds
        ) as client:
            response = client.request(
                method,
                url,
                params=params,
                data=data,
                json=json,
                headers=headers,
            )

    except httpx.RequestError as exc:
        raise FacebookProviderError(
            "Could not reach Facebook. Check connectivity and retry.",
            502,
        ) from exc

    if response.is_error:
        code = response.status_code

        if code == 401:
            message, mapped = (
                "Facebook rejected the Page token. Reconnect the Page.",
                401,
            )
        elif code == 403:
            message, mapped = (
                "Facebook Page permissions or app review are missing.",
                403,
            )
        elif code == 429:
            message, mapped = (
                "Facebook API rate limit reached. Retry later.",
                429,
            )
        else:
            message, mapped = (
                f"Facebook Graph API request failed (HTTP {code}).",
                502,
            )

        raise FacebookProviderError(message, mapped)

    try:
        payload = response.json()

    except ValueError as exc:
        raise FacebookProviderError(
            "Facebook returned invalid JSON.",
            502,
        ) from exc

    if isinstance(payload, dict) and payload.get("error"):
        error = payload["error"]
        code = int(error.get("code", 0) or 0)

        mapped = (
            401 if code in (190, 102)
            else 403 if code in (10, 200)
            else 502
        )

        raise FacebookProviderError(
            "Facebook API rejected this request. "
            "Check Page access and granted permissions.",
            mapped,
        )

    return payload


def graph_get(
    path: str,
    access_token: str,
    params: dict | None = None,
) -> dict:
    return _request(
        "GET",
        f"{_version_base()}/{path.lstrip('/')}",
        params={
            **(params or {}),
            "access_token": access_token,
        },
    )


def exchange_authorization_code(code: str) -> dict:
    """Exchange authorization code and obtain a long-lived user token."""

    short_token = _request(
        "GET",
        f"{_version_base()}/oauth/access_token",
        params={
            "client_id": settings.meta_oauth_client_id,
            "client_secret": settings.meta_oauth_client_secret,
            "redirect_uri": settings.facebook_oauth_redirect_uri,
            "code": code,
        },
    )

    access_token = short_token.get("access_token")

    if not access_token:
        raise FacebookProviderError(
            "Facebook OAuth did not return an access token.",
            502,
        )

    long_token = _request(
        "GET",
        f"{_version_base()}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": settings.meta_oauth_client_id,
            "client_secret": settings.meta_oauth_client_secret,
            "fb_exchange_token": access_token,
        },
    )

    if not long_token.get("access_token"):
        raise FacebookProviderError(
            "Facebook long-lived token exchange failed.",
            502,
        )

    return long_token


def list_managed_pages(
    user_access_token: str,
) -> list[dict]:
    """Return authorized Pages and their Page-specific access tokens."""

    url = f"{_version_base()}/me/accounts"

    params = {
        "fields": "id,name,access_token,fan_count,link",
        "limit": 100,
        "access_token": user_access_token,
    }

    pages: list[dict] = []

    for _ in range(10):
        try:
            payload = _request(
                "GET",
                url,
                params=params,
            )

        except FacebookProviderError:
            if (
                url.rstrip("/").endswith("/me/accounts")
                and params is not None
                and "fan_count" in str(params.get("fields", ""))
            ):
                params = {
                    **params,
                    "fields": "id,name,access_token,link",
                }

                payload = _request(
                    "GET",
                    url,
                    params=params,
                )
            else:
                raise

        pages.extend(
            item
            for item in (payload.get("data") or [])
            if item.get("id") and item.get("access_token")
        )

        next_url = (
            payload.get("paging") or {}
        ).get("next")

        if not next_url:
            break

        url = next_url
        params = None

    return pages


def get_instagram_business_account_id(
    page_id: str,
    page_access_token: str,
) -> str | None:
    """Return the Instagram professional account linked to a Facebook Page."""
    page = graph_get(
        page_id,
        page_access_token,
        {"fields": "instagram_business_account"},
    )
    instagram_account = page.get("instagram_business_account") or {}
    account_id = instagram_account.get("id")
    return str(account_id) if account_id else None


def _int(value) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _summary_count(value) -> int:
    if not isinstance(value, dict):
        return 0

    summary = value.get("summary") or {}
    return _int(summary.get("total_count"))


def _insight_value(row: dict):
    total_value = row.get("total_value")

    if (
        isinstance(total_value, dict)
        and total_value.get("value") is not None
    ):
        return total_value.get("value")

    values = row.get("values") or []

    return values[-1].get("value") if values else None


def _snapshot_delta(
    db,
    post: ContentPost,
    current: dict,
    available: list[str],
) -> None:
    snapshot = (
        db.query(ContentSnapshot)
        .filter_by(content_post_id=post.id)
        .one_or_none()
    )

    today_row = (
        db.query(ContentMetric)
        .filter_by(
            content_post_id=post.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if snapshot is None:
        if today_row is None:
            today_row = ContentMetric(
                content_post_id=post.id,
                recorded_on=date.today(),
            )
            db.add(today_row)

        snapshot = ContentSnapshot(
            content_post_id=post.id
        )
        db.add(snapshot)

    else:
        deltas = {
            field: (
                max(
                    current[field]
                    - (
                        getattr(
                            snapshot,
                            f"latest_{field}",
                        ) or 0
                    ),
                    0,
                )
                if field in available
                else 0
            )
            for field in (
                "views",
                "likes",
                "comments",
                "shares",
                "saves",
                "reach",
                "impressions",
            )
        }

        if today_row is None:
            today_row = ContentMetric(
                content_post_id=post.id,
                recorded_on=date.today(),
                metrics_available=available,
                **deltas,
            )
            db.add(today_row)

        else:
            for field, value in deltas.items():
                setattr(
                    today_row,
                    field,
                    int(getattr(today_row, field) or 0) + value,
                )

            today_row.metrics_available = sorted(
                set(today_row.metrics_available or [])
                | set(available)
            )

        denominator = (
            today_row.views
            or today_row.reach
            or today_row.impressions
            or 0
        )

        today_row.engagement_rate = (
            round(
                (
                    today_row.likes
                    + today_row.comments
                    + today_row.shares
                ) * 100 / denominator,
                2,
            )
            if denominator
            else 0.0
        )

    snapshot.latest_views = current["views"]
    snapshot.latest_likes = current["likes"]
    snapshot.latest_comments = current["comments"]
    snapshot.latest_shares = current["shares"]
    snapshot.latest_saves = 0
    snapshot.latest_reach = current.get("reach", 0)
    snapshot.latest_impressions = current.get("impressions", 0)
    snapshot.metrics_available = list(available)
    snapshot.fetched_at = datetime.now(timezone.utc)
    snapshot.source = "facebook_graph_api"


def sync_facebook_page(
    db,
    account,
    page_access_token: str,
) -> dict:
    """Sync one Facebook Page and its recent posts."""

    page_id = str(
        account
        and getattr(account, "_provider_account_id", "")
        or ""
    )

    if not page_id:
        raise FacebookProviderError(
            "Facebook Page ID is missing. Reconnect the Page.",
            409,
        )

    page = graph_get(
        page_id,
        page_access_token,
        {"fields": "id,name,fan_count,link"},
    )

    old_followers = account.followers_count
    followers_available = page.get("fan_count") is not None

    followers = (
        _int(page.get("fan_count"))
        if followers_available
        else old_followers
    )

    was_synced = bool(
        account.is_connected and account.last_synced_at
    )

    account.handle = str(
        page.get("name") or account.handle
    )[:120]

    account.profile_url = (
        page.get("link") or account.profile_url
    )

    account.followers_count = followers
    account.is_connected = True

    now = datetime.now(timezone.utc)
    account.last_synced_at = now

    posts_data = graph_get(
        f"{page_id}/posts",
        page_access_token,
        {
            "fields": (
                "id,message,permalink_url,created_time,shares,"
                "likes.limit(0).summary(true),"
                "comments.limit(0).summary(true)"
            ),
            "limit": 25,
        },
    )

    warnings: list[str] = []
    synced = 0

    for item in posts_data.get("data") or []:
        post_id = str(item.get("id") or "")

        if not post_id:
            continue

        post = (
            db.query(ContentPost)
            .filter_by(external_post_id=post_id)
            .one_or_none()
        )

        if (
            post is not None
            and post.social_account_id != account.id
        ):
            warnings.append(
                "A Facebook post linked to another profile was skipped."
            )
            continue

        if post is None:
            post = ContentPost(
                social_account_id=account.id,
                external_post_id=post_id,
                title=(
                    item.get("message")
                    or "Facebook Page post"
                )[:250],
                content_type="Post",
            )

            db.add(post)
            db.flush()

        else:
            post.title = (
                item.get("message")
                or "Facebook Page post"
            )[:250]

        post.post_url = item.get("permalink_url")

        try:
            published = item.get("created_time")

            post.published_at = (
                datetime.fromisoformat(
                    published.replace("Z", "+00:00")
                )
                if published
                else None
            )

        except (ValueError, AttributeError):
            post.published_at = None

        likes = _summary_count(item.get("likes"))
        comments = _summary_count(item.get("comments"))

        shares_raw = item.get("shares")
        shares = (
            _int(shares_raw.get("count"))
            if isinstance(shares_raw, dict)
            else 0
        )

        current = {
            "views": 0,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "saves": 0,
            "reach": 0,
            "impressions": 0,
        }

        available = ["likes", "comments"]

        if isinstance(shares_raw, dict):
            available.append("shares")

        try:
            # Current Meta media-view metrics; legacy impression metrics
            # are no longer used here.
            insights = graph_get(
                f"{post_id}/insights",
                page_access_token,
                {
                    "metric": (
                        "post_media_view,"
                        "post_total_media_view_unique"
                    ),
                },
            )

            for row in insights.get("data") or []:
                name = row.get("name")
                value = _insight_value(row)

                if value is None:
                    continue

                if name in {"post_media_view", "post_impressions"}:
                    current["views"] = _int(value)
                    available.append("views")
                    if name == "post_impressions":
                        current["impressions"] = _int(value)
                        available.append("impressions")

                elif name in {
                    "post_total_media_view_unique",
                    "post_impressions_unique",
                }:
                    current["reach"] = _int(value)
                    available.append("reach")

        except FacebookProviderError:
            warnings.append(
                "Some Facebook post media-view Insights were unavailable "
                "for this Page or app permission level."
            )

        _snapshot_delta(
            db,
            post,
            current,
            sorted(set(available)),
        )

        synced += 1

    account_metric = (
        db.query(AccountMetric)
        .filter_by(
            social_account_id=account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    gained = (
        max(followers - old_followers, 0)
        if followers_available and was_synced
        else 0
    )

    lost = (
        max(old_followers - followers, 0)
        if followers_available and was_synced
        else 0
    )

    if account_metric is None:
        account_metric = AccountMetric(
            social_account_id=account.id,
            recorded_on=date.today(),
            followers_count=(
                followers if followers_available else None
            ),
            followers_gained=gained,
            followers_lost=lost,
            source="facebook_graph_api_snapshot",
            metrics_available=(
                [
                    "followers_count",
                    "followers_gained",
                    "followers_lost",
                ]
                if followers_available and was_synced
                else (
                    ["followers_count"]
                    if followers_available
                    else []
                )
            ),
        )

        db.add(account_metric)

    elif followers_available:
        account_metric.followers_count = followers

        if was_synced:
            account_metric.followers_gained += gained
            account_metric.followers_lost += lost

    audience = (
        db.query(AudienceInsight)
        .filter_by(
            social_account_id=account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if audience is None:
        db.add(
            AudienceInsight(
                social_account_id=account.id,
                recorded_on=date.today(),
            )
        )

    db.flush()

    return {
        "platform": "Facebook",
        "provider_account_id": page_id,
        "handle": account.handle,
        "followers": account.followers_count,
        "posts_synced": synced,
        "available_content_metrics": [
            "likes",
            "comments",
            "shares",
            "views",
            "reach",
        ],
        "unavailable_content_metrics": [
            "legacy impressions",
            "video watch time",
            "audience demographics",
        ],
        "warnings": warnings + [
            (
                "Page Insights depend on app review, granted permissions "
                "and current Graph API metric availability."
            ),
            (
                "First sync saves a cumulative baseline; daily deltas "
                "begin on later syncs."
            ),
        ],
        "last_synced_at": now.isoformat(),
    }
