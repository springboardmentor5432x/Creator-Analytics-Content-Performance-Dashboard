"""Growth & Trend Forecasting router (Module 4).
Provides statistical linear regression forecasting for follower growth (30/60/90 days),
hashtag performance analysis, and content engagement trend analytics.
"""
import math
from datetime import date, datetime, timedelta
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, FollowerGrowth, HashtagMetric, ContentRecord, AgencyCreator
from ..schemas import Platform, HashtagMetricOut, ReachPredictionOut
from ..services import engagement_rate, resolve_range, calculate_reach_prediction

router = APIRouter(prefix="/api/trends", tags=["Growth & Trend Forecasting"])


def _calculate_linear_regression(points: list[tuple[float, float]]):
    """
    Ordinary Least Squares (OLS) Linear Regression:
    y = m * x + c
    points: list of (x, y) tuples where x is time offset (days), y is observation count.
    Returns dictionary with slope, intercept, r_squared, std_err, ss_xx, mean_x, n.
    """
    n = len(points)
    if n < 2:
        return None

    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    mean_x = sum_x / n
    mean_y = sum_y / n

    ss_xx = sum((p[0] - mean_x) ** 2 for p in points)
    ss_xy = sum((p[0] - mean_x) * (p[1] - mean_y) for p in points)
    ss_yy = sum((p[1] - mean_y) ** 2 for p in points)

    if ss_xx == 0:
        return None

    slope = ss_xy / ss_xx
    intercept = mean_y - slope * mean_x

    # Residual sum of squares
    ss_res = sum((p[1] - (slope * p[0] + intercept)) ** 2 for p in points)

    # Coefficient of determination R^2
    if ss_yy > 0:
        r_squared = max(0.0, min(1.0, 1.0 - (ss_res / ss_yy)))
    else:
        r_squared = 1.0 if ss_res == 0 else 0.0

    # Standard error of the estimate (degrees of freedom = n - 2)
    std_err = math.sqrt(max(0.0, ss_res / (n - 2))) if n > 2 else 0.0

    return {
        "slope": slope,
        "intercept": intercept,
        "r_squared": round(r_squared, 4),
        "std_err": round(std_err, 2),
        "mean_x": mean_x,
        "ss_xx": ss_xx,
        "n": n
    }


def _resolve_target_user_id(current_user: User, user_id: Optional[int], db: Session) -> int:
    """Enforce data isolation and role-based permissions:
    - Creator can only query their own data (403 if querying other users).
    - Administrator can inspect any user account or their own.
    - Agency can query their own data or any managed creator in their roster.
    - Marketing Team can query their own data or creators for campaign influencer analytics.
    """
    if user_id is not None and user_id != current_user.id:
        if current_user.role in ("admin", "administrator"):
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
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator is not in your agency roster.")
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


