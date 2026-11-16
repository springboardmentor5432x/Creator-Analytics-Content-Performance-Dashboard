from datetime import date, timedelta
from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, asc, desc
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import User, RevenueRecord
from ..schemas import (
    RevenueRecordIn,
    RevenueRecordUpdate,
    RevenueRecordOut,
    RevenueSource,
    REVENUE_SOURCES,
    Platform,
    PLATFORMS,
)
from ..services import revenue_to_dict, log, resolve_range

router = APIRouter(prefix="/api/revenue", tags=["Revenue Analytics"])

SORTABLE = {"date", "amount", "source", "platform", "created_at"}

SOURCE_LABELS = {
    "sponsorships": "Sponsorships",
    "ad_revenue": "Ad Revenue",
    "affiliate": "Affiliate Marketing",
    "brand_collaborations": "Brand Collaborations",
    "subscriptions": "Subscriptions",
}

PLATFORM_LABELS = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "tiktok": "TikTok",
    "facebook": "Facebook",
    "x": "X (Twitter)",
    "linkedin": "LinkedIn",
}


def _base_query(
    db: Session,
    user: User,
    platform: Optional[str] = None,
    source: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    search: Optional[str] = None,
):
    q = db.query(RevenueRecord).filter(RevenueRecord.user_id == user.id)
    if platform:
        q = q.filter(RevenueRecord.platform == platform)
    if source:
        q = q.filter(RevenueRecord.source == source)
    if start:
        q = q.filter(RevenueRecord.date >= start)
    if end:
        q = q.filter(RevenueRecord.date <= end)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            (RevenueRecord.notes.ilike(s))
            | (RevenueRecord.source.ilike(s))
            | (RevenueRecord.platform.ilike(s))
        )
    return q


def _owned(db: Session, user: User, record_id: int) -> RevenueRecord:
    rec = db.get(RevenueRecord, record_id)
    if not rec or (rec.user_id != user.id and user.role not in ("admin", "administrator")):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Revenue record not found.")
    return rec


