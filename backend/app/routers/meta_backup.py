"""
CreatorIQ - Meta (Facebook + Instagram) Integration
Milestone 2
"""

import os
import json
import jwt
import urllib.parse
import urllib.request
import urllib.error

from datetime import datetime, timedelta, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, UniqueConstraint
)
from sqlalchemy.orm import Session

from ..database import Base, get_db
from ..deps import get_current_user
from ..security import SECRET_KEY, ALGORITHM


router = APIRouter(prefix="/meta", tags=["Meta Integration"])


# ============================================================
# META SETTINGS
# ============================================================

META_APP_ID = os.getenv("META_APP_ID", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")

META_REDIRECT_URI = os.getenv(
    "META_REDIRECT_URI",
    "http://localhost:8000/meta/callback"
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")

GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v26.0")

GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VERSION}"


SCOPES = [
    "pages_show_list",
    "pages_read_engagement",
    "read_insights",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
]


# ============================================================
# DATABASE MODELS
# ============================================================

class MetaSocialAccount(Base):

    __tablename__ = "meta_social_accounts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, index=True, nullable=False)

    platform = Column(String(20), nullable=False)

    account_id = Column(String(64), nullable=False)

    name = Column(String(255))

    username = Column(String(255))

    access_token = Column(Text)

    followers = Column(Integer, default=0)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "platform",
            "account_id",
            name="uq_meta_acc"
        ),
    )


class MetaSocialPost(Base):

    __tablename__ = "meta_social_posts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, index=True, nullable=False)

    platform = Column(String(20), nullable=False)

    account_id = Column(String(64), nullable=False)

    post_id = Column(String(128), nullable=False)

    text = Column(Text)

    media_type = Column(String(30))

    permalink = Column(String(500))

    published_at = Column(DateTime(timezone=True))

    views = Column(Integer)

    reach = Column(Integer)

    likes = Column(Integer, default=0)

    comments = Column(Integer, default=0)

    shares = Column(Integer)

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "platform",
            "post_id",
            name="uq_meta_post"
        ),
    )


class MetaFollowerSnapshot(Base):

    __tablename__ = "meta_follower_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, index=True, nullable=False)

    platform = Column(String(20), nullable=False)

    account_id = Column(String(64), nullable=False)

    followers = Column(Integer, default=0)

    day = Column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "platform",
            "account_id",
            "day",
            name="uq_meta_snap"
        ),
    )


# ============================================================
# GRAPH API HELPERS
# ============================================================

def graph_get(path: str, params: dict) -> dict:

    url = (
        f"{GRAPH_BASE}/{path.lstrip('/')}?"
        f"{urllib.parse.urlencode(params)}"
    )

    try:

        request = urllib.request.Request(url)

        with urllib.request.urlopen(request, timeout=30) as response:

            return json.loads(
                response.read().decode("utf-8")
            )

    except urllib.error.HTTPError as exc:

        body = exc.read().decode(
            "utf-8",
            errors="ignore"
        )

        try:

            message = json.loads(body).get(
                "error", {}
            ).get("message", body)

        except Exception:

            message = body

        raise HTTPException(
            status_code=400,
            detail=f"Meta API Error ({exc.code}): {message}"
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=f"Meta API request failed: {exc}"
        )


def safe_graph_get(path: str, params: dict) -> Optional[dict]:

    try:

        return graph_get(path, params)

    except HTTPException:

        return None


def check_config():

    if not META_APP_ID or not META_APP_SECRET:

        raise HTTPException(
            status_code=500,
            detail="META_APP_ID / META_APP_SECRET backend .env file e set kora nei."
        )


def make_state(user_id: int):

    payload = {
        "sub": str(user_id),
        "purpose": "meta_oauth",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def read_state(state: str):

    try:

        data = jwt.decode(
            state,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if data.get("purpose") != "meta_oauth":
            raise ValueError("Wrong purpose")

        return int(data["sub"])

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired Meta login state. Please login again."
        )


def to_int(value):

    try:

        return int(value)

    except (TypeError, ValueError):

        return None


def parse_time(value):

    if not value:
        return None

    try:

        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )

    except Exception:

        return None


# ============================================================
# DATABASE HELPER FUNCTIONS
# ============================================================