@router.get("/creators")
def get_forecasting_creators(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authorized accounts that the caller may select for trend forecasting.
    - Creators only receive their own account (strict isolation).
    - Agencies receive their roster creators + agency account.
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
            creators = db.query(User).filter(User.id.in_(linked_ids), User.is_active.is_(True)).all()
        else:
            creators = db.query(User).filter(User.role == "creator", User.is_active.is_(True)).all()
    else:  # admin or marketing
        creators = db.query(User).filter(User.role == "creator", User.is_active.is_(True)).all()

    for c in creators:
        if c.id != current_user.id:
            options.append({
                "id": c.id,
                "full_name": f"{c.full_name} ({c.role.title()})",
                "role": c.role,
                "email": c.email,
            })

    return options


@router.get("/growth-prediction")
def get_growth_prediction(
    platform: Optional[Platform] = None,
    days: int = Query(default=60, ge=7, le=365, description="Historical lookback window in days"),
    horizon: int = Query(default=90, ge=30, le=180, description="Forecast projection window in days"),
    user_id: Optional[int] = Query(default=None, description="Admin-only: query specific user ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Statistical follower growth prediction using Ordinary Least Squares (OLS) linear regression.
    Returns:
    - 30-day, 60-day, and 90-day projections with 95% confidence bounds.
    - Historical trend series and continuous projected forecast series.
    - Regression parameters (slope, intercept, R², standard error).
    - Clear methodology and confidence limitations statement.
    """
    target_user_id = _resolve_target_user_id(current_user, user_id, db)

    # 1. Query follower growth history
    q = db.query(FollowerGrowth).filter(FollowerGrowth.user_id == target_user_id)
    if platform:
        q = q.filter(FollowerGrowth.platform == platform)
    rows = q.order_by(FollowerGrowth.date.asc()).all()

    # Handle completely empty state
    if not rows:
        return {
            "status": "empty",
            "message": "No historical follower records found. Connect platforms or load demo data to view statistical predictions.",
            "has_demo": False,
            "data_points_count": 0,
            "current_followers": 0,
            "predictions": None,
            "metrics": None,
            "historical_series": [],
            "forecast_series": [],
            "combined_series": [],
            "methodology": "Ordinary Least Squares (OLS) Linear Regression.",
            "confidence_limitations": "Requires at least 2 historical daily snapshots."
        }

    # Aggregate by date if all platforms are selected, or use single platform
    date_map = {}
    for r in rows:
        d_key = r.date.isoformat()
        if d_key not in date_map:
            date_map[d_key] = {"date": r.date, "followers": 0, "new_followers": 0, "impressions": 0, "reach": 0}
        date_map[d_key]["followers"] += r.followers
        date_map[d_key]["new_followers"] += r.new_followers
        date_map[d_key]["impressions"] += r.impressions
        date_map[d_key]["reach"] += r.reach

    sorted_history = sorted(date_map.values(), key=lambda x: x["date"])
    has_demo = any(r.is_demo for r in rows)

    # Handle insufficient data (< 2 distinct dates)
    if len(sorted_history) < 2:
        latest = sorted_history[0]
        return {
            "status": "insufficient_data",
            "message": "At least 2 historical daily snapshots are required to compute statistical regression.",
            "has_demo": has_demo,
            "data_points_count": len(sorted_history),
            "current_followers": latest["followers"],
            "predictions": None,
            "metrics": None,
            "historical_series": [
                {"date": latest["date"].isoformat(), "actual_followers": latest["followers"], "new_followers": latest["new_followers"]}
            ],
            "forecast_series": [],
            "combined_series": [
                {"date": latest["date"].isoformat(), "actual_followers": latest["followers"]}
            ],
            "methodology": "Ordinary Least Squares (OLS) Linear Regression.",
            "confidence_limitations": "A single observation cannot establish a growth velocity or regression trend."
        }

    # Take the last `days` historical data points for regression modeling
    history_slice = sorted_history[-days:] if len(sorted_history) > days else sorted_history
    n = len(history_slice)

    # Build regression input: x = day index 0..n-1, y = follower count
    regression_points = [(float(i), float(h["followers"])) for i, h in enumerate(history_slice)]
    reg = _calculate_linear_regression(regression_points)

    if not reg:
        # Fallback if points were degenerate
        current_followers = history_slice[-1]["followers"]
        return {
            "status": "degenerate_data",
            "message": "Historical data points are identical in timestamp, preventing regression analysis.",
            "has_demo": has_demo,
            "data_points_count": n,
            "current_followers": current_followers,
            "predictions": None,
            "metrics": None,
            "historical_series": [{"date": h["date"].isoformat(), "actual_followers": h["followers"]} for h in history_slice],
            "forecast_series": [],
            "combined_series": [{"date": h["date"].isoformat(), "actual_followers": h["followers"]} for h in history_slice],
            "methodology": "Ordinary Least Squares (OLS) Linear Regression.",
            "confidence_limitations": "Zero variance in time dimension prevents slope calculation."
        }

    slope = reg["slope"]
    intercept = reg["intercept"]
    r_squared = reg["r_squared"]
    std_err = reg["std_err"]
    mean_x = reg["mean_x"]
    ss_xx = reg["ss_xx"]

    current_followers = history_slice[-1]["followers"]
    last_date = history_slice[-1]["date"]
    first_date = history_slice[0]["date"]
    historical_net_growth = current_followers - history_slice[0]["followers"]
    historical_growth_rate_pct = round((historical_net_growth / max(1, history_slice[0]["followers"])) * 100, 2)

    # Helper to calculate prediction and 95% confidence interval at future offset d (days)
    def predict_at(d: int):
        x_target = (n - 1) + d
        y_hat = max(0, round(slope * x_target + intercept))
        # 95% prediction interval standard error
        if n > 2 and ss_xx > 0:
            se_pred = std_err * math.sqrt(1.0 + (1.0 / n) + (((x_target - mean_x) ** 2) / ss_xx))
            margin = round(1.96 * se_pred)
        else:
            margin = round(std_err * 2)

        lower_bound = max(0, y_hat - margin)
        upper_bound = y_hat + margin
        net_growth = y_hat - current_followers
        pct_growth = round((net_growth / max(1, current_followers)) * 100, 2)

        return {
            "days_ahead": d,
            "target_date": (last_date + timedelta(days=d)).isoformat(),
            "predicted_followers": y_hat,
            "net_growth": net_growth,
            "growth_rate_pct": pct_growth,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "margin_of_error": margin,
        }

    predictions = {
        "day_30": predict_at(30),
        "day_60": predict_at(60),
        "day_90": predict_at(90),
    }

    # Generate multi-day forecast series up to the selected horizon
    forecast_series = []
    # Project in 3-day steps for smooth charts without excessive payload size
    step = 3 if horizon >= 60 else 1
    for d in range(1, horizon + 1, step):
        p = predict_at(d)
        forecast_series.append({
            "date": p["target_date"],
            "forecast_followers": p["predicted_followers"],
            "lower_bound": p["lower_bound"],
            "upper_bound": p["upper_bound"],
            "is_forecast": True,
        })
    # Ensure exact horizon endpoint is included
    if forecast_series and forecast_series[-1]["date"] != (last_date + timedelta(days=horizon)).isoformat():
        p_final = predict_at(horizon)
        forecast_series.append({
            "date": p_final["target_date"],
            "forecast_followers": p_final["predicted_followers"],
            "lower_bound": p_final["lower_bound"],
            "upper_bound": p_final["upper_bound"],
            "is_forecast": True,
        })

    # Prepare historical series
    historical_series = [
        {
            "date": h["date"].isoformat(),
            "actual_followers": h["followers"],
            "new_followers": h["new_followers"],
            "is_forecast": False,
        }
        for h in history_slice
    ]

    # Combined continuous series for Recharts
    combined_series = []
    for h in historical_series:
        combined_series.append({
            "date": h["date"],
            "actual_followers": h["actual_followers"],
            "new_followers": h["new_followers"],
            "is_forecast": False,
        })
    # Bridge point at last actual date so lines connect smoothly
    combined_series[-1]["forecast_followers"] = current_followers
    combined_series[-1]["lower_bound"] = current_followers
    combined_series[-1]["upper_bound"] = current_followers

    for f in forecast_series:
        combined_series.append({
            "date": f["date"],
            "forecast_followers": f["forecast_followers"],
            "lower_bound": f["lower_bound"],
            "upper_bound": f["upper_bound"],
            "is_forecast": True,
        })

    metrics = {
        "current_followers": current_followers,
        "historical_net_growth": historical_net_growth,
        "historical_growth_rate_pct": historical_growth_rate_pct,
        "daily_growth_velocity": round(slope, 1),
        "monthly_velocity": round(slope * 30, 0),
        "r_squared": r_squared,
        "confidence_score": round(r_squared * 100, 1),
        "standard_error": std_err,
        "data_points_count": n,
        "analysis_window_days": (last_date - first_date).days or 1,
    }

    return {
        "status": "success",
        "has_demo": has_demo,
        "platform": platform,
        "metrics": metrics,
        "predictions": predictions,
        "historical_series": historical_series,
        "forecast_series": forecast_series,
        "combined_series": combined_series,
        "methodology": "Ordinary Least Squares (OLS) Linear Regression modeling daily follower trajectory y = m*x + c with a 95% prediction interval band.",
        "confidence_limitations": "Projections assume consistent publishing frequency and historical baseline momentum. Actual growth may deviate due to viral posts, algorithmic updates, platform penalties, or content breaks."
    }


@router.get("/hashtags")
def get_hashtag_analytics(
    platform: Optional[str] = Query(default=None, description="Filter by social platform"),
    sort_by: str = Query(default="reach", pattern="^(reach|total_reach|avg_engagement|engagement|post_count|posts|tag)$"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=100),
    user_id: Optional[int] = Query(default=None, description="Admin-only: query specific user ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Hashtag performance analysis and ranking based on reach, average engagement rate, and post frequency.
    """
    target_user_id = _resolve_target_user_id(current_user, user_id, db)

    q = db.query(HashtagMetric).filter(HashtagMetric.user_id == target_user_id)
    if platform:
        q = q.filter(HashtagMetric.platform == platform.lower())

    # Map sort column
    sort_map = {
        "reach": HashtagMetric.total_reach,
        "total_reach": HashtagMetric.total_reach,
        "avg_engagement": HashtagMetric.avg_engagement,
        "engagement": HashtagMetric.avg_engagement,
        "post_count": HashtagMetric.post_count,
        "posts": HashtagMetric.post_count,
        "tag": HashtagMetric.tag,
    }
    col = sort_map.get(sort_by, HashtagMetric.total_reach)
    q = q.order_by(desc(col) if sort_dir == "desc" else asc(col))

    records = q.limit(limit).all()

    if not records:
        return {
            "total_count": 0,
            "has_demo": False,
            "summary": {
                "top_reach_tag": None,
                "top_engagement_tag": None,
                "avg_engagement": 0.0,
                "total_reach": 0,
                "total_posts": 0,
            },
            "hashtags": [],
        }

    total_reach = sum(h.total_reach for h in records)
    total_posts = sum(h.post_count for h in records)
    avg_eng = round(sum(h.avg_engagement for h in records) / len(records), 2)
    top_reach = max(records, key=lambda h: h.total_reach).tag
    top_eng = max(records, key=lambda h: h.avg_engagement).tag
    has_demo = any(h.is_demo for h in records)

    hashtags = [
        {
            "id": h.id,
            "rank": idx + 1,
            "tag": h.tag,
            "platform": h.platform,
            "post_count": h.post_count,
            "total_reach": h.total_reach,
            "avg_engagement": round(h.avg_engagement, 2),
            "is_demo": h.is_demo,
            "created_at": h.created_at,
        }
        for idx, h in enumerate(records)
    ]

    return {
        "total_count": len(records),
        "has_demo": has_demo,
        "summary": {
            "top_reach_tag": top_reach,
            "top_engagement_tag": top_eng,
            "avg_engagement": avg_eng,
            "total_reach": total_reach,
            "total_posts": total_posts,
        },
        "hashtags": hashtags,
    }


@router.get("/engagement")
def get_engagement_trends(
    platform: Optional[str] = Query(default=None, description="Filter by social platform"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = Query(default=90, ge=7, le=365),
    user_id: Optional[int] = Query(default=None, description="Admin-only: query specific user ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Historical content engagement trends and key growth indicators.
    Handles zero reach, missing dates, and multi-platform aggregation safely.
    """
    target_user_id = _resolve_target_user_id(current_user, user_id, db)
    start, end = resolve_range(start_date, end_date, days)

    q = db.query(ContentRecord).filter(
        ContentRecord.user_id == target_user_id,
        ContentRecord.published_at >= start,
        ContentRecord.published_at <= end,
    )
    if platform:
        q = q.filter(ContentRecord.platform == platform.lower())

    content_items = q.order_by(ContentRecord.published_at.asc()).all()

    if not content_items:
        return {
            "empty": True,
            "has_demo": False,
            "message": "No content records found for the selected time period.",
            "total_posts": 0,
            "start_date": start,
            "end_date": end,
            "timeline": [],
            "monthly_trends": [],
            "platform_comparison": [],
            "growth_indicators": {
                "overall_avg_engagement_rate": 0.0,
                "recent_engagement_rate": 0.0,
                "previous_engagement_rate": 0.0,
                "engagement_velocity_pct": 0.0,
                "total_interactions": 0,
                "total_reach": 0,
                "total_views": 0,
                "best_platform": None,
                "top_post": None,
            },
            "interaction_breakdown": {"likes": 0, "comments": 0, "shares": 0, "saves": 0},
        }

    has_demo = any(c.is_demo for c in content_items)

    # Post-by-post chronological timeline with safe engagement rates
    timeline = []
    total_likes = 0
    total_comments = 0
    total_shares = 0
    total_saves = 0
    total_reach = 0
    total_views = 0

    rates = []
    for c in content_items:
        interactions = c.likes + c.comments + c.shares + c.saves
        rate = engagement_rate(c.likes, c.comments, c.shares, c.saves, c.reach)
        rates.append(rate)

        total_likes += c.likes
        total_comments += c.comments
        total_shares += c.shares
        total_saves += c.saves
        total_reach += c.reach
        total_views += c.views

        timeline.append({
            "id": c.id,
            "title": c.title,
            "platform": c.platform,
            "date": c.published_at.isoformat(),
            "reach": c.reach,
            "views": c.views,
            "interactions": interactions,
            "engagement_rate": rate,
            "likes": c.likes,
            "comments": c.comments,
            "shares": c.shares,
            "saves": c.saves,
            "is_demo": c.is_demo,
        })

    # Group by calendar month for macro trend charts
    monthly_groups = {}
    for c in content_items:
        m_key = c.published_at.strftime("%Y-%m")
        if m_key not in monthly_groups:
            monthly_groups[m_key] = {
                "month": m_key,
                "label": c.published_at.strftime("%b %Y"),
                "post_count": 0,
                "reach": 0,
                "interactions": 0,
                "views": 0,
            }
        monthly_groups[m_key]["post_count"] += 1
        monthly_groups[m_key]["reach"] += c.reach
        monthly_groups[m_key]["interactions"] += (c.likes + c.comments + c.shares + c.saves)
        monthly_groups[m_key]["views"] += c.views

    monthly_trends = []
    for m in sorted(monthly_groups.keys()):
        item = monthly_groups[m]
        eng_rate = round((item["interactions"] / item["reach"] * 100), 2) if item["reach"] > 0 else 0.0
        monthly_trends.append({
            "month": item["month"],
            "label": item["label"],
            "post_count": item["post_count"],
            "total_reach": item["reach"],
            "total_interactions": item["interactions"],
            "total_views": item["views"],
            "avg_engagement_rate": eng_rate,
        })

    # Platform comparison
    platform_groups = {}
    for c in content_items:
        p = c.platform
        if p not in platform_groups:
            platform_groups[p] = {
                "platform": p,
                "post_count": 0,
                "reach": 0,
                "interactions": 0,
                "views": 0,
            }
        platform_groups[p]["post_count"] += 1
        platform_groups[p]["reach"] += c.reach
        platform_groups[p]["interactions"] += (c.likes + c.comments + c.shares + c.saves)
        platform_groups[p]["views"] += c.views

    platform_comparison = []
    for p, val in platform_groups.items():
        eng_rate = round((val["interactions"] / val["reach"] * 100), 2) if val["reach"] > 0 else 0.0
        platform_comparison.append({
            "platform": p,
            "post_count": val["post_count"],
            "total_reach": val["reach"],
            "total_interactions": val["interactions"],
            "total_views": val["views"],
            "avg_engagement_rate": eng_rate,
        })
    platform_comparison.sort(key=lambda x: x["avg_engagement_rate"], reverse=True)

    # Growth velocity: split into earlier half and recent half
    half = max(1, len(rates) // 2)
    prev_rates = rates[:half]
    recent_rates = rates[half:]
    prev_avg = round(sum(prev_rates) / len(prev_rates), 2) if prev_rates else 0.0
    recent_avg = round(sum(recent_rates) / len(recent_rates), 2) if recent_rates else 0.0
    velocity_pct = round(((recent_avg - prev_avg) / prev_avg) * 100, 2) if prev_avg > 0 else 0.0

    overall_avg = round(sum(rates) / len(rates), 2) if rates else 0.0

    # Top performing content post
    best_item = max(timeline, key=lambda t: (t["engagement_rate"], t["reach"])) if timeline else None
    top_post = {
        "id": best_item["id"],
        "title": best_item["title"],
        "platform": best_item["platform"],
        "engagement_rate": best_item["engagement_rate"],
        "reach": best_item["reach"],
    } if best_item else None

    return {
        "empty": False,
        "has_demo": has_demo,
        "total_posts": len(content_items),
        "start_date": start,
        "end_date": end,
        "timeline": timeline,
        "monthly_trends": monthly_trends,
        "platform_comparison": platform_comparison,
        "growth_indicators": {
            "overall_avg_engagement_rate": overall_avg,
            "recent_engagement_rate": recent_avg,
            "previous_engagement_rate": prev_avg,
            "engagement_velocity_pct": velocity_pct,
            "total_interactions": total_likes + total_comments + total_shares + total_saves,
            "total_reach": total_reach,
            "total_views": total_views,
            "best_platform": platform_comparison[0]["platform"] if platform_comparison else None,
            "top_post": top_post,
        },
        "interaction_breakdown": {
            "likes": total_likes,
            "comments": total_comments,
            "shares": total_shares,
            "saves": total_saves,
        },
    }


@router.get("/reach-prediction", response_model=ReachPredictionOut)
def get_reach_prediction(
    platform: Platform = Query(default="instagram", description="Target social platform"),
    content_type: str = Query(default="post", pattern="^(post|reel|short|video|carousel|story)$"),
    hashtags: Optional[str] = Query(default=None, description="Comma-separated or space-separated hashtags"),
    caption: Optional[str] = Query(default=None, max_length=1000, description="Planned post caption or script"),
    planned_hour: Optional[int] = Query(default=None, ge=0, le=23, description="Planned publishing hour (0-23 UTC)"),
    creator_id: Optional[int] = Query(default=None, description="Creator ID (for agency/admin view)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Predicts expected reach, reach boundaries, and engagement potential (Module 4 Reach Prediction).
    Analyzes historical creator baseline, content format velocity, hashtag multipliers, and audience active hours.
    """
    target_id = _resolve_target_user_id(current_user, creator_id, db)
    return calculate_reach_prediction(
        db=db,
        user_id=target_id,
        platform=platform,
        content_type=content_type,
        hashtags=hashtags,
        caption=caption,
        planned_hour=planned_hour,
    )

