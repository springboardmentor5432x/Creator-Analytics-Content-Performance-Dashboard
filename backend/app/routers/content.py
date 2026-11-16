from datetime import date
from math import ceil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, asc, desc
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import User, ContentRecord
from ..schemas import ContentIn, ContentOut, ContentCompareIn, Platform
from ..services import content_to_dict, engagement_rate, log

router = APIRouter(prefix="/api/content", tags=["Content Analytics"])

SORTABLE = {"title", "platform", "published_at", "views", "likes", "comments", "shares", "saves", "reach",
            "watch_time_minutes", "engagement_rate"}
TOP_SORTABLE = {"engagement_rate", "views", "reach", "likes", "comments", "shares", "saves", "watch_time_minutes"}


def _base(db, user, platform, start, end, search=None):
    q = db.query(ContentRecord).filter(ContentRecord.user_id == user.id)  # user-specific data access
    if platform:
        q = q.filter(ContentRecord.platform == platform)
    if start:
        q = q.filter(ContentRecord.published_at >= start)
    if end:
        q = q.filter(ContentRecord.published_at <= end)
    if search:
        q = q.filter(ContentRecord.title.ilike(f"%{search}%"))
    return q


def build_comparison_data(items: list[dict]) -> dict:
    metric_keys = [
        ("views", "Views"),
        ("reach", "Reach"),
        ("likes", "Likes"),
        ("comments", "Comments"),
        ("shares", "Shares"),
        ("saves", "Saves"),
        ("watch_time_minutes", "Watch Time (min)"),
        ("engagement_rate", "Engagement Rate (%)"),
    ]

    metrics = {}
    for key, label in metric_keys:
        vals = [item[key] for item in items]
        max_val = max(vals)
        min_val = min(vals)
        best_item = next(item for item in items if item[key] == max_val)
        avg_val = round(sum(vals) / len(vals), 2)
        metrics[key] = {
            "label": label,
            "max": max_val,
            "min": min_val,
            "average": avg_val,
            "best_item_id": best_item["id"],
            "best_item_title": best_item["title"],
            "values": {item["id"]: item[key] for item in items},
        }

    # Grouped chart dataset formatted for Recharts
    chart_data = []
    for key, label in metric_keys:
        row = {"metric": label, "key": key}
        for item in items:
            row[f"item_{item['id']}"] = item[key]
            row[f"title_{item['id']}"] = item["title"]
        chart_data.append(row)

    return {
        "items": items,
        "metrics": metrics,
        "chart_data": chart_data,
        "item_count": len(items),
    }


def _compare_records(id_list: list[int], user: User, db: Session):
    if len(id_list) < 2:
        raise HTTPException(422, "Select at least 2 content items to compare.")
    if len(id_list) > 10:
        raise HTTPException(422, "Maximum 10 content items can be compared simultaneously.")

    q = db.query(ContentRecord).filter(ContentRecord.id.in_(id_list))
    if user.role not in ("admin", "administrator"):
        q = q.filter(ContentRecord.user_id == user.id)
    records = q.all()

    if len(records) != len(set(id_list)):
        raise HTTPException(404, "One or more content records not found or not accessible.")

    records_by_id = {r.id: r for r in records}
    ordered = [records_by_id[i] for i in id_list]
    items = [content_to_dict(r) for r in ordered]
    return build_comparison_data(items)