def save_snapshot(
    db,
    user_id,
    platform,
    account_id,
    followers
):

    today = date.today()

    snapshot = (
        db.query(MetaFollowerSnapshot)
        .filter_by(
            user_id=user_id,
            platform=platform,
            account_id=account_id,
            day=today
        )
        .first()
    )

    if snapshot:

        snapshot.followers = followers

    else:

        db.add(
            MetaFollowerSnapshot(
                user_id=user_id,
                platform=platform,
                account_id=account_id,
                followers=followers,
                day=today
            )
        )


def upsert_account(
    db,
    user_id,
    platform,
    account_id,
    name,
    username,
    token,
    followers
):

    account = (
        db.query(MetaSocialAccount)
        .filter_by(
            user_id=user_id,
            platform=platform,
            account_id=account_id
        )
        .first()
    )

    if not account:

        account = MetaSocialAccount(
            user_id=user_id,
            platform=platform,
            account_id=account_id
        )

        db.add(account)

    account.name = name
    account.username = username
    account.access_token = token
    account.followers = followers or 0

    save_snapshot(
        db,
        user_id,
        platform,
        account_id,
        followers or 0
    )

    return account


def own_account_or_404(db, user_id, account_id):

    account = (
        db.query(MetaSocialAccount)
        .filter_by(
            id=account_id,
            user_id=user_id
        )
        .first()
    )

    if not account:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    return account


def post_to_dict(post):

    engagement = (
        (post.likes or 0)
        + (post.comments or 0)
        + (post.shares or 0)
    )

    return {
        "id": post.id,
        "platform": post.platform,
        "post_id": post.post_id,
        "text": (post.text or "")[:200],
        "media_type": post.media_type,
        "permalink": post.permalink,
        "published_at": (
            post.published_at.isoformat()
            if post.published_at else None
        ),
        "views": post.views,
        "reach": post.reach,
        "likes": post.likes or 0,
        "comments": post.comments or 0,
        "shares": post.shares,
        "engagement": engagement
    }


# ============================================================
# POST SAVE FUNCTION
# ============================================================

def upsert_post(
    db,
    account,
    post_id,
    text,
    media_type,
    permalink,
    published_at,
    views,
    reach,
    likes,
    comments,
    shares
):

    post = (
        db.query(MetaSocialPost)
        .filter_by(
            user_id=account.user_id,
            platform=account.platform,
            post_id=post_id
        )
        .first()
    )

    if not post:

        post = MetaSocialPost(
            user_id=account.user_id,
            platform=account.platform,
            account_id=account.account_id,
            post_id=post_id
        )

        db.add(post)

    post.text = text
    post.media_type = media_type
    post.permalink = permalink
    post.published_at = published_at
    post.views = views
    post.reach = reach
    post.likes = likes or 0
    post.comments = comments or 0
    post.shares = shares
    post.updated_at = datetime.now(timezone.utc)


# ============================================================
# FACEBOOK POST SYNC
# ============================================================

def sync_facebook_posts(db, account):

    # Basic post information first.
    # Optional metrics cannot stop the post from being saved.

    data = graph_get(
        f"{account.account_id}/posts",
        {
            "fields": "id,message,created_time,permalink_url",
            "limit": 50,
            "access_token": account.access_token
        }
    )

    count = 0

    for item in data.get("data", []):

        post_id = item.get("id")

        if not post_id:
            continue

        likes = 0
        comments = 0
        shares = None
        views = None
        reach = None

        # Fetch engagement metrics separately.

        metrics = safe_graph_get(
            post_id,
            {
                "fields": (
                    "likes.limit(0).summary(true),"
                    "comments.limit(0).summary(true),shares"
                ),
                "access_token": account.access_token
            }
        )

        if metrics:

            likes = (
                metrics.get("likes", {})
                .get("summary", {})
                .get("total_count", 0)
            ) or 0

            comments = (
                metrics.get("comments", {})
                .get("summary", {})
                .get("total_count", 0)
            ) or 0

            shares = (
                metrics.get("shares") or {}
            ).get("count")

        # Fetch post insights separately.

        insights = safe_graph_get(
            f"{post_id}/insights",
            {
                "metric": "post_impressions_unique,post_impressions",
                "access_token": account.access_token
            }
        )

        if insights:

            for metric in insights.get("data", []):

                values = metric.get("values") or []

                if not values:
                    continue

                value = to_int(
                    values[0].get("value")
                )

                if metric.get("name") == "post_impressions_unique":

                    reach = value

                elif metric.get("name") == "post_impressions":

                    views = value

        # Save post even if metrics are unavailable.

        upsert_post(
            db,
            account,
            post_id,
            item.get("message"),
            "post",
            item.get("permalink_url"),
            parse_time(item.get("created_time")),
            views,
            reach,
            likes,
            comments,
            shares
        )

        count += 1

    return count


