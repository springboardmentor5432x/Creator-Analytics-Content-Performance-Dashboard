"""
CreatorIQ - Meta (Facebook + Instagram) integration  (Milestone 2)
File location: backend/app/routers/meta.py
Pura file replace kore paste korun.
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

# ---------------------------------------------------------------
# Settings (backend/.env file theke ashbe)
# ---------------------------------------------------------------
META_APP_ID = os.getenv("META_APP_ID", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")
META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:8000/meta/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")          # eg. http://localhost:5173
GRAPH_VERSION = os.getenv("META_GRAPH_VERSION", "v21.0")
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_VERSION}"

SCOPES = [
    "pages_show_list",
    "pages_read_engagement",
    "read_insights",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
]


# ---------------------------------------------------------------
# Database tables (notun table name, tai purono table er sathe conflict hobe na)
# ---------------------------------------------------------------
class MetaSocialAccount(Base):
    __tablename__ = "meta_social_accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    platform = Column(String(20), nullable=False)          # facebook / instagram
    account_id = Column(String(64), nullable=False)
    name = Column(String(255))
    username = Column(String(255))
    access_token = Column(Text)                            # production e encrypt korte hobe
    followers = Column(Integer, nullable=True, default=None)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint("user_id", "platform", "account_id", name="uq_meta_acc"),)


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
    views = Column(Integer)          # None = API theke pawa jayni
    reach = Column(Integer)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint("user_id", "platform", "post_id", name="uq_meta_post"),)


class MetaFollowerSnapshot(Base):
    __tablename__ = "meta_follower_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    platform = Column(String(20), nullable=False)
    account_id = Column(String(64), nullable=False)
    followers = Column(Integer, nullable=True, default=None)
    day = Column(Date, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "platform", "account_id", "day", name="uq_meta_snap"),)


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def graph_get(path: str, params: dict) -> dict:
    """Meta Graph API call. Asol Meta error message dekhabe."""
    url = f"{GRAPH_BASE}/{path.lstrip('/')}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        try:
            msg = json.loads(body).get("error", {}).get("message", body)
        except Exception:
            msg = body
        raise HTTPException(status_code=400, detail=f"Meta API Error ({exc.code}): {msg}")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Meta API request failed: {exc}")


def safe_graph_get(path: str, params: dict) -> Optional[dict]:
    """Error hole None return kore (missing data handle korar jonno)."""
    try:
        return graph_get(path, params)
    except HTTPException:
        return None


def check_config():
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(
            status_code=500,
            detail="META_APP_ID / META_APP_SECRET backend/.env file e set kora nei.",
        )


def make_state(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "purpose": "meta_oauth",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def read_state(state: str) -> int:
    try:
        data = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if data.get("purpose") != "meta_oauth":
            raise ValueError("wrong purpose")
        return int(data["sub"])
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired Meta login state. Swagger e abar GET /meta/login chalie notun URL ney, "
                   "10 minute er moddhe open korun.",
        )


def to_int(v) -> Optional[int]:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def parse_time(s: Optional[str]):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def save_snapshot(db: Session, user_id: int, platform: str, account_id: str, followers: int):
    today = date.today()
    snap = (
        db.query(MetaFollowerSnapshot)
        .filter_by(user_id=user_id, platform=platform, account_id=account_id, day=today)
        .first()
    )
    if snap:
        snap.followers = followers
    else:
        db.add(MetaFollowerSnapshot(
            user_id=user_id, platform=platform, account_id=account_id,
            followers=followers, day=today))


def upsert_account(db, user_id, platform, account_id, name, username, token, followers):
    acc = (
        db.query(MetaSocialAccount)
        .filter_by(user_id=user_id, platform=platform, account_id=account_id)
        .first()
    )
    if not acc:
        acc = MetaSocialAccount(user_id=user_id, platform=platform, account_id=account_id)
        db.add(acc)
    acc.name = name
    acc.username = username
    acc.access_token = token
    if followers is not None:
        acc.followers = to_int(followers)
        if acc.followers is not None:
            save_snapshot(db, user_id, platform, account_id, acc.followers)
    return acc


def own_account_or_404(db: Session, user_id: int, acc_id: int) -> MetaSocialAccount:
    acc = db.query(MetaSocialAccount).filter_by(id=acc_id, user_id=user_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc


def post_to_dict(p: MetaSocialPost) -> dict:
    known = [to_int(v) for v in (p.likes, p.comments, p.shares)]
    known = [v for v in known if v is not None]
    eng = sum(known) if known else None
    return {
        "id": p.id, "platform": p.platform, "post_id": p.post_id,
        "text": (p.text or "")[:200], "media_type": p.media_type,
        "permalink": p.permalink,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "views": p.views, "reach": p.reach, "likes": p.likes,
        "comments": p.comments, "shares": p.shares, "engagement": eng,
    }


# ---------------------------------------------------------------
# Sync logic
# ---------------------------------------------------------------
def sync_facebook_posts(db: Session, acc: MetaSocialAccount) -> int:
    """Facebook Page-er published post sync kore. Metrics unavailable holeo post save hoy."""
    # Basic fields alada kore fetch kori; nested metrics-er permission error-e
    # jeno post fetch bondho na hoy.
    data = graph_get(f"{acc.account_id}/posts", {
        "fields": "id,message,created_time",
        "limit": 50,
        "access_token": acc.access_token,
    })

    count = 0
    for item in data.get("data", []):
        post_id = item.get("id")
        if not post_id:
            continue

        likes = None
        comments = None
        shares = None
        views = None
        reach = None

        # Likes, comments, shares optional. Permission na thakle post save cholbe.
        metrics = safe_graph_get(post_id, {
            "fields": "likes.limit(0).summary(true),comments.limit(0).summary(true),shares",
            "access_token": acc.access_token,
        })
        if metrics:
            likes = (metrics.get("likes") or {}).get("summary", {}).get("total_count")
            comments = (metrics.get("comments") or {}).get("summary", {}).get("total_count")
            shares = (metrics.get("shares") or {}).get("count")

        # Insights metric account/post/API permission-er upor depend kore.
        insights = safe_graph_get(f"{post_id}/insights", {
            "metric": "post_impressions_unique,post_impressions",
            "access_token": acc.access_token,
        })
        if insights:
            for metric in insights.get("data", []):
                values = metric.get("values") or []
                if not values:
                    continue
                value = to_int(values[0].get("value"))
                if metric.get("name") == "post_impressions_unique":
                    reach = value
                elif metric.get("name") == "post_impressions":
                    views = value

        permalink_data = safe_graph_get(post_id, {"fields": "permalink_url", "access_token": acc.access_token})
        permalink = (permalink_data or {}).get("permalink_url")
        upsert_post(
            db, acc, post_id, item.get("message"), "post",
            permalink, parse_time(item.get("created_time")),
            views, reach, likes, comments, shares,
        )
        count += 1

    return count


def sync_instagram_posts(db: Session, acc: MetaSocialAccount) -> int:
    data = safe_graph_get(f"{acc.account_id}/media", {
        "fields": "id,caption,media_type,permalink,timestamp,like_count,comments_count",
        "limit": 25,
        "access_token": acc.access_token,
    })
    if not data:
        return 0
    count = 0
    for item in data.get("data", []):
        views = reach = shares = None
        ins = safe_graph_get(f"{item['id']}/insights", {
            "metric": "reach,views,shares", "access_token": acc.access_token})
        if ins:
            for m in ins.get("data", []):
                val = to_int((m.get("values") or [{}])[0].get("value"))
                if m["name"] == "reach":
                    reach = val
                elif m["name"] == "views":
                    views = val
                elif m["name"] == "shares":
                    shares = val
        upsert_post(db, acc, item["id"], item.get("caption"), item.get("media_type"),
                    item.get("permalink"), parse_time(item.get("timestamp")),
                    views, reach, item.get("like_count"),
                    item.get("comments_count"), shares)
        count += 1
    return count


def upsert_post(db, acc, post_id, text, media_type, permalink, published_at,
                views, reach, likes, comments, shares):
    post = (
        db.query(MetaSocialPost)
        .filter_by(user_id=acc.user_id, platform=acc.platform, post_id=post_id)
        .first()
    )
    if not post:
        post = MetaSocialPost(user_id=acc.user_id, platform=acc.platform,
                              account_id=acc.account_id, post_id=post_id)
        db.add(post)
    post.text = text
    post.media_type = media_type
    post.permalink = permalink
    post.published_at = published_at
    post.views = views
    post.reach = reach
    post.likes = to_int(likes)
    post.comments = to_int(comments)
    post.shares = to_int(shares)
    post.updated_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------
# OAuth endpoints
# ---------------------------------------------------------------
@router.get("/login")
def meta_login(current_user=Depends(get_current_user)):
    check_config()
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "state": make_state(current_user.id),
        "scope": ",".join(SCOPES),
        "response_type": "code",
    }
    url = f"https://www.facebook.com/{GRAPH_VERSION}/dialog/oauth?{urllib.parse.urlencode(params)}"
    return {"status": "success", "authorization_url": url, "expires_in_minutes": 10}


@router.get("/callback")
def meta_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
):
    check_config()
    if error:
        raise HTTPException(status_code=400, detail=f"Meta authorization failed: {error} - {error_description}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state in callback")

    user_id = read_state(state)

    short = graph_get("oauth/access_token", {
        "client_id": META_APP_ID, "redirect_uri": META_REDIRECT_URI,
        "client_secret": META_APP_SECRET, "code": code})
    token = short.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="Meta did not return an access token")

    long_lived = safe_graph_get("oauth/access_token", {
        "grant_type": "fb_exchange_token", "client_id": META_APP_ID,
        "client_secret": META_APP_SECRET, "fb_exchange_token": token})
    if long_lived and long_lived.get("access_token"):
        token = long_lived["access_token"]

    pages = graph_get("me/accounts", {
        "fields": "id,name,access_token,followers_count,fan_count,"
                  "instagram_business_account{id,username,name,followers_count}",
        "limit": 50, "access_token": token})

    connected = []
    for page in pages.get("data", []):
        page_token = page.get("access_token") or token
        fb_followers = page.get("followers_count", page.get("fan_count"))
        upsert_account(db, user_id, "facebook", page["id"], page.get("name"),
                       page.get("name"), page_token, fb_followers)
        connected.append({"platform": "facebook", "name": page.get("name")})

        ig = page.get("instagram_business_account")
        if ig:
            upsert_account(db, user_id, "instagram", ig["id"], ig.get("name"),
                           ig.get("username"), page_token, ig.get("followers_count"))
            connected.append({"platform": "instagram", "name": ig.get("username")})
    db.commit()

    if FRONTEND_URL:
        return RedirectResponse(f"{FRONTEND_URL}/?meta=connected")
    return {
        "status": "success",
        "message": "Meta accounts connected and saved successfully.",
        "connected_accounts": connected,
        "hint": "connected_accounts faka hole: Facebook Page admin acho kina, ar permission/Page select korecho kina check korun.",
    }


# ---------------------------------------------------------------
# Data endpoints (shudhu nijer data)
# ---------------------------------------------------------------
@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.query(MetaSocialAccount).filter_by(user_id=current_user.id).all()
    return {"status": "success", "accounts": [
        {"id": a.id, "platform": a.platform, "account_id": a.account_id,
         "name": a.name, "username": a.username, "followers": a.followers}
        for a in rows]}


@router.post("/sync")
def sync_all(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Sync each connected Meta account and report per-account results."""
    accounts = db.query(MetaSocialAccount).filter_by(user_id=current_user.id).all()
    if not accounts:
        raise HTTPException(
            status_code=404,
            detail="No Meta account connected. Please connect an account using /meta/login.",
        )

    total = 0
    results = []

    for acc in accounts:
        item = {
            "platform": acc.platform,
            "account_name": acc.name,
            "account_id": acc.account_id,
            "followers": acc.followers,
            "posts_synced": 0,
            "status": "success",
            "message": None,
        }

        # Refresh follower count. If the API does not provide it, keep the saved value.
        fields = "followers_count,fan_count" if acc.platform == "facebook" else "followers_count"
        try:
            info = graph_get(acc.account_id, {
                "fields": fields,
                "access_token": acc.access_token,
            })
            if info:
                followers = info.get(
                    "followers_count",
                    info.get("fan_count", acc.followers),
                )
                if followers is not None:
                    acc.followers = int(followers)
                    save_snapshot(db, acc.user_id, acc.platform, acc.account_id, acc.followers)
                    item["followers"] = acc.followers
        except HTTPException as exc:
            # A follower metric can be unavailable even when post access works.
            item["follower_sync_warning"] = str(exc.detail)

        try:
            if acc.platform == "facebook":
                synced = sync_facebook_posts(db, acc)
            elif acc.platform == "instagram":
                synced = sync_instagram_posts(db, acc)
            else:
                synced = 0
                item["status"] = "skipped"
                item["message"] = "Unsupported platform"

            item["posts_synced"] = synced
            total += synced
            if synced == 0 and item["status"] == "success":
                item["message"] = "No published posts were returned by Meta for this account."
        except HTTPException as exc:
            item["status"] = "error"
            item["message"] = str(exc.detail)

        results.append(item)

    db.commit()
    return {
        "status": "success",
        "posts_synced": total,
        "accounts": results,
        "message": (
            "Sync completed. No published posts were returned; zero is valid if the accounts have no published posts."
            if total == 0
            else "Meta data synced successfully."
        ),
    }


