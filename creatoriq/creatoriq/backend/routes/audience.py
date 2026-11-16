"""Audience Analytics module: follower growth, demographics, behaviour."""
from fastapi import APIRouter, Depends, Query

from ..database import db, q
from ..security import target_creator
from ..services.analytics import window

router = APIRouter(prefix="/api/audience", tags=["audience"])


@router.get("/growth")
def growth(days: int = Query(30, ge=7, le=365), uid: int = Depends(target_creator)):
    start, end, _ = window(days)
    with db() as c:
        rows = q(c, "SELECT date, platform, followers, impressions, reach FROM audience_daily WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date",
                 (uid, start, end))
        net = q(c, """SELECT platform, MIN(date) d0, MAX(date) d1 FROM audience_daily WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY platform""", (uid, start, end))
        summary = []
        for n in net:
            a = c.execute("SELECT followers FROM audience_daily WHERE user_id=? AND platform=? AND date=?", (uid, n["platform"], n["d0"])).fetchone()[0]
            b = c.execute("SELECT followers FROM audience_daily WHERE user_id=? AND platform=? AND date=?", (uid, n["platform"], n["d1"])).fetchone()[0]
            summary.append({"platform": n["platform"], "followers": b, "gained": b - a, "pct": round((b - a) / a * 100, 2) if a else 0})
    return {"daily": rows, "summary": summary}


@router.get("/demographics")
def demographics(uid: int = Depends(target_creator)):
    with db() as c:
        rows = q(c, "SELECT category, label, value FROM audience_demo WHERE user_id=? ORDER BY id", (uid,))
        eng = q(c, """SELECT CAST(strftime('%w', published_at) AS INT) dow, ROUND(SUM(likes+comments+shares+saves)*100.0/NULLIF(SUM(views),0),2) er, COUNT(*) posts
                      FROM content WHERE user_id=? GROUP BY dow ORDER BY dow""", (uid,))
    out = {}
    for r in rows:
        out.setdefault(r["category"], []).append({"label": r["label"], "value": r["value"]})
    out["engagement_by_weekday"] = eng
    return out