@router.post("/compare")
def compare_content_post(body: ContentCompareIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compare 2 or more selected content records side-by-side."""
    return _compare_records(body.ids, user, db)


@router.get("/compare")
def compare_content_get(ids: str = Query(..., description="Comma-separated IDs e.g. 1,2"),
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compare content records via query parameter."""
    try:
        id_list = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(422, "IDs must be a comma-separated list of integers.")
    return _compare_records(id_list, user, db)


@router.get("")
def list_content(platform: Optional[Platform] = None, start_date: Optional[date] = None, end_date: Optional[date] = None,
                 search: Optional[str] = Query(None, max_length=100), sort_by: str = "published_at",
                 order: str = Query("desc", pattern="^(asc|desc)$"), page: int = Query(1, ge=1),
                 page_size: int = Query(10, ge=1, le=100), user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if sort_by not in SORTABLE:
        raise HTTPException(422, f"sort_by must be one of: {', '.join(sorted(SORTABLE))}")
    q = _base(db, user, platform, start_date, end_date, search)
    total = q.count()
    if sort_by == "engagement_rate":
        c = ContentRecord
        expr = (c.likes + c.comments + c.shares + c.saves) * 100.0 / func.nullif(c.reach, 0)
        expr = func.coalesce(expr, 0)
    else:
        expr = getattr(ContentRecord, sort_by)
    q = q.order_by(asc(expr) if order == "asc" else desc(expr), ContentRecord.id.desc())
    rows = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [content_to_dict(r) for r in rows], "total": total, "page": page,
            "page_size": page_size, "pages": max(1, ceil(total / page_size))}


@router.get("/summary")
def summary(platform: Optional[Platform] = None, start_date: Optional[date] = None, end_date: Optional[date] = None,
            top_by: str = Query("engagement_rate"), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if top_by not in TOP_SORTABLE:
        top_by = "engagement_rate"
    rows = _base(db, user, platform, start_date, end_date).all()
    items = [content_to_dict(r) for r in rows]
    tot = lambda k: sum(i[k] for i in items)
    reach = tot("reach")
    engagement = tot("likes") + tot("comments") + tot("shares") + tot("saves")
    trend = {}
    for i in items:
        d = trend.setdefault(i["published_at"].isoformat(), {"date": i["published_at"].isoformat(), "views": 0, "engagement": 0, "reach": 0})
        d["views"] += i["views"]
        d["reach"] += i["reach"]
        d["engagement"] += i["likes"] + i["comments"] + i["shares"] + i["saves"]
    plat = {}
    for i in items:
        p = plat.setdefault(i["platform"], {"platform": i["platform"], "posts": 0, "views": 0, "likes": 0, "comments": 0,
                                           "shares": 0, "saves": 0, "reach": 0})
        p["posts"] += 1
        for k in ("views", "likes", "comments", "shares", "saves", "reach"):
            p[k] += i[k]
    for p in plat.values():
        p["engagement_rate"] = engagement_rate(p["likes"], p["comments"], p["shares"], p["saves"], p["reach"])

    # Sort top posts by the requested metric
    top_posts = sorted(items, key=lambda i: i[top_by], reverse=True)[:5]

    return {
        "formula": "(Likes + Comments + Shares + Saves) ÷ Reach × 100",
        "top_by": top_by,
        "totals": {"posts": len(items), "views": tot("views"), "likes": tot("likes"), "comments": tot("comments"),
                   "shares": tot("shares"), "saves": tot("saves"), "reach": reach, "engagement": engagement,
                   "watch_time_minutes": round(tot("watch_time_minutes"), 1),
                   "engagement_rate": engagement_rate(tot("likes"), tot("comments"), tot("shares"), tot("saves"), reach)},
        "top_posts": top_posts,
        "trend": sorted(trend.values(), key=lambda d: d["date"]),
        "platforms": sorted(plat.values(), key=lambda p: p["views"], reverse=True),
        "has_demo": any(i["is_demo"] for i in items),
    }


def _owned(db, user, content_id) -> ContentRecord:
    rec = db.get(ContentRecord, content_id)
    if not rec or rec.user_id != user.id:  # 404 (not 403) so IDs of other users are not revealed
        raise HTTPException(404, "Content record not found.")
    return rec


@router.post("", response_model=ContentOut, status_code=201)
def create(body: ContentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = ContentRecord(user_id=user.id, **body.model_dump())
    db.add(rec)
    log(db, user.id, "content_add", f"Added “{body.title}”")
    db.commit()
    db.refresh(rec)
    return content_to_dict(rec)


@router.get("/{content_id}", response_model=ContentOut)
def get_one(content_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return content_to_dict(_owned(db, user, content_id))


@router.put("/{content_id}", response_model=ContentOut)
def update(content_id: int, body: ContentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = _owned(db, user, content_id)
    for k, v in body.model_dump().items():
        setattr(rec, k, v)
    rec.is_demo = False  # edited by the user -> no longer sample data
    log(db, user.id, "content_edit", f"Edited “{rec.title}”")
    db.commit()
    db.refresh(rec)
    return content_to_dict(rec)


@router.delete("/{content_id}")
def delete(content_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = _owned(db, user, content_id)
    log(db, user.id, "content_delete", f"Deleted “{rec.title}”")
    db.delete(rec)
    db.commit()
    return {"message": "Content record deleted."}