@router.get("/posts")
def list_posts(
    platform: Optional[str] = None,
    sort_by: str = Query("published_at", pattern="^(published_at|views|likes|comments|engagement)$"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(MetaSocialPost).filter_by(user_id=current_user.id)
    if platform:
        q = q.filter(MetaSocialPost.platform == platform)
    posts = [post_to_dict(p) for p in q.all()]
    if sort_by == "published_at":
        posts.sort(key=lambda p: p["published_at"] or "", reverse=True)
    else:
        posts.sort(key=lambda p: p[sort_by] or 0, reverse=True)
    return {"status": "success", "total": len(posts), "posts": posts[:limit]}


@router.get("/analytics/summary")
def summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Return safe Meta totals and top posts; unavailable metrics remain unavailable."""
    accounts = db.query(MetaSocialAccount).filter_by(user_id=current_user.id).all()
    rows = db.query(MetaSocialPost).filter_by(user_id=current_user.id).all()
    posts = [post_to_dict(p) for p in rows]

    def total_for(field):
        values = [to_int(p.get(field)) for p in posts]
        values = [v for v in values if v is not None]
        return sum(values) if values else None

    follower_values = [to_int(a.followers) for a in accounts]
    follower_values = [v for v in follower_values if v is not None]

    return {
        "status": "success",
        "total_accounts": len(accounts),
        "total_followers": sum(follower_values) if follower_values else None,
        "followers_available": bool(follower_values),
        "total_posts": len(posts),
        "total_views": total_for("views"),
        "views_available": total_for("views") is not None,
        "total_reach": total_for("reach"),
        "reach_available": total_for("reach") is not None,
        "total_likes": total_for("likes"),
        "likes_available": total_for("likes") is not None,
        "total_comments": total_for("comments"),
        "comments_available": total_for("comments") is not None,
        "total_shares": total_for("shares"),
        "shares_available": total_for("shares") is not None,
        "top_by_views": sorted(
            posts, key=lambda p: to_int(p.get("views")) or 0, reverse=True
        )[:5],
        "top_by_engagement": sorted(
            posts, key=lambda p: to_int(p.get("engagement")) or 0, reverse=True
        )[:5],
    }


@router.get("/followers/history")
def follower_history(days: int = Query(90, ge=1, le=365),
                     db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    since = date.today() - timedelta(days=days)
    rows = (db.query(MetaFollowerSnapshot)
            .filter(MetaFollowerSnapshot.user_id == current_user.id,
                    MetaFollowerSnapshot.day >= since)
            .order_by(MetaFollowerSnapshot.day).all())
    by_day = {}
    for r in rows:
        d = by_day.setdefault(r.day.isoformat(), {"date": r.day.isoformat()})
        if r.followers is not None:
            d[r.platform] = d.get(r.platform, 0) + int(r.followers)
    return {"status": "success", "history": list(by_day.values())}


@router.get("/compare")
def compare(ids: str = Query(..., description="comma separated post ids, e.g. 1,2,3"),
            db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        id_list = [int(i) for i in ids.split(",") if i.strip()][:5]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids must be numbers separated by commas")
    posts = (db.query(MetaSocialPost)
             .filter(MetaSocialPost.user_id == current_user.id,
                     MetaSocialPost.id.in_(id_list)).all())
    return {"status": "success", "posts": [post_to_dict(p) for p in posts]}


@router.get("/demographics/{account_row_id}")
def demographics(account_row_id: int, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    """Instagram audience demographics (age, gender, country). Shudhu IG, ar jodi API dey."""
    acc = own_account_or_404(db, current_user.id, account_row_id)
    if acc.platform != "instagram":
        return {"status": "success", "available": False,
                "message": "Facebook Page demographics Meta API te ar pawa jay na."}
    result = {}
    for breakdown in ["age", "gender", "country"]:
        data = safe_graph_get(f"{acc.account_id}/insights", {
            "metric": "follower_demographics", "period": "lifetime",
            "metric_type": "total_value", "breakdown": breakdown,
            "access_token": acc.access_token})
        items = []
        try:
            results = data["data"][0]["total_value"]["breakdowns"][0]["results"]
            items = [{"name": ",".join(r["dimension_values"]), "value": r["value"]} for r in results]
        except Exception:
            pass
        result[breakdown] = items
    available = any(result.values())
    return {"status": "success", "available": available, "demographics": result,
            "message": None if available else "Demographics paoa jayni (100+ follower lage / permission lage)."}


@router.get("/debug")
def debug_meta(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    out = []
    for acc in db.query(MetaSocialAccount).filter_by(user_id=current_user.id).all():
        if acc.platform == "facebook":
            path, fields = f"{acc.account_id}/posts", "id,message,created_time"
        else:
            path, fields = f"{acc.account_id}/media", "id,caption,timestamp"
        try:
            res = graph_get(path, {"fields": fields, "limit": 5,
                                   "access_token": acc.access_token})
            out.append({"platform": acc.platform, "name": acc.name,
                        "ok": True, "posts_found": len(res.get("data", [])),
                        "sample": res.get("data", [])[:2]})
        except HTTPException as exc:
            out.append({"platform": acc.platform, "name": acc.name,
                        "ok": False, "error": exc.detail})
    return {"status": "success", "debug": out}