@router.get("/summary")
def get_revenue_summary(
    platform: Optional[Platform] = None,
    source: Optional[RevenueSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = 90,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start, end = resolve_range(start_date, end_date, days)
    records = _base_query(db, user, platform, source, start, end).all()

    total_revenue = round(sum(r.amount for r in records), 2)

    # Calculate Current Month vs Previous Month for KPI Growth
    today = date.today()
    first_this_month = today.replace(day=1)
    if first_this_month.month == 1:
        first_prev_month = date(first_this_month.year - 1, 12, 1)
    else:
        first_prev_month = date(first_this_month.year, first_this_month.month - 1, 1)
    last_prev_month = first_this_month - timedelta(days=1)

    # Base query for monthly comparisons (respecting platform/source filters)
    mq = db.query(RevenueRecord).filter(RevenueRecord.user_id == user.id)
    if platform:
        mq = mq.filter(RevenueRecord.platform == platform)
    if source:
        mq = mq.filter(RevenueRecord.source == source)

    this_month_recs = mq.filter(RevenueRecord.date >= first_this_month, RevenueRecord.date <= today).all()
    prev_month_recs = mq.filter(RevenueRecord.date >= first_prev_month, RevenueRecord.date <= last_prev_month).all()

    current_month_revenue = round(sum(r.amount for r in this_month_recs), 2)
    previous_month_revenue = round(sum(r.amount for r in prev_month_recs), 2)

    if previous_month_revenue > 0:
        growth_pct = round(((current_month_revenue - previous_month_revenue) / previous_month_revenue) * 100, 2)
    elif current_month_revenue > 0:
        growth_pct = 100.0
    else:
        growth_pct = 0.0

    # Revenue Breakdown by Source
    source_totals = {s: 0.0 for s in REVENUE_SOURCES}
    source_counts = {s: 0 for s in REVENUE_SOURCES}
    for r in records:
        if r.source in source_totals:
            source_totals[r.source] += r.amount
            source_counts[r.source] += 1

    breakdown_by_source = []
    for s in REVENUE_SOURCES:
        amt = round(source_totals[s], 2)
        pct = round((amt / total_revenue * 100), 1) if total_revenue > 0 else 0.0
        breakdown_by_source.append({
            "source": s,
            "label": SOURCE_LABELS.get(s, s.title()),
            "amount": amt,
            "percentage": pct,
            "count": source_counts[s],
        })
    breakdown_by_source.sort(key=lambda x: x["amount"], reverse=True)

    # Monthly Revenue Trends (grouped by YYYY-MM)
    monthly_map = {}
    for r in records:
        m_key = r.date.strftime("%Y-%m")
        label = r.date.strftime("%b %Y")
        if m_key not in monthly_map:
            monthly_map[m_key] = {
                "month": m_key,
                "label": label,
                "total": 0.0,
                **{s: 0.0 for s in REVENUE_SOURCES},
            }
        monthly_map[m_key]["total"] = round(monthly_map[m_key]["total"] + r.amount, 2)
        if r.source in monthly_map[m_key]:
            monthly_map[m_key][r.source] = round(monthly_map[m_key][r.source] + r.amount, 2)

    monthly_trends = sorted(monthly_map.values(), key=lambda x: x["month"])

    # Platform-wise Revenue
    platform_map = {}
    for r in records:
        p = r.platform
        d = platform_map.setdefault(p, {
            "platform": p,
            "name": PLATFORM_LABELS.get(p, p.title()),
            "amount": 0.0,
            "count": 0,
        })
        d["amount"] = round(d["amount"] + r.amount, 2)
        d["count"] += 1

    platform_breakdown = []
    for p, d in platform_map.items():
        pct = round((d["amount"] / total_revenue * 100), 1) if total_revenue > 0 else 0.0
        platform_breakdown.append({
            **d,
            "percentage": pct,
        })
    platform_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    has_demo = any(r.is_demo for r in records)

    return {
        "start_date": start,
        "end_date": end,
        "cards": {
            "total_revenue": total_revenue,
            "current_month_revenue": current_month_revenue,
            "previous_month_revenue": previous_month_revenue,
            "growth_pct": growth_pct,
            "transaction_count": len(records),
            "average_transaction": round(total_revenue / max(1, len(records)), 2),
        },
        "breakdown_by_source": breakdown_by_source,
        "monthly_trends": monthly_trends,
        "platform_breakdown": platform_breakdown,
        "has_demo": has_demo,
        "empty": len(records) == 0,
    }


@router.get("/records")
def list_revenue_records(
    platform: Optional[Platform] = None,
    source: Optional[RevenueSource] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, max_length=100),
    sort_by: str = "date",
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if sort_by not in SORTABLE:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"sort_by must be one of: {', '.join(sorted(SORTABLE))}",
        )
    q = _base_query(db, user, platform, source, start_date, end_date, search)
    total = q.count()

    expr = getattr(RevenueRecord, sort_by)
    q = q.order_by(asc(expr) if order == "asc" else desc(expr), RevenueRecord.id.desc())
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [revenue_to_dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, ceil(total / page_size)),
    }


@router.post("/records", response_model=RevenueRecordOut, status_code=201)
def create_revenue_record(
    body: RevenueRecordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = RevenueRecord(user_id=user.id, **body.model_dump(), is_demo=False)
    db.add(rec)
    log(db, user.id, "revenue_add", f"Added ${body.amount:.2f} ({body.source}) on {body.platform}")
    db.commit()
    db.refresh(rec)
    return revenue_to_dict(rec)


@router.get("/records/{record_id}", response_model=RevenueRecordOut)
def get_revenue_record(
    record_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return revenue_to_dict(_owned(db, user, record_id))


@router.put("/records/{record_id}", response_model=RevenueRecordOut)
def update_revenue_record(
    record_id: int,
    body: RevenueRecordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _owned(db, user, record_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(rec, k, v)
    rec.is_demo = False
    log(db, user.id, "revenue_edit", f"Updated ${rec.amount:.2f} ({rec.source})")
    db.commit()
    db.refresh(rec)
    return revenue_to_dict(rec)


@router.delete("/records/{record_id}")
def delete_revenue_record(
    record_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _owned(db, user, record_id)
    log(db, user.id, "revenue_delete", f"Deleted ${rec.amount:.2f} ({rec.source})")
    db.delete(rec)
    db.commit()
    return {"message": "Revenue record deleted."}

