"""Live social-platform data (YouTube Data API v3, Instagram Graph API).

Keys live in backend/.env. Results are cached for SOCIAL_CACHE_SECONDS so that
frequent dashboard polling does not burn API quota.
"""
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import httpx

YT = "https://www.googleapis.com/youtube/v3"
GRAPH = "https://graph.facebook.com/v21.0"
PLATFORMS = ("youtube", "instagram")
_cache: dict = {}
_lock = threading.Lock()


class SocialError(Exception):
    pass


def ttl() -> int:
    return int(os.getenv("SOCIAL_CACHE_SECONDS", "300"))


def status() -> dict:
    return {
        "youtube": bool(os.getenv("YOUTUBE_API_KEY")),
        # Only the token is required: the numeric Instagram account ID is auto-detected from it.
        "instagram": bool(os.getenv("INSTAGRAM_ACCESS_TOKEN")),
        "cache_seconds": ttl(),
    }


def _get(client: httpx.Client, url: str, params: dict) -> dict:
    try:
        r = client.get(url, params=params)
    except httpx.HTTPError:
        raise SocialError("Could not reach the platform API. Check the server's internet connection.")
    if r.status_code != 200:
        try:
            msg = r.json().get("error", {}).get("message")
        except Exception:
            msg = None
        raise SocialError(msg or f"Platform API returned status {r.status_code}.")
    return r.json()


def fetch_youtube(ident: str) -> dict:
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        raise SocialError("YOUTUBE_API_KEY is not set in backend/.env")
    ident = ident.strip()
    q = {"part": "snippet,statistics,contentDetails", "key": key}
    if ident.startswith("UC") and len(ident) >= 20:
        q["id"] = ident
    else:
        q["forHandle"] = ident if ident.startswith("@") else "@" + ident
    with httpx.Client(timeout=10) as c:
        items = _get(c, f"{YT}/channels", q).get("items") or []
        if not items:
            raise SocialError("YouTube channel not found. Use the @handle or the channel ID (starts with UC).")
        ch = items[0]
        st = ch["statistics"]
        recent = []
        try:
            uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
            pl = _get(c, f"{YT}/playlistItems", {"part": "contentDetails", "playlistId": uploads, "maxResults": 8, "key": key})
            ids = ",".join(i["contentDetails"]["videoId"] for i in pl.get("items", []))
            if ids:
                for v in _get(c, f"{YT}/videos", {"part": "snippet,statistics", "id": ids, "key": key}).get("items", []):
                    s = v["statistics"]
                    recent.append({
                        "title": v["snippet"]["title"], "published": v["snippet"]["publishedAt"],
                        "views": int(s.get("viewCount", 0)), "likes": int(s.get("likeCount", 0)),
                        "comments": int(s.get("commentCount", 0)), "url": f"https://www.youtube.com/watch?v={v['id']}",
                    })
        except SocialError:
            pass
    rates = [(p["likes"] + p["comments"]) / p["views"] * 100 for p in recent if p["views"]]
    return {
        "name": ch["snippet"]["title"], "handle": ch["snippet"].get("customUrl", ""),
        "avatar": ch["snippet"].get("thumbnails", {}).get("default", {}).get("url"),
        "followers": None if st.get("hiddenSubscriberCount") else int(st.get("subscriberCount", 0)),
        "views": int(st.get("viewCount", 0)), "posts": int(st.get("videoCount", 0)),
        "engagement": round(sum(rates) / len(rates), 2) if rates else None, "recent": recent,
    }


_ig_own: dict = {}


