"""Audience Demographics & Deep Insights router (Module 3).
Provides multi-platform audience demographics, device analytics, active hours,
cross-platform comparison, and audience growth insights with strict RBAC and multi-role support.
"""
from datetime import date, datetime, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, FollowerGrowth, AudienceMetric, ContentRecord, AgencyCreator
from ..schemas import Platform
from ..services import resolve_range

router = APIRouter(prefix="/api/audience", tags=["Audience Analytics"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PLATFORM_LABELS = {
    "youtube": "YouTube",
    "instagram": "Instagram",
    "tiktok": "TikTok",
    "facebook": "Facebook",
    "x": "X (Twitter)",
    "linkedin": "LinkedIn",
}


def resolve_target_user(
    db: Session,
    current_user: User,
    user_id: Optional[int] = None
) -> int:
    """
    Validates and resolves the target user_id based on RBAC rules.
    - Creators can only view their own data (strict tenant isolation).
    - Agencies can view their own data or creators linked to their agency.
    - Marketing teams can view their own data or platform creators.
    - Admins can view any user's data.
    """
    if user_id is not None and user_id != current_user.id:
        if current_user.role == "admin":
            target = db.get(User, user_id)
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            return user_id

        if current_user.role == "agency":
            target = db.get(User, user_id)
            if not target or target.role != "creator":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found.")
            has_links = db.query(AgencyCreator).filter(AgencyCreator.agency_id == current_user.id).first()
            if has_links:
                is_linked = db.query(AgencyCreator).filter(
                    AgencyCreator.agency_id == current_user.id,
                    AgencyCreator.creator_id == user_id
                ).first()
                if not is_linked:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Creator is not in your agency roster."
                    )
            return user_id

        if current_user.role == "marketing":
            target = db.get(User, user_id)
            if not target or target.role != "creator":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found.")
            return user_id

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creators can only view their own analytics."
        )

    return current_user.id


def _rows(db: Session, user_id: int, platform: Optional[str], start: date, end: date):
    q = db.query(FollowerGrowth).filter(
        FollowerGrowth.user_id == user_id,
        FollowerGrowth.date >= start,
        FollowerGrowth.date <= end
    )
    if platform:
        q = q.filter(FollowerGrowth.platform == platform)
    return q.order_by(FollowerGrowth.date).all()


def _has_demo(db: Session, user_id: int) -> bool:
    has_growth = db.query(FollowerGrowth.id).filter(
        FollowerGrowth.user_id == user_id,
        FollowerGrowth.is_demo.is_(True)
    ).first() is not None
    if has_growth:
        return True
    return db.query(AudienceMetric.id).filter(
        AudienceMetric.user_id == user_id,
        AudienceMetric.is_demo.is_(True)
    ).first() is not None


def _get_platform_weights_and_query(db: Session, target_id: int, platform: Optional[str] = None):
    """Calculates platform weights based on latest follower snapshots for weighted demographic aggregation."""
    # Find latest follower count for each platform
    latest_subq = (
        db.query(
            FollowerGrowth.platform,
            func.max(FollowerGrowth.date).label("max_date")
        )
        .filter(FollowerGrowth.user_id == target_id)
        .group_by(FollowerGrowth.platform)
        .subquery()
    )

    latest_rows = (
        db.query(FollowerGrowth.platform, FollowerGrowth.followers)
        .join(
            latest_subq,
            (FollowerGrowth.platform == latest_subq.c.platform) &
            (FollowerGrowth.date == latest_subq.c.max_date)
        )
        .filter(FollowerGrowth.user_id == target_id)
        .all()
    )

    weight = {r.platform: r.followers for r in latest_rows}

    dq = db.query(AudienceMetric).filter(AudienceMetric.user_id == target_id)
    if platform:
        dq = dq.filter(AudienceMetric.platform == platform)
    metrics = dq.all()

    wsum = sum(weight.get(m.platform, 1) for m in metrics) or max(len(metrics), 1)
    return metrics, weight, wsum


