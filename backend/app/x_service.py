"""X API v2 adapter using OAuth 2.0 authorization-code flow with PKCE."""
from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import date, datetime, timezone
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.models import AccountMetric, AudienceInsight, ContentMetric, ContentPost, ContentSnapshot

X_SCOPES = ("users.read", "tweet.read", "offline.access")


class XProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def derive_code_verifier(raw_state: str) -> str:
    """Derive a stable PKCE verifier from the one-time random state and app secret.

    The verifier is not stored in plaintext in the database. The random state has
    enough entropy to prevent guessing, and the HMAC binds the verifier to the
    configured server secret. Both callback validation and the initial request
    derive the same verifier from the raw state.
    """
    secret = settings.jwt_secret_key.encode("utf-8")
    digest = hmac.new(secret, ("creatoriq-x-pkce:" + raw_state).encode("utf-8"), hashlib.sha256).digest()
    return _b64url(digest)


def build_authorization_url(state: str, code_verifier: str) -> str:
    challenge = _b64url(hashlib.sha256(code_verifier.encode("ascii")).digest())
    params = {
        "response_type": "code",
        "client_id": settings.x_client_id,
        "redirect_uri": settings.x_redirect_uri,
        "scope": " ".join(X_SCOPES),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return f"{settings.x_oauth_authorize_url}?{urlencode(params)}"


def _request(method: str, url: str, *, params=None, data=None, bearer=None, auth=None) -> dict:
    headers = {"Authorization": f"Bearer {bearer}"} if bearer else {}
    try:
        with httpx.Client(timeout=settings.http_timeout_seconds) as client:
            response = client.request(method, url, params=params, data=data, headers=headers, auth=auth)
    except httpx.RequestError as exc:
        raise XProviderError("Could not reach the X API. Check connectivity and retry.", 502) from exc
    if response.is_error:
        code = response.status_code
        if code == 401:
            message, mapped = "X rejected the access token. Reconnect the account.", 401
        elif code == 403:
            message, mapped = "X API access or endpoint permission is unavailable for this developer project.", 403
        elif code == 429:
            message, mapped = "X API rate limit or usage limit reached. Retry later or check the developer plan.", 429
        else:
            message, mapped = f"X API request failed (HTTP {code}).", 502
        raise XProviderError(message, mapped)
    try:
        payload = response.json()
    except ValueError as exc:
        raise XProviderError("X returned invalid JSON.", 502) from exc
    if not isinstance(payload, dict):
        raise XProviderError("X returned an unexpected response format.", 502)
    if payload.get("errors") or payload.get("title") == "Forbidden":
        raise XProviderError("X API rejected the request. Check app scopes, account access, and usage limits.", 403)
    return payload


def exchange_authorization_code(code: str, code_verifier: str) -> dict:
    payload = _request(
        "POST",
        settings.x_oauth_token_url,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.x_redirect_uri,
            "code_verifier": code_verifier,
        },
        auth=(settings.x_client_id, settings.x_client_secret),
    )
    if not payload.get("access_token"):
        raise XProviderError("X OAuth did not return an access token.", 502)
    return payload


def refresh_access_token(refresh_token: str) -> dict:
    payload = _request(
        "POST",
        settings.x_oauth_token_url,
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        auth=(settings.x_client_id, settings.x_client_secret),
    )
    if not payload.get("access_token"):
        raise XProviderError("X token refresh did not return an access token.", 502)
    return payload


def api_get(path: str, access_token: str, params: dict | None = None) -> dict:
    return _request("GET", f"{settings.x_api_base_url.rstrip('/')}/{path.lstrip('/')}", params=params, bearer=access_token)


