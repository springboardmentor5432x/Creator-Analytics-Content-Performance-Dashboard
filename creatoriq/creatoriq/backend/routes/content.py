"""Content Analytics module: performance tracking, comparison, top content, trends."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException

from ..database import db, q
from ..security import target_creator
from ..services.analytics import window, eng_rate

router = APIRouter(prefix="/api/content", tags=["content"])
SORTS = {"views": "views", "likes": "likes", "comments": "comments", "shares": "shares", "saves": "saves",
         "reach": "reach", "watch_time": "watch_time", "date": "published_at"}


@router.get("")
def list_content(days: int = Query(30, ge=1, le=365), platform: Optional[str] = None, type: Optional[str] = None,
                 search: str = "", sort: str = "views", limit: int = Query(50, le=200), uid: int = Depends(target_creator)):
    start, end, _ = window(days)
    sql = "SELECT * FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ?"
    args = [uid, start, end]
    if platform:
        sql += " AND platform=?"; args.append(platform)
    if type:
        sql += " AND type=?"; args.append(type)
    if search:
        sql += " AND (title LIKE ? OR hashtags LIKE ?)"; args += [f"%{search}%"] * 2
    sql += f" ORDER BY {SORTS.get(sort, 'views')} DESC LIMIT ?"
    args.append(limit)
    with db() as c:
        rows = q(c, sql, args)
        types = [r["type"] for r in q(c, "SELECT DISTINCT type FROM content WHERE user_id=?", (uid,))]
    for r in rows:
        r["er"] = eng_rate(r)
    return {"items": rows, "types": types}


@router.get("/summary")
def summary(days: int = Query(30, ge=7, le=365), uid: int = Depends(target_creator)):
    start, end, _ = window(days)
    with db() as c:
        by_type = q(c, """SELECT type, COUNT(*) posts, ROUND(AVG(views)) avg_views,
                          ROUND(SUM(likes+comments+shares+saves)*100.0/NULLIF(SUM(views),0),2) er
                          FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY type ORDER BY avg_views DESC""", (uid, start, end))
        weekly = q(c, """SELECT strftime('%Y-W%W', published_at) week, SUM(views) views,
                         ROUND(SUM(likes+comments+shares+saves)*100.0/NULLIF(SUM(views),0),2) er, COUNT(*) posts
                         FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY week ORDER BY week""", (uid, start, end))
        daily = q(c, """SELECT date(published_at) date, SUM(views) views, SUM(likes) likes, SUM(comments) comments, SUM(shares) shares, SUM(saves) saves
                        FROM content WHERE user_id=? AND date(published_at) BETWEEN ? AND ? GROUP BY date ORDER BY date""", (uid, start, end))
    return {"by_type": by_type, "weekly": weekly, "daily": daily}


@router.get("/compare")
def compare(ids: str, uid: int = Depends(target_creator)):
    try:
        id_list = [int(i) for i in ids.split(",") if i][:5]
    except ValueError:
        raise HTTPException(400, "ids must be comma separated integers")
    if len(id_list) < 2:
        raise HTTPException(400, "Select at least two posts to compare")
    with db() as c:
        rows = q(c, f"SELECT * FROM content WHERE user_id=? AND id IN ({','.join('?' * len(id_list))})", [uid, *id_list])
    for r in rows:
        r["er"] = eng_rate(r)
    return rows