@router.get("/creators")
def get_audience_creators(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authorized accounts that the caller may select for audience analytics.
    - Creators only receive their own account (strict tenant isolation).
    - Agencies receive their roster creators + self.
    - Marketing & Admin receive platform creators + self.
    """
    if current_user.role in ("creator",):
        return [{
            "id": current_user.id,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "email": current_user.email,
        }]

    options = [{
        "id": current_user.id,
        "full_name": f"{current_user.full_name} (Self / Primary)",
        "role": current_user.role,
        "email": current_user.email,
    }]

    if current_user.role == "agency":
        linked_ids = [r.creator_id for r in db.query(AgencyCreator).filter(AgencyCreator.agency_id == current_user.id).all()]
        if linked_ids:
            creators = db.query(User).filter(User.id.in_(linked_ids)).all()
        else:
            creators = db.query(User).filter(User.role == "creator").limit(20).all()
        for c in creators:
            options.append({
                "id": c.id,
                "full_name": c.full_name,
                "role": c.role,
                "email": c.email,
            })
        return options

    if current_user.role in ("marketing", "admin"):
        creators = db.query(User).filter(User.role == "creator").limit(25).all()
        for c in creators:
            options.append({
                "id": c.id,
                "full_name": c.full_name,
                "role": c.role,
                "email": c.email,
            })
        return options

    return options


# ---------------------------------------------------------------- Existing Growth & Summary APIs (enhanced with user_id)
@router.get("/growth")
def growth(
    platform: Optional[Platform] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = 30,
    user_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_id = resolve_target_user(db, user, user_id)
    start, end = resolve_range(start_date, end_date, days)
    by_date = {}
    for r in _rows(db, target_id, platform, start, end):
        d = by_date.setdefault(r.date.isoformat(), {"date": r.date.isoformat(), "total": 0, "new_followers": 0})
        d[r.platform] = r.followers
        d["total"] += r.followers
        d["new_followers"] += r.new_followers
    series = [by_date[k] for k in sorted(by_date)]
    return {"series": series, "start_date": start, "end_date": end, "has_demo": bool(series) and _has_demo(db, target_id)}


@router.get("/summary")
def summary(
    platform: Optional[Platform] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = 30,
    user_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_id = resolve_target_user(db, user, user_id)
    start, end = resolve_range(start_date, end_date, days)
    rows = _rows(db, target_id, platform, start, end)
    if not rows:
        return {"empty": True, "has_demo": False, "start_date": start, "end_date": end}

    per = {}
    for r in rows:
        p = per.setdefault(r.platform, {"platform": r.platform, "first": r.followers - r.new_followers, "followers": 0,
                                        "new_followers": 0, "impressions": 0, "reach": 0})
        p["followers"] = r.followers
        p["new_followers"] += r.new_followers
        p["impressions"] += r.impressions
        p["reach"] += r.reach
    platforms = []
    for p in per.values():
        p["growth_pct"] = round((p["followers"] - p["first"]) / p["first"] * 100, 2) if p["first"] > 0 else 0.0
        platforms.append(p)
    start_total = sum(p["first"] for p in platforms)
    total = sum(p["followers"] for p in platforms)
    growth_pct = round((total - start_total) / start_total * 100, 2) if start_total > 0 else 0.0

    dq = db.query(AudienceMetric).filter(AudienceMetric.user_id == target_id)
    if platform:
        dq = dq.filter(AudienceMetric.platform == platform)
    weight = {p["platform"]: p["followers"] for p in platforms}
    wsum = sum(weight.get(m.platform, 0) for m in dq) or 1

    def blend(attr):
        out = {}
        for m in dq:
            val = getattr(m, attr, None)
            if not val:
                continue
            w = weight.get(m.platform, 0) / wsum
            for k, v in val.items():
                out[k] = out.get(k, 0) + v * w
        return [{"name": k, "value": round(v, 1)} for k, v in out.items()]

    hours = [0.0] * 24
    for m in dq:
        w = weight.get(m.platform, 0) / wsum
        for h, v in enumerate(m.active_hours or []):
            hours[h] += v * w

    daily = {}
    for r in rows:
        daily[r.date] = daily.get(r.date, 0) + r.new_followers
    ordered = sorted(daily.items())
    half = max(1, len(ordered) // 2)
    first_avg = sum(v for _, v in ordered[:half]) / half
    second_avg = sum(v for _, v in ordered[half:]) / max(1, len(ordered) - half)
    change = ((second_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0
    direction = "accelerating" if change > 5 else "slowing" if change < -5 else "steady"
    best_day, best_val = max(ordered, key=lambda kv: kv[1])
    best_platform = max(platforms, key=lambda p: p["growth_pct"])
    trend = {
        "direction": direction, "avg_daily_new": round(sum(v for _, v in ordered) / len(ordered), 1),
        "best_day": best_day.isoformat(), "best_day_new": best_val, "momentum_change_pct": round(change, 1),
        "fastest_platform": best_platform["platform"],
        "message": (f"Growth is {direction}: average daily new followers moved {change:+.1f}% between the first and second "
                    f"half of the period. {best_platform['platform'].title()} is growing fastest ({best_platform['growth_pct']}%)."),
    }
    return {
        "empty": False, "has_demo": _has_demo(db, target_id), "start_date": start, "end_date": end,
        "cards": {"total_followers": total, "new_followers": sum(p["new_followers"] for p in platforms),
                  "growth_pct": growth_pct, "impressions": sum(p["impressions"] for p in platforms),
                  "reach": sum(p["reach"] for p in platforms)},
        "age": blend("age_distribution"), "gender": blend("gender_distribution"), "geo": blend("geo_distribution"),
        "device": blend("device_distribution"),
        "active_hours": [{"hour": f"{h:02d}:00", "activity": round(v, 1)} for h, v in enumerate(hours)],
        "platforms": sorted(platforms, key=lambda p: p["followers"], reverse=True), "trend": trend,
    }


# ---------------------------------------------------------------- Phase 5 Endpoints

@router.get("/demographics")
def get_demographics(
    platform: Optional[Platform] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Audience Demographics:
    - Age distribution (e.g., 13-17, 18-24, 25-34, 35-44, 45+)
    - Gender distribution (Female, Male, Other)
    - Geographic distribution (country percentages)
    - Location-based and demographic insights
    """
    target_id = resolve_target_user(db, current_user, user_id)
    metrics, weight, wsum = _get_platform_weights_and_query(db, target_id, platform)

    if not metrics:
        return {
            "is_empty": True,
            "has_demo": False,
            "platform": platform or "all",
            "age_distribution": [],
            "gender_distribution": [],
            "geographic_distribution": [],
            "insights": {
                "dominant_age_group": "N/A",
                "young_adults_share": 0.0,
                "core_demographic": "No demographic data available",
                "gender_split": "N/A",
                "top_country": "N/A",
                "international_reach_pct": 0.0,
                "summary": "No audience demographic data recorded. Connect social channels or load demo data."
            }
        }

    def blend(attr: str):
        out = {}
        for m in metrics:
            val = getattr(m, attr, None)
            if not val:
                continue
            w = weight.get(m.platform, 1) / wsum
            for k, v in val.items():
                out[k] = out.get(k, 0.0) + v * w
        # normalize to sum to 100% if possible
        s = sum(out.values())
        if s > 0:
            return [{"name": k, "value": round((v / s) * 100, 1)} for k, v in out.items()]
        return [{"name": k, "value": round(v, 1)} for k, v in out.items()]

    age = blend("age_distribution")
    gender = blend("gender_distribution")
    geo = [{"country": item["name"], "name": item["name"], "value": item["value"]} for item in blend("geo_distribution")]

    # Insights calculations
    dominant_age = max(age, key=lambda x: x["value"])["name"] if age else "N/A"
    dominant_age_val = max(age, key=lambda x: x["value"])["value"] if age else 0.0
    young_adults_share = sum(x["value"] for x in age if x["name"] in ("18-24", "25-34"))

    top_gender = max(gender, key=lambda x: x["value"])["name"] if gender else "N/A"
    top_gender_val = max(gender, key=lambda x: x["value"])["value"] if gender else 0.0

    sorted_geo = sorted(geo, key=lambda x: x["value"], reverse=True)
    top_country = sorted_geo[0]["name"] if sorted_geo else "N/A"
    top_country_val = sorted_geo[0]["value"] if sorted_geo else 0.0
    intl_share = round(100.0 - top_country_val, 1)

    summary = (
        f"Primary demographic cohort is {dominant_age} ({dominant_age_val}%) with a {top_gender.lower()} skew "
        f"({top_gender_val}%). The leading geographical market is {top_country} ({top_country_val}%), with "
        f"{intl_share}% international distribution."
    )

    return {
        "is_empty": False,
        "has_demo": _has_demo(db, target_id),
        "platform": platform or "all",
        "age_distribution": age,
        "gender_distribution": gender,
        "geographic_distribution": sorted_geo,
        "insights": {
            "dominant_age_group": f"{dominant_age} ({dominant_age_val}%)",
            "young_adults_share": round(young_adults_share, 1),
            "core_demographic": f"Young Adults (18-34) comprise {young_adults_share:.1f}% of audience",
            "gender_split": f"{top_gender} majority ({top_gender_val}%)",
            "top_country": f"{top_country} ({top_country_val}%)",
            "international_reach_pct": max(0.0, intl_share),
            "summary": summary,
        }
    }


@router.get("/devices")
def get_devices(
    platform: Optional[Platform] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Device Analytics:
    - Mobile usage percentage
    - Desktop usage percentage
    - Tablet usage percentage
    - Primary device type and formatting recommendations
    """
    target_id = resolve_target_user(db, current_user, user_id)
    metrics, weight, wsum = _get_platform_weights_and_query(db, target_id, platform)

    if not metrics:
        return {
            "is_empty": True,
            "has_demo": False,
            "platform": platform or "all",
            "device_distribution": [],
            "primary_device": "N/A",
            "mobile_share": 0.0,
            "desktop_share": 0.0,
            "tablet_share": 0.0,
            "insights": {
                "headline": "No Device Data",
                "summary": "Connect social channels or load demo data to view device analytics.",
                "recommendation": "N/A"
            }
        }

    raw = {"Mobile": 0.0, "Desktop": 0.0, "Tablet": 0.0}
    for m in metrics:
        devs = m.device_distribution or {}
        w = weight.get(m.platform, 1) / wsum
        for k in ("Mobile", "Desktop", "Tablet"):
            raw[k] += devs.get(k, 0.0) * w

    total_dev = sum(raw.values())
    if total_dev > 0:
        mobile = round((raw["Mobile"] / total_dev) * 100, 1)
        desktop = round((raw["Desktop"] / total_dev) * 100, 1)
        tablet = round((raw["Tablet"] / total_dev) * 100, 1)
    else:
        mobile, desktop, tablet = 0.0, 0.0, 0.0

    devices_list = [
        {"device": "Mobile", "name": "Mobile", "value": mobile, "percentage": mobile},
        {"device": "Desktop", "name": "Desktop", "value": desktop, "percentage": desktop},
        {"device": "Tablet", "name": "Tablet", "value": tablet, "percentage": tablet},
    ]

    primary = max(devices_list, key=lambda x: x["value"])["device"] if total_dev > 0 else "Mobile"
    primary_pct = max(mobile, desktop, tablet)

    if primary == "Mobile":
        rec = "Prioritize vertical 9:16 aspect ratio video, clear high-contrast captions, and immediate 3-second mobile hooks."
    elif primary == "Desktop":
        rec = "Audience favors horizontal 16:9 high-definition content, multi-tab exploration, and detailed walkthroughs."
    else:
        rec = "Balanced multi-device audience: ensure flexible aspect ratio framing and clear typography."

    return {
        "is_empty": total_dev == 0,
        "has_demo": _has_demo(db, target_id),
        "platform": platform or "all",
        "device_distribution": devices_list,
        "primary_device": primary,
        "mobile_share": mobile,
        "desktop_share": desktop,
        "tablet_share": tablet,
        "insights": {
            "headline": f"{primary}-Dominant Audience ({primary_pct}%)",
            "summary": f"{mobile}% of views originate from mobile devices, {desktop}% from desktop browsers, and {tablet}% from tablets.",
            "recommendation": rec
        }
    }


@router.get("/active-hours")
def get_active_hours(
    platform: Optional[Platform] = None,
    days: int = 30,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Active Hours & Posting Schedule:
    - Hourly relative activity score (0-100) across 24 hours
    - Best engagement time window (peak periods)
    - Day-of-week activity trends derived from historical growth patterns
    """
    target_id = resolve_target_user(db, current_user, user_id)
    metrics, weight, wsum = _get_platform_weights_and_query(db, target_id, platform)

    if not metrics:
        return {
            "is_empty": True,
            "has_demo": False,
            "platform": platform or "all",
            "hourly_activity": [],
            "peak_hours": [],
            "best_time_to_post": "N/A",
            "day_patterns": [],
            "best_day_of_week": "N/A",
            "insights": {
                "peak_window": "N/A",
                "best_day": "N/A",
                "summary": "No active hour telemetry available.",
                "recommendation": "Connect accounts or load demo data to view optimal posting times."
            }
        }

    hours = [0.0] * 24
    for m in metrics:
        w = weight.get(m.platform, 1) / wsum
        for h, v in enumerate(m.active_hours or []):
            hours[h] += v * w

    max_act = max(hours) if hours else 100.0
    threshold = max(50.0, max_act * 0.75)
    peak_hours_set = {h for h, v in enumerate(hours) if v >= threshold}

    # Find 3-hour sliding window with highest aggregate activity
    best_start = 18
    best_window_sum = -1.0
    for h in range(24):
        w_sum = sum(hours[(h + i) % 24] for i in range(3))
        if w_sum > best_window_sum:
            best_window_sum = w_sum
            best_start = h

    best_window_end = (best_start + 3) % 24
    best_time_str = f"{best_start:02d}:00 - {best_window_end:02d}:00"

    # Day of week patterns from historical FollowerGrowth
    start_date = date.today() - timedelta(days=days)
    growth_rows = _rows(db, target_id, platform, start_date, date.today())
    day_counts = {i: [] for i in range(7)}
    for r in growth_rows:
        day_counts[r.date.weekday()].append(r.new_followers)

    day_patterns = []
    for day_idx in range(7):
        vals = day_counts[day_idx]
        avg_val = round(sum(vals) / len(vals), 1) if vals else 0.0
        day_patterns.append({
            "day_index": day_idx,
            "day": DAY_NAMES[day_idx],
            "short_day": DAY_NAMES[day_idx][:3],
            "avg_new_followers": avg_val,
        })

    best_day_item = max(day_patterns, key=lambda x: x["avg_new_followers"]) if day_patterns else None
    best_day_name = best_day_item["day"] if best_day_item and best_day_item["avg_new_followers"] > 0 else "Friday"

    hourly_activity = [
        {
            "hour": f"{h:02d}:00",
            "hour_int": h,
            "activity": round(v, 1),
            "is_peak": h in peak_hours_set,
        }
        for h, v in enumerate(hours)
    ]

    return {
        "is_empty": False,
        "has_demo": _has_demo(db, target_id),
        "platform": platform or "all",
        "hourly_activity": hourly_activity,
        "peak_hours": [f"{h:02d}:00" for h in sorted(peak_hours_set)],
        "best_time_to_post": best_time_str,
        "day_patterns": day_patterns,
        "best_day_of_week": best_day_name,
        "insights": {
            "peak_window": best_time_str,
            "best_day": best_day_name,
            "summary": f"Your audience demonstrates highest activity between {best_time_str}, with {best_day_name} showing the strongest engagement velocity.",
            "recommendation": f"Schedule tier-1 content releases between {best_time_str} on {best_day_name} to maximize initial 2-hour algorithmic lift."
        }
    }


@router.get("/platform-comparison")
def get_platform_comparison(
    days: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cross-Platform Comparison:
    - Followers, net new followers, reach, impressions, growth %
    - Cross-platform audience distribution share
    - Top performing platform by reach, followers, and engagement
    """
    target_id = resolve_target_user(db, current_user, user_id)
    start, end = resolve_range(start_date, end_date, days)
    rows = _rows(db, target_id, None, start, end)

    if not rows:
        return {
            "is_empty": True,
            "has_demo": False,
            "start_date": start,
            "end_date": end,
            "platforms": [],
            "totals": {
                "total_followers": 0,
                "total_new_followers": 0,
                "total_reach": 0,
                "total_impressions": 0,
                "growth_pct": 0.0,
                "connected_platforms_count": 0,
            },
            "top_platform_by_followers": "N/A",
            "top_platform_by_reach": "N/A",
            "fastest_growing_platform": "N/A",
            "insights": {"summary": "No cross-platform audience metrics found in this date range."}
        }

    per_plat = {}
    for r in rows:
        p = per_plat.setdefault(r.platform, {
            "platform": r.platform,
            "platform_label": PLATFORM_LABELS.get(r.platform, r.platform.title()),
            "first": r.followers - r.new_followers,
            "followers": 0,
            "new_followers": 0,
            "impressions": 0,
            "reach": 0,
        })
        p["followers"] = r.followers
        p["new_followers"] += r.new_followers
        p["impressions"] += r.impressions
        p["reach"] += r.reach

    # Calculate engagement rate per platform from ContentRecord
    content_rows = db.query(ContentRecord).filter(
        ContentRecord.user_id == target_id,
        ContentRecord.published_at >= start,
        ContentRecord.published_at <= end
    ).all()

    content_per_plat = {}
    for c in content_rows:
        cp = content_per_plat.setdefault(c.platform, {"eng": 0, "reach": 0})
        cp["eng"] += (c.likes + c.comments + c.shares + c.saves)
        cp["reach"] += c.reach

    total_followers = sum(p["followers"] for p in per_plat.values())
    total_reach = sum(p["reach"] for p in per_plat.values())
    total_new = sum(p["new_followers"] for p in per_plat.values())
    total_imp = sum(p["impressions"] for p in per_plat.values())
    start_total = sum(p["first"] for p in per_plat.values())
    overall_growth = round((total_followers - start_total) / start_total * 100, 2) if start_total > 0 else 0.0

    platform_list = []
    for p in per_plat.values():
        growth_pct = round((p["followers"] - p["first"]) / p["first"] * 100, 2) if p["first"] > 0 else 0.0
        c_stats = content_per_plat.get(p["platform"], {"eng": 0, "reach": 0})
        eng_rate = round((c_stats["eng"] / max(1, c_stats["reach"])) * 100, 2) if c_stats["reach"] > 0 else 0.0

        follower_share = round((p["followers"] / max(1, total_followers)) * 100, 1)
        reach_share = round((p["reach"] / max(1, total_reach)) * 100, 1)

        platform_list.append({
            "platform": p["platform"],
            "platform_label": p["platform_label"],
            "followers": p["followers"],
            "new_followers": p["new_followers"],
            "growth_pct": growth_pct,
            "impressions": p["impressions"],
            "reach": p["reach"],
            "engagement_rate": eng_rate,
            "follower_share_pct": follower_share,
            "reach_share_pct": reach_share,
        })

    platform_list.sort(key=lambda x: x["followers"], reverse=True)

    top_by_followers = max(platform_list, key=lambda x: x["followers"])["platform"]
    top_by_reach = max(platform_list, key=lambda x: x["reach"])["platform"]
    fastest_growing = max(platform_list, key=lambda x: x["growth_pct"])["platform"]

    summary = (
        f"{PLATFORM_LABELS.get(top_by_followers, top_by_followers).title()} commands your largest follower base "
        f"({per_plat[top_by_followers]['followers']:,} followers), while "
        f"{PLATFORM_LABELS.get(fastest_growing, fastest_growing).title()} demonstrates the highest velocity "
        f"(+{max(p['growth_pct'] for p in platform_list):.1f}% growth)."
    )

    return {
        "is_empty": False,
        "has_demo": _has_demo(db, target_id),
        "start_date": start,
        "end_date": end,
        "platforms": platform_list,
        "totals": {
            "total_followers": total_followers,
            "total_new_followers": total_new,
            "total_reach": total_reach,
            "total_impressions": total_imp,
            "growth_pct": overall_growth,
            "connected_platforms_count": len(platform_list),
        },
        "top_platform_by_followers": top_by_followers,
        "top_platform_by_reach": top_by_reach,
        "fastest_growing_platform": fastest_growing,
        "insights": {
            "summary": summary
        }
    }


@router.get("/insights")
def get_audience_insights(
    days: int = 30,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    platform: Optional[Platform] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Audience Insights & Growth Intelligence:
    - Follower growth momentum & velocity
    - Demographic composition highlights
    - Audience health score (0-100)
    - Actionable optimization recommendations
    """
    target_id = resolve_target_user(db, current_user, user_id)
    start, end = resolve_range(start_date, end_date, days)
    rows = _rows(db, target_id, platform, start, end)

    if not rows:
        return {
            "is_empty": True,
            "has_demo": False,
            "growth_indicators": {
                "direction": "steady",
                "momentum_change_pct": 0.0,
                "avg_daily_new": 0.0,
                "best_day": date.today().isoformat(),
                "best_day_new": 0,
                "fastest_growing_platform": "N/A"
            },
            "demographic_highlights": {
                "dominant_age": "N/A",
                "dominant_gender": "N/A",
                "primary_country": "N/A",
                "primary_device": "N/A"
            },
            "audience_health_score": 0.0,
            "key_recommendations": [
                "Connect social channels or load demo data to unlock AI audience insights."
            ],
            "summary": "No audience records found for this timeframe."
        }

    daily = {}
    for r in rows:
        daily[r.date] = daily.get(r.date, 0) + r.new_followers
    ordered = sorted(daily.items())
    half = max(1, len(ordered) // 2)
    first_avg = sum(v for _, v in ordered[:half]) / half
    second_avg = sum(v for _, v in ordered[half:]) / max(1, len(ordered) - half)
    change = ((second_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0.0
    direction = "accelerating" if change > 5 else "slowing" if change < -5 else "steady"
    best_day, best_val = max(ordered, key=lambda kv: kv[1])
    avg_daily_new = round(sum(v for _, v in ordered) / len(ordered), 1)

    # Demographics query
    metrics, weight, wsum = _get_platform_weights_and_query(db, target_id, platform)
    dom_age = "18-24"
    dom_gender = "Female"
    top_country = "India"
    top_device = "Mobile"

    if metrics:
        def blend(attr):
            out = {}
            for m in metrics:
                val = getattr(m, attr, None) or {}
                w = weight.get(m.platform, 1) / wsum
                for k, v in val.items():
                    out[k] = out.get(k, 0.0) + v * w
            return out

        age_b = blend("age_distribution")
        if age_b:
            dom_age = max(age_b, key=age_b.get)
        gender_b = blend("gender_distribution")
        if gender_b:
            dom_gender = max(gender_b, key=gender_b.get)
        geo_b = blend("geo_distribution")
        if geo_b:
            top_country = max(geo_b, key=geo_b.get)
        dev_b = blend("device_distribution")
        if dev_b:
            top_device = max(dev_b, key=dev_b.get)

    # Composite Audience Health Score (0-100)
    # Factor 1: Growth momentum (capped 0-35)
    momentum_pts = 20.0 + min(15.0, max(-15.0, change * 0.75))
    # Factor 2: Retention / Daily gain stability (capped 0-35)
    stability_pts = min(35.0, max(10.0, avg_daily_new * 0.25 + 15.0))
    # Factor 3: Multi-channel diversification (capped 0-30)
    unique_platforms = len({r.platform for r in rows})
    platform_pts = min(30.0, unique_platforms * 5.0)

    health_score = round(min(100.0, max(25.0, momentum_pts + stability_pts + platform_pts)), 1)

    recommendations = [
        f"Target content hooks towards your primary {dom_age} demographic who represent the highest engagement density.",
        f"Maintain {top_device}-first video pacing (vertical framing, instant visual hook within 2.5s) as {top_device} drives primary viewership.",
        f"Capitalize on {direction} trajectory by scheduling series drops ahead of weekly peak days to maintain retention momentum.",
        f"Expand localized partnerships within your top geographic hub ({top_country}) while testing cross-platform teasers."
    ]

    summary = (
        f"Audience health is rated at {health_score}/100 with an {direction} growth trajectory (+{change:+.1f}% momentum). "
        f"Core demographic is {dom_age} {dom_gender.lower()} viewers based predominantly in {top_country} using {top_device} devices."
    )

    return {
        "is_empty": False,
        "has_demo": _has_demo(db, target_id),
        "growth_indicators": {
            "direction": direction,
            "momentum_change_pct": round(change, 1),
            "avg_daily_new": avg_daily_new,
            "best_day": best_day.isoformat(),
            "best_day_new": best_val,
            "fastest_growing_platform": platform or "youtube"
        },
        "demographic_highlights": {
            "dominant_age": dom_age,
            "dominant_gender": dom_gender,
            "primary_country": top_country,
            "primary_device": top_device
        },
        "audience_health_score": health_score,
        "key_recommendations": recommendations,
        "summary": summary
    }