def instagram_own(force: bool = False) -> dict:
    """Resolve the Instagram Business account behind INSTAGRAM_ACCESS_TOKEN -> {"id", "username"}.

    INSTAGRAM_USER_ID may be the numeric ID, a username (e.g. va._.va_voom) or empty; a username
    or empty value is resolved through the token (Facebook Pages -> instagram_business_account).
    """
    tok = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    if not tok:
        raise SocialError("INSTAGRAM_ACCESS_TOKEN is not set in backend/.env")
    raw = (os.getenv("INSTAGRAM_USER_ID") or "").strip().lstrip("@")
    with _lock:
        hit = _ig_own.get(raw)
    if hit and not force and time.time() - hit["at"] < 3600:
        return hit
    with httpx.Client(timeout=10) as c:
        if raw.isdigit():
            info = _get(c, f"{GRAPH}/{raw}", {"fields": "id,username", "access_token": tok})
            res = {"id": str(info.get("id", raw)), "username": info.get("username") or ""}
        else:
            pages = _get(c, f"{GRAPH}/me/accounts", {"fields": "name,instagram_business_account{id,username}", "limit": 50, "access_token": tok}).get("data", [])
            found = [p["instagram_business_account"] for p in pages if p.get("instagram_business_account")]
            if not found:  # token may be a Page token or the app may lack pages_show_list
                try:
                    me = _get(c, f"{GRAPH}/me", {"fields": "instagram_business_account{id,username}", "access_token": tok})
                    if me.get("instagram_business_account"):
                        found = [me["instagram_business_account"]]
                except SocialError:
                    pass
            if not found:
                raise SocialError("No Instagram Business/Creator account is linked to this token. Link it to a Facebook Page, or set the numeric INSTAGRAM_USER_ID in backend/.env.")
            pick = next((f for f in found if raw and (f.get("username") or "").lower() == raw.lower()), found[0])
            res = {"id": str(pick["id"]), "username": pick.get("username") or raw}
    res["at"] = time.time()
    with _lock:
        _ig_own[raw] = res
    return res


def instagram_default() -> dict:
    """Cached, non-raising view for the UI: which Instagram account the server is connected to."""
    try:
        o = instagram_own()
        return {"username": o["username"], "id": o["id"], "error": None}
    except SocialError as e:
        return {"username": None, "id": None, "error": str(e)}
    except Exception:
        return {"username": None, "id": None, "error": "Unexpected error while contacting Instagram."}


_IG_MEDIA = "caption,like_count,comments_count,timestamp,permalink,media_type"


def fetch_instagram(ident: str) -> dict:
    tok = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    if not tok:
        raise SocialError("INSTAGRAM_ACCESS_TOKEN is not set in backend/.env")
    own = instagram_own()
    user = ident.strip().lstrip("@")
    with httpx.Client(timeout=12) as c:
        if user.lower() == (own["username"] or "").lower():
            # The connected account itself: read it directly (richer and more reliable than discovery).
            bd = _get(c, f"{GRAPH}/{own['id']}", {
                "fields": f"username,name,profile_picture_url,followers_count,follows_count,media_count,media.limit(25){{{_IG_MEDIA}}}",
                "access_token": tok})
        else:
            fields = (f"business_discovery.username({user})"
                      "{username,name,profile_picture_url,followers_count,media_count,"
                      f"media.limit(25){{{_IG_MEDIA}}}}}")
            bd = _get(c, f"{GRAPH}/{own['id']}", {"fields": fields, "access_token": tok}).get("business_discovery")
    if not bd:
        raise SocialError("Instagram account not found (it must be a Business or Creator account).")
    recent = [{
        "title": (m.get("caption") or "Instagram post").split("\n")[0][:90], "published": m.get("timestamp"),
        "views": None, "likes": m.get("like_count", 0), "comments": m.get("comments_count", 0), "url": m.get("permalink"),
        "type": m.get("media_type"),
    } for m in bd.get("media", {}).get("data", [])]
    followers = bd.get("followers_count") or 0
    rates = [(p["likes"] + p["comments"]) / followers * 100 for p in recent] if followers else []
    return {
        "name": bd.get("name") or bd.get("username"), "handle": "@" + bd.get("username", user),
        "avatar": bd.get("profile_picture_url"), "followers": followers, "views": None,
        "following": bd.get("follows_count"),
        "posts": bd.get("media_count", 0), "engagement": round(sum(rates) / len(rates), 2) if rates else None, "recent": recent,
    }


_FETCHERS = {"youtube": fetch_youtube, "instagram": fetch_instagram}


def get_live(platform: str, ident: str, force: bool = False) -> dict:
    if platform not in _FETCHERS:
        raise SocialError(f"Unsupported platform '{platform}'.")
    k = (platform, ident.strip().lower())
    with _lock:
        hit = _cache.get(k)
    if hit and not force and time.time() - hit[0] < ttl():
        return hit[1]
    data = _FETCHERS[platform](ident)
    data["fetched_at"] = datetime.now(timezone.utc).isoformat()
    with _lock:
        _cache[k] = (time.time(), data)
    return data


def get_many(pairs: list, force: bool = False) -> list:
    def one(p):
        try:
            return {"data": get_live(p[0], p[1], force), "error": None}
        except SocialError as e:
            return {"data": None, "error": str(e)}
        except Exception:
            return {"data": None, "error": "Unexpected error while fetching this account."}
    with ThreadPoolExecutor(max_workers=8) as ex:
        return list(ex.map(one, pairs))
