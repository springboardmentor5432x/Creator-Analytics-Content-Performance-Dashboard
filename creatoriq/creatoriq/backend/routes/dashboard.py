"""Analytics Dashboard module: KPI cards, time series, platform split, live metrics."""
from fastapi import APIRouter, Depends, Query

from .. import cache
from ..database import db, q, q1
from ..security import current_user, target_creator
from ..services.analytics import window, pct_change, eng_rate

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def followers_total(c, uid, on_or_before):
    r = q1(c, """SELECT COALESCE(SUM(followers),0) n FROM audience_daily a WHERE user_id=? AND date=(
                 SELECT MAX(date) FROM audience_daily WHERE user_id=a.user_id AND platform=a.platform AND date<=?)""",
           (uid, on_or_before))
    return r["n"]


def content_totals(c, uid, a, b):
    r = q1(c, """SELECT COUNT(*) posts, COALESCE(SUM(views),0) views, COALESCE(SUM(likes),0) likes, COALESCE(SUM(comments),0) comments,
                 COALESCE(SUM(shares),0) shares, COALESCE(SUM(saves),0) saves, COALESCE(SUM(watch_time),0) watch_time,
                 COALESCE(SUM(reach),0) reach FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ?""", (uid, a, b))
    r["er"] = eng_rate(r)
    return r


@router.get("/overview")
def overview(days: int = Query(30, ge=7, le=365), uid: int = Depends(target_creator)):
    key = f"{uid}:overview:{days}"
    if (hit := cache.get(key)):
        return hit
    start, end, prev_start = window(days)
    with db() as c:
        cur, prev = content_totals(c, uid, start, end), content_totals(c, uid, prev_start, start)
        f_now, f_prev = followers_total(c, uid, end), followers_total(c, uid, start)
        rev = lambda a, b: q1(c, "SELECT COALESCE(SUM(amount),0) s FROM revenue WHERE user_id=? AND date BETWEEN ? AND ?", (uid, a, b))["s"]
        r_now, r_prev = rev(start, end), rev(prev_start, start)
        imp = q1(c, "SELECT COALESCE(SUM(impressions),0) i FROM audience_daily WHERE user_id=? AND date BETWEEN ? AND ?", (uid, start, end))["i"]
        series = q(c, """SELECT date, SUM(followers) followers, SUM(impressions) impressions, SUM(reach) reach
                         FROM audience_daily WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date""", (uid, start, end))
        by_platform = q(c, """SELECT platform, COUNT(*) posts, SUM(views) views, SUM(likes+comments+shares+saves) interactions
                              FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY platform ORDER BY views DESC""", (uid, start, end))
        revenue_by_source = q(c, "SELECT source, ROUND(SUM(amount),2) amount FROM revenue WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY source ORDER BY amount DESC", (uid, start, end))
        top = q(c, """SELECT id,title,platform,type,views,likes,comments,shares,saves,published_at FROM content
                      WHERE user_id=? AND date(published_at) BETWEEN ? AND ? ORDER BY views DESC LIMIT 5""", (uid, start, end))
        unread = q1(c, "SELECT COUNT(*) n FROM notifications WHERE user_id=? AND is_read=0", (uid,))["n"]
        accounts = q(c, "SELECT platform, handle, last_sync FROM accounts WHERE user_id=?", (uid,))
    for t in top:
        t["er"] = eng_rate(t)
    for p in by_platform:
        p["er"] = round((p["interactions"] or 0) / p["views"] * 100, 2) if p["views"] else 0
    data = {
        "kpis": {
            "followers": {"value": f_now, "change": pct_change(f_now, f_prev)},
            "views": {"value": cur["views"], "change": pct_change(cur["views"], prev["views"])},
            "engagement": {"value": cur["er"], "change": round(cur["er"] - prev["er"], 2)},
            "revenue": {"value": round(r_now, 2), "change": pct_change(r_now, r_prev)},
            "reach": {"value": cur["reach"], "change": pct_change(cur["reach"], prev["reach"])},
            "impressions": {"value": imp, "change": None},
            "posts": {"value": cur["posts"], "change": pct_change(cur["posts"], prev["posts"])},
            "watch_time": {"value": round(cur["watch_time"]), "change": pct_change(cur["watch_time"], prev["watch_time"])},
        },
        "series": series, "by_platform": by_platform, "revenue_by_source": revenue_by_source,
        "top_content": top, "unread": unread, "accounts": accounts,
    }
    return cache.put(key, data)


@router.get("/live")
def live(uid: int = Depends(target_creator)):
    """Real-time metrics (polled by the dashboard every few seconds)."""
    with db() as c:
        r = q1(c, """SELECT COALESCE(SUM(views),0) views, COALESCE(SUM(likes),0) likes, COALESCE(SUM(comments),0) comments,
                     COALESCE(SUM(shares),0) shares FROM content WHERE user_id=? AND published_at >= date('now','-3 day')""", (uid,))
    return r