def _int(value) -> int:
    try:
        return max(0, int(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def get_profile(access_token: str) -> dict:
    payload = api_get("users/me", access_token, {
        "user.fields": "id,name,username,description,profile_image_url,url,created_at,public_metrics",
    })
    profile = payload.get("data") or {}
    if not profile.get("id") or not profile.get("username"):
        raise XProviderError("X profile response did not include user identity. Verify users.read scope.", 502)
    return profile


def list_recent_posts(access_token: str, user_id: str) -> list[dict]:
    payload = api_get(f"users/{user_id}/tweets", access_token, {
        "max_results": 25,
        "tweet.fields": "created_at,public_metrics,non_public_metrics,organic_metrics,entities",
    })
    return payload.get("data") or []


def _snapshot_delta(db, post: ContentPost, current: dict, available: list[str]) -> None:
    snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one_or_none()
    today = date.today()
    row = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=today).one_or_none()
    if snapshot is None:
        if row is None:
            row = ContentMetric(content_post_id=post.id, recorded_on=today)
            db.add(row)
        snapshot = ContentSnapshot(content_post_id=post.id)
        db.add(snapshot)
    else:
        delta_fields = ("views", "likes", "comments", "shares", "saves", "reach", "impressions")
        deltas = {
            field: (
                max(int(current.get(field, 0) or 0) - int(getattr(snapshot, f"latest_{field}") or 0), 0)
                if field in available
                else 0
            )
            for field in delta_fields
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
                setattr(row, field, int(getattr(row, field) or 0) + value)
            row.metrics_available = sorted(
                set(row.metrics_available or []) | set(available)
            )
        denominator = row.views or row.reach or row.impressions or 0
        row.engagement_rate = round((row.likes + row.comments + row.shares + row.saves) * 100 / denominator, 2) if denominator else 0.0
    for field in ("views", "likes", "comments", "shares", "saves", "reach", "impressions"):
        setattr(snapshot, f"latest_{field}", int(current.get(field, 0) or 0))
    snapshot.metrics_available = sorted(set(available))
    snapshot.fetched_at = datetime.now(timezone.utc)
    snapshot.source = "x_api_v2"


def sync_x_account(db, account, access_token: str, provider_account_id: str | None = None) -> dict:
    profile = get_profile(access_token)
    x_id = str(profile.get("id") or provider_account_id or "")
    username = str(profile.get("username") or "")
    if not x_id or not username:
        raise XProviderError("X profile is missing its account ID or username.", 502)

    public = profile.get("public_metrics") or {}
    followers_available = public.get("followers_count") is not None
    followers = _int(public.get("followers_count")) if followers_available else account.followers_count
    old_followers = account.followers_count
    previously_synced = bool(account.is_connected and account.last_synced_at)
    account.handle = f"@{username.lstrip('@')}"
    account.profile_url = profile.get("url") or f"https://x.com/{username}"
    account.followers_count = followers
    account.is_connected = True
    now = datetime.now(timezone.utc)
    account.last_synced_at = now

    warnings: list[str] = []
    try:
        posts = list_recent_posts(access_token, x_id)
    except XProviderError as exc:
        raise XProviderError(str(exc), exc.status_code) from exc

    synced = 0
    for item in posts:
        post_id = str(item.get("id") or "")
        if not post_id:
            continue
        post = db.query(ContentPost).filter_by(external_post_id=post_id).one_or_none()
        if post is not None and post.social_account_id != account.id:
            warnings.append("An X post linked to another account was skipped.")
            continue
        text = str(item.get("text") or "X post")
        if post is None:
            post = ContentPost(social_account_id=account.id, external_post_id=post_id, title=text[:250], content_type="Post")
            db.add(post)
            db.flush()
        else:
            post.title = text[:250]
        post.post_url = f"https://x.com/{username}/status/{post_id}"
        try:
            published = item.get("created_at")
            post.published_at = datetime.fromisoformat(str(published).replace("Z", "+00:00")) if published else None
        except ValueError:
            post.published_at = None

        metrics = item.get("public_metrics") or {}
        private_metrics = item.get("non_public_metrics") or {}
        organic = item.get("organic_metrics") or {}
        impression_value = private_metrics.get("impression_count", organic.get("impression_count", metrics.get("impression_count")))
        current = {
            "views": _int(impression_value),
            "likes": _int(metrics.get("like_count")),
            "comments": _int(metrics.get("reply_count")),
            "shares": _int(metrics.get("retweet_count")) + _int(metrics.get("quote_count")),
            "saves": _int(metrics.get("bookmark_count")),
            "reach": 0,
            "impressions": _int(impression_value),
        }
        available = ["likes", "comments", "shares"]
        if "bookmark_count" in metrics:
            available.append("saves")
        if impression_value is not None:
            available.extend(["views", "impressions"])
        _snapshot_delta(db, post, current, available)
        synced += 1

    daily = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one_or_none()
    delta_available = followers_available and previously_synced
    gained = max(followers - old_followers, 0) if delta_available else 0
    lost = max(old_followers - followers, 0) if delta_available else 0
    if daily is None:
        daily = AccountMetric(
            social_account_id=account.id, recorded_on=date.today(),
            followers_count=followers if followers_available else None,
            followers_gained=gained, followers_lost=lost, source="x_api_v2",
            metrics_available=["followers_count", "followers_gained", "followers_lost"] if delta_available else (["followers_count"] if followers_available else []),
        )
        db.add(daily)
    elif followers_available:
        daily.followers_count = followers
        if delta_available:
            daily.followers_gained += gained
            daily.followers_lost += lost
    insight = db.query(AudienceInsight).filter_by(social_account_id=account.id, recorded_on=date.today()).one_or_none()
    if insight is None:
        db.add(AudienceInsight(social_account_id=account.id, recorded_on=date.today()))
    db.flush()
    available_content_metrics = {"likes", "comments", "shares"}
    has_impressions = any(
        (post.get("non_public_metrics") or {}).get("impression_count") is not None
        or (post.get("organic_metrics") or {}).get("impression_count") is not None
        or (post.get("public_metrics") or {}).get("impression_count") is not None
        for post in posts
    )
    has_bookmarks = any(
        "bookmark_count" in (post.get("public_metrics") or {})
        for post in posts
    )
    if has_bookmarks:
        available_content_metrics.add("saves")
    if has_impressions:
        available_content_metrics.update({"views", "impressions"})

    unavailable_content_metrics = ["audience demographics", "unique reach"]
    if not has_impressions:
        unavailable_content_metrics.append("impressions/views require additional X API access")

    return {
        "platform": "X", "provider_account_id": x_id, "handle": account.handle,
        "followers": account.followers_count, "posts_synced": synced,
        "available_content_metrics": sorted(available_content_metrics),
        "unavailable_content_metrics": unavailable_content_metrics,
        "warnings": warnings + ["X API fields depend on the account context and developer tier; view/impression metrics can require elevated access."],
        "last_synced_at": now.isoformat(),
    }
