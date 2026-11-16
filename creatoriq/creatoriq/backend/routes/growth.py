"""Growth & Trend Analysis + Recommendation engine: trends, hashtags, forecasting."""
from collections import defaultdict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query

from ..database import db, q
from ..security import target_creator
from ..services.analytics import eng_rate, forecast, window

router = APIRouter(prefix="/api/growth", tags=["growth"])
DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


@router.get("/hashtags")
def hashtags(days: int = Query(60, ge=14, le=365), uid: int = Depends(target_creator)):
    start, end, _ = window(days)
    mid = (date.today() - timedelta(days=days // 2)).isoformat()
    with db() as c:
        rows = q(c, "SELECT hashtags, views, likes, comments, shares, saves, published_at FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ?", (uid, start, end))
    agg = defaultdict(lambda: {"uses": 0, "views": 0, "inter": 0, "recent": 0, "older": 0})
    for r in rows:
        for tag in set((r["hashtags"] or "").split()):
            a = agg[tag]
            a["uses"] += 1; a["views"] += r["views"]
            a["inter"] += r["likes"] + r["comments"] + r["shares"] + r["saves"]
            a["recent" if r["published_at"][:10] >= mid else "older"] += 1
    out = []
    for tag, a in agg.items():
        trend = "rising" if a["recent"] > a["older"] else "falling" if a["recent"] < a["older"] else "steady"
        out.append({"tag": tag, "uses": a["uses"], "avg_views": round(a["views"] / a["uses"]),
                    "er": round(a["inter"] / a["views"] * 100, 2) if a["views"] else 0, "trend": trend})
    return sorted(out, key=lambda x: x["avg_views"], reverse=True)


@router.get("/forecast")
def forecast_view(horizon: int = Query(30, ge=7, le=90), uid: int = Depends(target_creator)):
    with db() as c:
        f = q(c, "SELECT date, SUM(followers) v FROM audience_daily WHERE user_id=? GROUP BY date ORDER BY date DESC LIMIT 45", (uid,))[::-1]
        r = q(c, "SELECT date, SUM(reach) v FROM audience_daily WHERE user_id=? GROUP BY date ORDER BY date DESC LIMIT 45", (uid,))[::-1]
    if not f:
        return {"followers": {"history": [], "forecast": []}, "reach": {"history": [], "forecast": []}}
    last = date.fromisoformat(f[-1]["date"])
    dates = [(last + timedelta(days=i + 1)).isoformat() for i in range(horizon)]
    fy, ry = [x["v"] for x in f], [x["v"] for x in r]
    return {
        "followers": {"history": f[-30:], "forecast": [{"date": d, "v": v} for d, v in zip(dates, forecast(fy, horizon))]},
        "reach": {"history": r[-30:], "forecast": [{"date": d, "v": v} for d, v in zip(dates, forecast(ry, horizon))]},
    }


@router.get("/recommendations")
def recommendations(uid: int = Depends(target_creator)):
    """Rule-based recommendation engine: best time to post, best format, growth strategies."""
    with db() as c:
        rows = q(c, "SELECT type, platform, hashtags, published_at, views, likes, comments, shares, saves FROM content WHERE user_id=?", (uid,))
        cur_f = q(c, "SELECT SUM(followers) v FROM audience_daily WHERE user_id=? GROUP BY date ORDER BY date DESC LIMIT 1", (uid,))
        old_f = q(c, "SELECT SUM(followers) v FROM audience_daily WHERE user_id=? GROUP BY date ORDER BY date DESC LIMIT 1 OFFSET 29", (uid,))
    if len(rows) < 5:
        return {"tips": [{"icon": "link", "title": "Connect accounts", "text": "Connect social accounts to unlock personalised growth recommendations."}], "best_time": None}
    by_day, by_hour, by_type = defaultdict(list), defaultdict(list), defaultdict(list)
    for r in rows:
        d = date.fromisoformat(r["published_at"][:10]).weekday()
        by_day[(d + 1) % 7].append(r["views"]); by_hour[int(r["published_at"][11:13])].append(r["views"]); by_type[r["type"]].append(r["views"])
    avg = lambda d: {k: sum(v) / len(v) for k, v in d.items() if v}
    bd, bh, bt = avg(by_day), avg(by_hour), avg(by_type)
    day, hour, ctype = max(bd, key=bd.get), max(bh, key=bh.get), max(bt, key=bt.get)
    tips = [
        {"icon": "clock", "title": "Best posting window", "text": f"Posts on {DOW[day]}s around {hour:02d}:00 average {round(bd[day]):,} views — your strongest slot."},
        {"icon": "film", "title": "Winning format", "text": f"'{ctype}' content averages {round(bt[ctype]):,} views. Double down on this format."},
    ]
    tags = defaultdict(list)
    for r in rows:
        for t in set(r["hashtags"].split()):
            tags[t].append(r["views"])
    top_tags = sorted(tags, key=lambda t: sum(tags[t]) / len(tags[t]), reverse=True)[:3]
    tips.append({"icon": "hash", "title": "Hashtag strategy", "text": f"Your best performing tags: {', '.join(top_tags)}. Use them in your next three posts."})
    if cur_f and old_f and old_f[0]["v"]:
        g = (cur_f[0]["v"] - old_f[0]["v"]) / old_f[0]["v"] * 100
        tips.append({"icon": "trend", "title": "Growth pulse", "text": f"Followers changed {g:+.1f}% in 30 days. " +
                     ("Momentum is strong — keep your cadence." if g > 3 else "Try collaborations and Shorts/Reels to speed up growth.")})
    return {"tips": tips, "best_time": {"day": DOW[day], "hour": hour}}