# ============================================================
# INSTAGRAM POST SYNC
# ============================================================

def sync_instagram_posts(db, account):

    data = graph_get(
        f"{account.account_id}/media",
        {
            "fields": (
                "id,caption,media_type,permalink,"
                "timestamp,like_count,comments_count"
            ),
            "limit": 50,
            "access_token": account.access_token
        }
    )

    count = 0

    for item in data.get("data", []):

        post_id = item.get("id")

        if not post_id:
            continue

        views = None
        reach = None
        shares = None

        insights = safe_graph_get(
            f"{post_id}/insights",
            {
                "metric": "reach,views,shares",
                "access_token": account.access_token
            }
        )

        if insights:

            for metric in insights.get("data", []):

                values = metric.get("values") or []

                if not values:
                    continue

                value = to_int(
                    values[0].get("value")
                )

                if metric.get("name") == "reach":

                    reach = value

                elif metric.get("name") == "views":

                    views = value

                elif metric.get("name") == "shares":

                    shares = value

        upsert_post(
            db,
            account,
            post_id,
            item.get("caption"),
            item.get("media_type"),
            item.get("permalink"),
            parse_time(item.get("timestamp")),
            views,
            reach,
            item.get("like_count", 0),
            item.get("comments_count", 0),
            shares
        )

        count += 1

    return count


# ============================================================
# META LOGIN
# ============================================================

@router.get("/login")
def meta_login(
    current_user=Depends(get_current_user)
):

    check_config()

    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "state": make_state(current_user.id),
        "scope": ",".join(SCOPES),
        "response_type": "code"
    }

    url = (
        f"https://www.facebook.com/{GRAPH_VERSION}/dialog/oauth?"
        f"{urllib.parse.urlencode(params)}"
    )

    return {
        "status": "success",
        "authorization_url": url,
        "expires_in_minutes": 10
    }


# ============================================================
# META CALLBACK
# ============================================================

@router.get("/callback")
def meta_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db)
):

    check_config()

    if error:

        raise HTTPException(
            status_code=400,
            detail=f"Meta authorization failed: {error} - {error_description}"
        )

    if not code or not state:

        raise HTTPException(
            status_code=400,
            detail="Missing code or state"
        )

    user_id = read_state(state)

    short_token = graph_get(
        "oauth/access_token",
        {
            "client_id": META_APP_ID,
            "redirect_uri": META_REDIRECT_URI,
            "client_secret": META_APP_SECRET,
            "code": code
        }
    )

    token = short_token.get("access_token")

    if not token:

        raise HTTPException(
            status_code=400,
            detail="Meta did not return an access token"
        )

    long_token = safe_graph_get(
        "oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "fb_exchange_token": token
        }
    )

    if long_token and long_token.get("access_token"):

        token = long_token["access_token"]

    pages = graph_get(
        "me/accounts",
        {
            "fields": (
                "id,name,access_token,followers_count,fan_count,"
                "instagram_business_account{id,username,name,followers_count}"
            ),
            "limit": 50,
            "access_token": token
        }
    )

    connected = []

    for page in pages.get("data", []):

        page_token = page.get("access_token") or token

        fb_followers = page.get(
            "followers_count",
            page.get("fan_count", 0)
        )

        upsert_account(
            db,
            user_id,
            "facebook",
            page["id"],
            page.get("name"),
            page.get("name"),
            page_token,
            fb_followers
        )

        connected.append({
            "platform": "facebook",
            "name": page.get("name")
        })

        instagram = page.get("instagram_business_account")

        if instagram:

            upsert_account(
                db,
                user_id,
                "instagram",
                instagram["id"],
                instagram.get("name"),
                instagram.get("username"),
                page_token,
                instagram.get("followers_count", 0)
            )

            connected.append({
                "platform": "instagram",
                "name": instagram.get("username")
            })

    db.commit()

    if FRONTEND_URL:

        return RedirectResponse(
            f"{FRONTEND_URL}/?meta=connected"
        )

    return {
        "status": "success",
        "message": "Meta accounts connected successfully",
        "connected_accounts": connected
    }


