"""LinkedIn OAuth 2.0 + authorized member analytics adapter.

The Analytics/Posts endpoints require the corresponding LinkedIn products and
approved permissions. The adapter reports unavailable metrics explicitly instead
of inventing counts when an application lacks access.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.models import AccountMetric, AudienceInsight, ContentMetric, ContentPost, ContentSnapshot


class LinkedInProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def scopes() -> list[str]:
    return [part.strip() for part in settings.linkedin_oauth_scopes.split() if part.strip()]


def build_authorization_url(state: str) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": settings.linkedin_redirect_uri,
        "state": state,
        "scope": " ".join(scopes()),
    }
    return f"{settings.linkedin_oauth_authorize_url}?{urlencode(params)}"


def _request(method: str, url: str, *, params=None, data=None, bearer=None, rest: bool = False) -> dict:
    headers = {"Accept": "application/json"}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    if rest:
        headers["LinkedIn-Version"] = settings.linkedin_api_version
        headers["X-Restli-Protocol-Version"] = "2.0.0"
    try:
        with httpx.Client(timeout=settings.http_timeout_seconds) as client:
            response = client.request(method, url, params=params, data=data, headers=headers)
    except httpx.RequestError as exc:
        raise LinkedInProviderError("Could not reach LinkedIn. Check connectivity and retry.", 502) from exc
    if response.is_error:
        status = response.status_code
        if status == 401:
            message, mapped = "LinkedIn rejected the access token. Reconnect the account.", 401
        elif status == 403:
            message, mapped = "LinkedIn API permission or product access is missing. Check the approved app scopes and Community Management API access.", 403
        elif status == 429:
            message, mapped = "LinkedIn API rate limit reached. Retry later.", 429
        else:
            message, mapped = f"LinkedIn API request failed (HTTP {status}).", 502
        raise LinkedInProviderError(message, mapped)
    try:
        payload = response.json()
    except ValueError as exc:
        raise LinkedInProviderError("LinkedIn returned invalid JSON.", 502) from exc
    if not isinstance(payload, dict):
        raise LinkedInProviderError("LinkedIn returned an unexpected response format.", 502)
    return payload


def _token_request(data: dict) -> dict:
    payload = _request("POST", settings.linkedin_oauth_token_url, data={
        **data,
        "client_id": settings.linkedin_client_id,
        "client_secret": settings.linkedin_client_secret,
        "redirect_uri": settings.linkedin_redirect_uri,
    })
    if not payload.get("access_token"):
        raise LinkedInProviderError("LinkedIn OAuth did not return an access token.", 502)
    return payload


def exchange_authorization_code(code: str) -> dict:
    return _token_request({"grant_type": "authorization_code", "code": code})


def refresh_access_token(refresh_token: str) -> dict:
    # Refresh tokens are available only for eligible applications/products.
    return _token_request({"grant_type": "refresh_token", "refresh_token": refresh_token})


def api_get(path: str, access_token: str, params: dict | None = None, *, rest: bool = False) -> dict:
    return _request(
        "GET", f"{settings.linkedin_api_base_url.rstrip('/')}/{path.lstrip('/')}",
        params=params, bearer=access_token, rest=rest,
    )


def get_profile(access_token: str) -> dict:
    profile = api_get("v2/userinfo", access_token)
    if not profile.get("sub"):
        raise LinkedInProviderError("LinkedIn profile response did not contain the member ID. Check the OpenID profile permission.", 502)
    return profile


def list_recent_posts(access_token: str, member_id: str) -> list[dict]:
    payload = api_get("rest/posts", access_token, {
        "q": "author",
        "author": f"urn:li:person:{member_id}",
        "count": 10,
        "sortBy": "LAST_MODIFIED",
    }, rest=True)
    return payload.get("elements") or []


def get_post_metric(access_token: str, post_urn: str, metric_type: str) -> int | None:
    payload = api_get("rest/memberCreatorPostAnalytics", access_token, {
        "q": "entity",
        "entity": post_urn,
        "queryType": metric_type,
        "aggregation": "TOTAL",
    }, rest=True)
    # LinkedIn's versioned API schema has represented metricType as either a
    # string or an object; read common value fields defensively.
    for element in payload.get("elements") or []:
        value = element.get("count", element.get("value", element.get("metricValue")))
        if isinstance(value, dict):
            value = value.get("value", value.get("count"))
        try:
            if value is not None:
                return max(0, int(float(value)))
        except (TypeError, ValueError):
            continue
    for key in ("count", "value", "metricValue"):
        value = payload.get(key)
        if isinstance(value, dict):
            value = value.get("value", value.get("count"))
        try:
            if value is not None:
                return max(0, int(float(value)))
        except (TypeError, ValueError):
            continue
    return None


def get_follower_count(access_token: str) -> int | None:
    payload = api_get("rest/memberFollowersCount", access_token, {"q": "me"}, rest=True)
    for element in payload.get("elements") or []:
        for key in ("followerCount", "count", "value"):
            try:
                if element.get(key) is not None:
                    return max(0, int(float(element[key])))
            except (TypeError, ValueError):
                pass
    for key in ("followerCount", "count", "value"):
        try:
            if payload.get(key) is not None:
                return max(0, int(float(payload[key])))
        except (TypeError, ValueError):
            pass
    return None


def _int(value) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def _post_text(post: dict) -> str:
    commentary = post.get("commentary") or post.get("text") or "LinkedIn post"
    if isinstance(commentary, dict):
        commentary = commentary.get("text") or "LinkedIn post"
    return str(commentary)[:250]


def _snapshot_delta(db, post: ContentPost, current: dict, available: list[str]) -> None:
    snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one_or_none()
    today = date.today()
    row = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=today).one_or_none()
    fields = ("views", "likes", "comments", "shares", "saves", "reach", "impressions")
    if snapshot is None:
        if row is None:
            row = ContentMetric(content_post_id=post.id, recorded_on=today)
            db.add(row)
        snapshot = ContentSnapshot(content_post_id=post.id)
        db.add(snapshot)
    else:
        deltas = {
            field: (
                max(_int(current.get(field)) - _int(getattr(snapshot, f"latest_{field}")), 0)
                if field in available
                else 0
            )
            for field in fields
        }
        if row is None:
            row = ContentMetric(
                content_post_id=post.id,
                recorded_on=today,
                metrics_available=available,
                **deltas,
            )
            db.add(row)
        else:
            for field, value in deltas.items():
                setattr(row, field, _int(getattr(row, field)) + value)
            row.metrics_available = sorted(
                set(row.metrics_available or []) | set(available)
            )
        denominator = row.views or row.reach or row.impressions or 0
        row.engagement_rate = round((row.likes + row.comments + row.shares + row.saves) * 100 / denominator, 2) if denominator else 0.0
    for field in fields:
        setattr(snapshot, f"latest_{field}", _int(current.get(field)))
    snapshot.metrics_available = sorted(set(available))
    snapshot.fetched_at = datetime.now(timezone.utc)
    snapshot.source = "linkedin_member_creator_analytics"


def sync_linkedin_account(db, account, access_token: str, member_id: str | None = None) -> dict:
    profile = get_profile(access_token)
    member_id = str(profile.get("sub") or member_id or "")
    if not member_id:
        raise LinkedInProviderError("LinkedIn member ID is missing. Reconnect the account.", 502)
    full_name = str(profile.get("name") or profile.get("given_name") or account.handle or member_id)
    old_followers = account.followers_count
    previous_sync = bool(account.is_connected and account.last_synced_at)
    warnings: list[str] = []
    followers_available = False
    try:
        current_followers_value = get_follower_count(access_token)
        followers_available = current_followers_value is not None
    except LinkedInProviderError as exc:
        current_followers_value = None
        warnings.append(str(exc))
    current_followers = _int(current_followers_value) if followers_available else old_followers
    account.handle = full_name[:120]
    picture = profile.get("picture")
    if picture:
        account.profile_url = account.profile_url or "https://www.linkedin.com/"
    account.followers_count = current_followers
    account.is_connected = True
    now = datetime.now(timezone.utc)
    account.last_synced_at = now

    posts: list[dict] = []
    try:
        posts = list_recent_posts(access_token, member_id)
    except LinkedInProviderError as exc:
        warnings.append(str(exc))
        warnings.append("LinkedIn post retrieval requires approved r_member_social/Community Management API access; profile connection can remain active without it.")

    posts_synced = 0
    analytics_access: bool | None = None
    all_available_metrics: set[str] = set()
    for item in posts:
        urn = str(item.get("id") or "")
        if not urn:
            continue
        post = db.query(ContentPost).filter_by(external_post_id=urn).one_or_none()
        if post is not None and post.social_account_id != account.id:
            warnings.append("A LinkedIn post linked to another account was skipped.")
            continue
        if post is None:
            post = ContentPost(social_account_id=account.id, external_post_id=urn, title=_post_text(item), content_type="Post")
            db.add(post)
            db.flush()
        else:
            post.title = _post_text(item)
        post.post_url = f"https://www.linkedin.com/feed/update/{urn}/"
        created_at = item.get("createdAt")
        try:
            post.published_at = datetime.fromtimestamp(int(created_at) / 1000, timezone.utc) if created_at is not None else None
        except (TypeError, ValueError, OSError):
            post.published_at = None

        metric_values: dict[str, int] = {}
        if analytics_access is not False:
            for metric_name, field in (("IMPRESSION", "views"), ("MEMBERS_REACHED", "reach"), ("REACTION", "likes"), ("COMMENT", "comments"), ("RESHARE", "shares")):
                try:
                    value = get_post_metric(access_token, urn, metric_name)
                    if value is not None:
                        metric_values[field] = value
                    analytics_access = True
                except LinkedInProviderError as exc:
                    analytics_access = False
                    warnings.append(str(exc))
                    warnings.append("LinkedIn post metrics require approved r_member_postAnalytics access; unavailable metrics are not fabricated.")
                    break
        current = {"views": metric_values.get("views", 0), "likes": metric_values.get("likes", 0), "comments": metric_values.get("comments", 0), "shares": metric_values.get("shares", 0), "saves": 0, "reach": metric_values.get("reach", 0), "impressions": metric_values.get("views", 0)}
        available_fields = list(metric_values.keys()) + (["impressions"] if "views" in metric_values else [])
        all_available_metrics.update(available_fields)
        _snapshot_delta(db, post, current, available_fields)
        posts_synced += 1

    follower_delta_available = followers_available and previous_sync
    gained = max(current_followers - old_followers, 0) if follower_delta_available else 0
    lost = max(old_followers - current_followers, 0) if follower_delta_available else 0
    daily = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one_or_none()
    available_account_metrics = (["followers_count"] if followers_available else []) + (["followers_gained", "followers_lost"] if follower_delta_available else [])
    if daily is None:
        db.add(AccountMetric(
            social_account_id=account.id, recorded_on=date.today(),
            followers_count=current_followers if followers_available else None,
            followers_gained=gained, followers_lost=lost,
            metrics_available=available_account_metrics,
            source="linkedin_member_analytics",
        ))
    else:
        if followers_available:
            daily.followers_count = current_followers
            if follower_delta_available:
                daily.followers_gained += gained
                daily.followers_lost += lost
            daily.metrics_available = sorted(set(daily.metrics_available or []) | set(available_account_metrics))
    insight = db.query(AudienceInsight).filter_by(social_account_id=account.id, recorded_on=date.today()).one_or_none()
    if insight is None:
        db.add(AudienceInsight(social_account_id=account.id, recorded_on=date.today()))
    db.flush()
    return {
        "platform": "LinkedIn", "provider_account_id": member_id, "handle": account.handle,
        "followers": account.followers_count, "posts_synced": posts_synced,
        "available_content_metrics": sorted(all_available_metrics),
        "unavailable_content_metrics": ["audience demographics", "device distribution", "active hours"],
        "warnings": warnings + ["LinkedIn creator analytics depend on the Community Management API products and granted scopes. First sync establishes metric baselines; daily deltas start on later syncs."],
        "last_synced_at": now.isoformat(),
    }
