
"""Instagram API adapter using Instagram API with Unified Login.

Unified Login uses one Facebook Login for Business configuration (``config_id``).
The client signs in with Instagram or Facebook, selects the business portfolio
and the Instagram professional account, and the app receives a Business
Integration System User Access Token (SUAT) for ``graph.facebook.com``.

The Instagram professional account must belong to a business portfolio. A
Facebook Page link is not required.
"""
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


# Permissions requested by the Unified Login configuration.
INSTAGRAM_SCOPES = (
    "instagram_basic",
    "instagram_manage_insights",
    "instagram_manage_messages",
)


class InstagramProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def build_authorization_url(state: str) -> str:
    """Build the Unified Login URL (Facebook Login for Business + config_id)."""

    if not settings.instagram_client_id:
        raise InstagramProviderError(
            "Instagram Meta app ID is missing. "
            "Set INSTAGRAM_CLIENT_ID in backend/.env.",
            503,
        )

    if not settings.instagram_config_id:
        raise InstagramProviderError(
            "Instagram Unified Login configuration ID is missing. "
            "Set INSTAGRAM_CONFIG_ID in backend/.env.",
            503,
        )

    params = {
        "client_id": settings.instagram_client_id,
        "config_id": settings.instagram_config_id,
        "redirect_uri": settings.instagram_redirect_uri,
        "response_type": "code",
        "state": state,
        "prompt": "login",
    }

    return (
        f"https://www.facebook.com/"
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
        raise InstagramProviderError(
            "Could not reach Meta Graph API. Check connectivity and retry.",
            502,
        ) from exc

    if response.is_error:
        status_code = response.status_code

        provider_message = ""

        try:
            error_payload = response.json()
        except ValueError:
            error_payload = {}

        if isinstance(error_payload, dict):
            provider_message = str(
                error_payload.get("error_message")
                or (error_payload.get("error") or {}).get("message")
                or ""
            ).strip()

        if status_code == 401:
            message, code = (
                "Meta rejected the Instagram integration token. "
                "Reconnect the account.",
                401,
            )
        elif status_code == 403:
            message, code = (
                "Meta permission/API access is unavailable. "
                "Check the Unified Login configuration and shared assets.",
                403,
            )
        elif status_code == 429:
            message, code = (
                "Meta Graph API rate limit reached. Retry later.",
                429,
            )
        else:
            message, code = (
                f"Meta Graph API request failed (HTTP {status_code}).",
                502,
            )

        if provider_message:
            message = f"{message} {provider_message[:300]}"

        raise InstagramProviderError(message, code)

    try:
        result = response.json()
    except ValueError as exc:
        raise InstagramProviderError(
            "Meta Graph API returned invalid JSON.",
            502,
        ) from exc

    if isinstance(result, dict) and (
        result.get("error") or result.get("error_type")
    ):
        error = result.get("error") or {}
        error_code = int(
            error.get("code")
            or result.get("code")
            or 0
        )

        status_code = (
            401 if error_code in (190, 102)
            else 403 if error_code in (10, 200)
            else 502
        )

        provider_message = str(
            error.get("message")
            or result.get("error_message")
            or ""
        ).strip()

        message = (
            "Meta rejected this Instagram request. "
            "Check the granted permissions and shared business assets."
        )

        if provider_message:
            message = f"{message} {provider_message[:300]}"

        raise InstagramProviderError(message, status_code)

    return result


def graph_get(
    path: str,
    access_token: str,
    params: dict | None = None,
) -> dict:
    url = (
        f"{settings.facebook_graph_api_base_url.rstrip('/')}/"
        f"{settings.meta_graph_api_version}/"
        f"{path.lstrip('/')}"
    )

    request_params = {
        **(params or {}),
        "access_token": access_token,
    }

    return _request(
        "GET",
        url,
        params=request_params,
    )


def _unwrap_payload(payload: dict) -> dict:
    """Return a flat dict for endpoints that wrap the object in ``data``.

    The Instagram token endpoint and the ``/me`` example in Meta's docs return
    ``{"data": [{...}]}`` instead of a top-level object.
    """

    if not isinstance(payload, dict):
        return {}

    data = payload.get("data")

    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
        return data[0]

    return payload


def exchange_authorization_code(code: str) -> dict:
    """Exchange the Unified Login code for a Business Integration SUAT."""

    token_data = _unwrap_payload(
        _request(
            "GET",
            (
                f"{settings.facebook_graph_api_base_url.rstrip('/')}/"
                f"{settings.meta_graph_api_version}/oauth/access_token"
            ),
            params={
                "client_id": settings.instagram_client_id,
                "client_secret": settings.instagram_client_secret,
                "code": code,
                "redirect_uri": settings.instagram_redirect_uri,
            },
        )
    )

    if not token_data.get("access_token"):
        raise InstagramProviderError(
            "Meta OAuth did not return an access token.",
            502,
        )

    return token_data


def get_client_business_id(access_token: str) -> str:
    """Return the business portfolio that owns the shared Instagram assets."""

    data = _unwrap_payload(
        graph_get(
            "me",
            access_token,
            {"fields": "client_business_id"},
        )
    )

    business_id = str(data.get("client_business_id") or "")

    if not business_id:
        raise InstagramProviderError(
            "Meta did not return the connected business portfolio ID. "
            "Reconnect and select the business portfolio that owns the "
            "Instagram account.",
            502,
        )

    return business_id


def list_assigned_instagram_accounts(access_token: str) -> list[dict]:
    """List Instagram accounts shared with the app through Unified Login."""

    url = (
        f"{settings.facebook_graph_api_base_url.rstrip('/')}/"
        f"{settings.meta_graph_api_version}/"
        f"me/assigned_instagram_accounts"
    )

    params = {
        "fields": "id,username",
        "limit": 100,
        "access_token": access_token,
    }

    accounts = []

    for _ in range(10):
        payload = _request(
            "GET",
            url,
            params=params,
        )

        accounts.extend(
            item
            for item in (payload.get("data") or [])
            if item.get("id") and item.get("username")
        )

        next_url = (payload.get("paging") or {}).get("next")

        if not next_url:
            break

        url = next_url
        params = {}

    return accounts


def get_profile(
    access_token: str,
    instagram_user_id: str | None = None,
) -> dict:
    # Unified Login callers pass the shared Instagram account ID explicitly.
    instagram_user_id = instagram_user_id or "me"

    try:
        profile = graph_get(
            instagram_user_id,
            access_token,
            {
                "fields": (
                    "id,user_id,username,account_type,"
                    "media_count,followers_count"
                )
            },
        )

    except InstagramProviderError:
        profile = graph_get(
            instagram_user_id,
            access_token,
            {
                "fields": (
                    "id,user_id,username,account_type,media_count"
                )
            },
        )

    return _unwrap_payload(profile)


def _int(value) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _insight_values(payload: dict) -> dict:
    output = {}

    for item in payload.get("data", []) or []:
        name = item.get("name")
        value = item.get("total_value", {}).get("value")

        if value is None:
            values = item.get("values") or []
            if values:
                value = values[-1].get("value")

        if name is not None and value is not None:
            output[name] = _int(value)

    return output


def sync_instagram_account(
    db,
    account,
    access_token: str,
    instagram_user_id: str | None = None,
) -> dict:
    """Fetch Instagram profile, media and available insights."""

    profile = (
        get_profile(access_token, instagram_user_id)
        if instagram_user_id
        else get_profile(access_token)
    )

    user_id = str(profile.get("user_id") or profile.get("id") or "")
    media_owner_id = instagram_user_id or "me"
    username = (
        profile.get("username")
        or account.handle.lstrip("@")
    )

    if not user_id:
        raise InstagramProviderError(
            "Instagram profile ID is missing.",
            502,
        )

    old_followers = account.followers_count or 0
    previously_synced = bool(
        account.is_connected and account.last_synced_at
    )

    followers_value = profile.get("followers_count")
    followers_available = followers_value is not None

    current_followers = (
        _int(followers_value)
        if followers_available
        else old_followers
    )

    account.handle = f"@{username.lstrip('@')}"
    account.profile_url = (
        f"https://www.instagram.com/{username.lstrip('@')}/"
    )
    account.followers_count = current_followers
    account.is_connected = True

    now = datetime.now(timezone.utc)
    account.last_synced_at = now

    media_data = graph_get(
        f"{media_owner_id}/media",
        access_token,
        {
            "fields": (
                "id,caption,media_type,permalink,timestamp,"
                "like_count,comments_count,media_product_type"
            ),
            "limit": 25,
        },
    )

    warnings = []
    synced_count = 0
    media_insights_available = False

    for item in media_data.get("data") or []:
        media_id = str(item.get("id") or "")

        if not media_id:
            continue

        post = (
            db.query(ContentPost)
            .filter_by(external_post_id=media_id)
            .one_or_none()
        )

        if post is not None and post.social_account_id != account.id:
            warnings.append(
                "Media item linked to another account was skipped."
            )
            continue

        if post is None:
            post = ContentPost(
                social_account_id=account.id,
                external_post_id=media_id,
                title=(
                    item.get("caption")
                    or item.get("media_type")
                    or "Instagram post"
                )[:250],
                content_type=str(
                    item.get("media_product_type")
                    or item.get("media_type")
                    or "Post"
                ),
            )

            db.add(post)
            db.flush()

        else:
            post.title = (
                item.get("caption")
                or item.get("media_type")
                or "Instagram post"
            )[:250]

            post.content_type = str(
                item.get("media_product_type")
                or item.get("media_type")
                or post.content_type
            )

        post.post_url = item.get("permalink")
        post.published_at = None

        if item.get("timestamp"):
            try:
                post.published_at = datetime.fromisoformat(
                    str(item["timestamp"]).replace("Z", "+00:00")
                )
            except ValueError:
                pass

        raw = {
            "views": _int(
                item.get("views") or item.get("video_views")
            ),
            "likes": _int(item.get("like_count")),
            "comments": _int(item.get("comments_count")),
            "shares": 0,
            "saves": 0,
            "reach": 0,
            "impressions": 0,
        }

        item_insights = {}

        try:
            insight = graph_get(
                f"{media_id}/insights",
                access_token,
                {
                    "metric": (
                        "reach,saved,shares,total_interactions,views"
                    ),
                    "metric_type": "total_value",
                },
            )

            item_insights = _insight_values(insight)

            raw["reach"] = item_insights.get("reach", 0)
            raw["saves"] = item_insights.get("saved", 0)
            raw["shares"] = item_insights.get("shares", 0)
            raw["views"] = item_insights.get(
                "views",
                raw["views"],
            )

            media_insights_available = (
                media_insights_available or bool(item_insights)
            )

        except InstagramProviderError:
            # Keep media metadata even if insights are unavailable.
            pass

        available = []

        if item.get("like_count") is not None:
            available.append("likes")

        if item.get("comments_count") is not None:
            available.append("comments")

        if (
            "views" in item_insights
            or item.get("views") is not None
            or item.get("video_views") is not None
        ):
            available.append("views")

        for metric_name, source_name in (
            ("shares", "shares"),
            ("saves", "saved"),
            ("reach", "reach"),
        ):
            if source_name in item_insights:
                available.append(metric_name)

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

        if snapshot is not None:
            deltas = {
                "views": (
                    max(raw["views"] - snapshot.latest_views, 0)
                    if "views" in available else 0
                ),
                "likes": (
                    max(raw["likes"] - snapshot.latest_likes, 0)
                    if "likes" in available else 0
                ),
                "comments": (
                    max(raw["comments"] - snapshot.latest_comments, 0)
                    if "comments" in available else 0
                ),
                "shares": (
                    max(raw["shares"] - snapshot.latest_shares, 0)
                    if "shares" in available else 0
                ),
                "saves": (
                    max(raw["saves"] - snapshot.latest_saves, 0)
                    if "saves" in available else 0
                ),
                "reach": (
                    max(raw["reach"] - snapshot.latest_reach, 0)
                    if "reach" in available else 0
                ),
                "impressions": (
                    max(
                        raw["impressions"]
                        - snapshot.latest_impressions,
                        0,
                    )
                    if "impressions" in available else 0
                ),
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
                        + today_row.saves
                    ) * 100 / denominator,
                    2,
                )
                if denominator else 0.0
            )

        elif today_row is None:
            # First sync establishes a baseline. Lifetime totals are
            # deliberately not treated as today's engagement.
            today_row = ContentMetric(
                content_post_id=post.id,
                recorded_on=date.today(),
            )

            db.add(today_row)
            today_row.engagement_rate = 0.0

        if snapshot is None:
            snapshot = ContentSnapshot(
                content_post_id=post.id
            )
            db.add(snapshot)

        snapshot.latest_views = raw["views"]
        snapshot.latest_likes = raw["likes"]
        snapshot.latest_comments = raw["comments"]
        snapshot.latest_shares = raw["shares"]
        snapshot.latest_saves = raw["saves"]
        snapshot.latest_reach = raw["reach"]
        snapshot.latest_impressions = raw["impressions"]
        snapshot.metrics_available = available
        snapshot.fetched_at = now
        snapshot.source = "instagram_unified_login"

        synced_count += 1

    account_metric = (
        db.query(AccountMetric)
        .filter_by(
            social_account_id=account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if account_metric is None:
        account_metric = AccountMetric(
            social_account_id=account.id,
            recorded_on=date.today(),
            followers_count=(
                current_followers if followers_available else None
            ),
            followers_gained=(
                max(current_followers - old_followers, 0)
                if followers_available and previously_synced else 0
            ),
            followers_lost=(
                max(old_followers - current_followers, 0)
                if followers_available and previously_synced else 0
            ),
            source="instagram_api_snapshot",
            metrics_available=(
                [
                    "followers_count",
                    "followers_gained",
                    "followers_lost",
                ]
                if followers_available and previously_synced
                else (
                    ["followers_count"]
                    if followers_available
                    else []
                )
            ),
        )

        db.add(account_metric)

    else:
        if followers_available:
            account_metric.followers_count = current_followers

            if previously_synced:
                account_metric.followers_gained += max(
                    current_followers - old_followers,
                    0,
                )

                account_metric.followers_lost += max(
                    old_followers - current_followers,
                    0,
                )

                account_metric.metrics_available = list(
                    set(account_metric.metrics_available or [])
                    | {
                        "followers_count",
                        "followers_gained",
                        "followers_lost",
                    }
                )

    audience_insight = (
        db.query(AudienceInsight)
        .filter_by(
            social_account_id=account.id,
            recorded_on=date.today(),
        )
        .one_or_none()
    )

    if audience_insight is None:
        audience_insight = AudienceInsight(
            social_account_id=account.id,
            recorded_on=date.today(),
        )

        db.add(audience_insight)

    audience_insight.active_hours = {}

    db.flush()

    return {
        "platform": "Instagram",
        "provider_account_id": user_id,
        "handle": account.handle,
        "followers": account.followers_count,
        "posts_synced": synced_count,
        "available_content_metrics": (
            ["likes", "comments"]
            + (
                ["views", "shares", "saves", "reach"]
                if media_insights_available
                else []
            )
        ),
        "unavailable_content_metrics": [
            "watch_time_seconds",
            "impressions",
            "audience_active_hours",
        ],
        "auth_method": "unified_login",
        "warnings": (
            warnings
            + (
                []
                if media_insights_available
                else [
                    "Instagram media insights were not returned; "
                    "available media counts were synced."
                ]
            )
        ),
        "last_synced_at": now.isoformat(),
    }