# ============================================================
# LIST CONNECTED ACCOUNTS
# ============================================================

@router.get("/accounts")
def list_accounts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    rows = (
        db.query(MetaSocialAccount)
        .filter_by(user_id=current_user.id)
        .all()
    )

    return {
        "status": "success",
        "accounts": [
            {
                "id": account.id,
                "platform": account.platform,
                "account_id": account.account_id,
                "name": account.name,
                "username": account.username,
                "followers": account.followers
            }
            for account in rows
        ]
    }


# ============================================================
# SYNC ALL META ACCOUNTS
# ============================================================

@router.post("/sync")
def sync_all(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    accounts = (
        db.query(MetaSocialAccount)
        .filter_by(user_id=current_user.id)
        .all()
    )

    if not accounts:

        raise HTTPException(
            status_code=404,
            detail="No Meta account connected. Use /meta/login first."
        )

    total = 0
    results = []

    for account in accounts:

        item = {
            "platform": account.platform,
            "account_name": account.name,
            "account_id": account.account_id,
            "followers": account.followers or 0,
            "posts_synced": 0,
            "status": "success",
            "message": None
        }

        # Update follower count.

        fields = (
            "followers_count,fan_count"
            if account.platform == "facebook"
            else "followers_count"
        )

        try:

            info = graph_get(
                account.account_id,
                {
                    "fields": fields,
                    "access_token": account.access_token
                }
            )

            followers = info.get(
                "followers_count",
                info.get("fan_count", account.followers)
            )

            if followers is not None:

                account.followers = int(followers)

                save_snapshot(
                    db,
                    account.user_id,
                    account.platform,
                    account.account_id,
                    account.followers
                )

                item["followers"] = account.followers

        except HTTPException as exc:

            item["follower_sync_warning"] = str(exc.detail)

        # Sync posts.

        try:

            if account.platform == "facebook":

                synced = sync_facebook_posts(
                    db,
                    account
                )

            elif account.platform == "instagram":

                synced = sync_instagram_posts(
                    db,
                    account
                )

            else:

                synced = 0

                item["status"] = "skipped"

                item["message"] = "Unsupported platform"

            item["posts_synced"] = synced

            total += synced

            if synced == 0 and item["status"] == "success":

                item["message"] = (
                    "No published posts were returned by Meta."
                )

        except HTTPException as exc:

            item["status"] = "error"

            item["message"] = str(exc.detail)

    db.commit()

    return {
        "status": "success",
        "posts_synced": total,
        "accounts": results if results else [
            {
                "platform": account.platform,
                "account_name": account.name,
                "posts_synced": 0
            }
            for account in accounts
        ],
        "message": (
            "Meta data synced successfully."
            if total > 0
            else "Sync completed. No posts were returned."
        )
    }


# ============================================================
# LIST POSTS
# ============================================================

@router.get("/posts")
def list_posts(
    platform: Optional[str] = None,
    sort_by: str = Query(
        "published_at",
        pattern="^(published_at|views|likes|comments|engagement)$"
    ),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    query = (
        db.query(MetaSocialPost)
        .filter_by(user_id=current_user.id)
    )

    if platform:

        query = query.filter(
            MetaSocialPost.platform == platform
        )

    posts = [
        post_to_dict(post)
        for post in query.all()
    ]

    if sort_by == "published_at":

        posts.sort(
            key=lambda p: p["published_at"] or "",
            reverse=True
        )

    else:

        posts.sort(
            key=lambda p: p.get(sort_by) or 0,
            reverse=True
        )

    return {
        "status": "success",
        "total": len(posts),
        "posts": posts[:limit]
    }


# ============================================================
# ANALYTICS SUMMARY
# ============================================================

@router.get("/analytics/summary")
def summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    accounts = (
        db.query(MetaSocialAccount)
        .filter_by(user_id=current_user.id)
        .all()
    )

    posts = [
        post_to_dict(post)
        for post in (
            db.query(MetaSocialPost)
            .filter_by(user_id=current_user.id)
            .all()
        )
    ]

    return {
        "status": "success",
        "total_followers": sum(
            a.followers or 0 for a in accounts
        ),
        "total_posts": len(posts),
        "total_views": sum(
            p["views"] or 0 for p in posts
        ),
        "total_reach": sum(
            p["reach"] or 0 for p in posts
        ),
        "total_likes": sum(
            p["likes"] for p in posts
        ),
        "total_comments": sum(
            p["comments"] for p in posts
        ),
        "total_shares": sum(
            p["shares"] or 0 for p in posts
        ),
        "top_by_views": sorted(
            posts,
            key=lambda p: p["views"] or 0,
            reverse=True
        )[:5],
        "top_by_engagement": sorted(
            posts,
            key=lambda p: p["engagement"],
            reverse=True
        )[:5]
    }


# ============================================================
# FOLLOWER HISTORY
# ============================================================

@router.get("/followers/history")
def follower_history(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    since = date.today() - timedelta(days=days)

    rows = (
        db.query(MetaFollowerSnapshot)
        .filter(
            MetaFollowerSnapshot.user_id == current_user.id,
            MetaFollowerSnapshot.day >= since
        )
        .order_by(MetaFollowerSnapshot.day)
        .all()
    )

    by_day = {}

    for row in rows:

        day_data = by_day.setdefault(
            row.day.isoformat(),
            {
                "date": row.day.isoformat(),
                "facebook": 0,
                "instagram": 0
            }
        )

        day_data[row.platform] = (
            day_data.get(row.platform, 0)
            + (row.followers or 0)
        )

    return {
        "status": "success",
        "history": list(by_day.values())
    }


# ============================================================
# COMPARE POSTS
# ============================================================

@router.get("/compare")
def compare(
    ids: str = Query(
        ...,
        description="Comma separated post IDs"
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    try:

        id_list = [
            int(value)
            for value in ids.split(",")
            if value.strip()
        ][:5]

    except ValueError:

        raise HTTPException(
            status_code=400,
            detail="IDs must be numbers separated by commas"
        )

    posts = (
        db.query(MetaSocialPost)
        .filter(
            MetaSocialPost.user_id == current_user.id,
            MetaSocialPost.id.in_(id_list)
        )
        .all()
    )

    return {
        "status": "success",
        "posts": [
            post_to_dict(post)
            for post in posts
        ]
    }


# ============================================================
# INSTAGRAM DEMOGRAPHICS
# ============================================================

@router.get("/demographics/{account_row_id}")
def demographics(
    account_row_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    account = own_account_or_404(
        db,
        current_user.id,
        account_row_id
    )

    if account.platform != "instagram":

        return {
            "status": "success",
            "available": False,
            "message": "Facebook demographics unavailable."
        }

    result = {}

    for breakdown in ["age", "gender", "country"]:

        data = safe_graph_get(
            f"{account.account_id}/insights",
            {
                "metric": "follower_demographics",
                "period": "lifetime",
                "metric_type": "total_value",
                "breakdown": breakdown,
                "access_token": account.access_token
            }
        )

        items = []

        try:

            results = (
                data["data"][0]["total_value"]
                ["breakdowns"][0]["results"]
            )

            items = [
                {
                    "name": ",".join(
                        row["dimension_values"]
                    ),
                    "value": row["value"]
                }
                for row in results
            ]

        except (TypeError, KeyError, IndexError):

            pass

        result[breakdown] = items

    available = any(result.values())

    return {
        "status": "success",
        "available": available,
        "demographics": result,
        "message": (
            None if available
            else "Demographics unavailable or permission required."
        )
    }


# ============================================================
# META DEBUG
# ============================================================

@router.get("/debug")
def debug_meta(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    output = []

    accounts = (
        db.query(MetaSocialAccount)
        .filter_by(user_id=current_user.id)
        .all()
    )

    for account in accounts:

        if account.platform == "facebook":

            path = f"{account.account_id}/posts"

            fields = "id,message,created_time"

        else:

            path = f"{account.account_id}/media"

            fields = "id,caption,timestamp"

        try:

            result = graph_get(
                path,
                {
                    "fields": fields,
                    "limit": 5,
                    "access_token": account.access_token
                }
            )

            output.append(
                {
                    "platform": account.platform,
                    "name": account.name,
                    "ok": True,
                    "posts_found": len(
                        result.get("data", [])
                    ),
                    "sample": result.get("data", [])[:2]
                }
            )

        except HTTPException as exc:

            output.append(
                {
                    "platform": account.platform,
                    "name": account.name,
                    "ok": False,
                    "error": exc.detail
                }
            )

    return {
        "status": "success",
        "debug": output
    }