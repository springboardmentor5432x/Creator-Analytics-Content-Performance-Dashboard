from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import User, Campaign, Activity, AudienceMetric
from ..schemas import CampaignIn, CampaignOut, CampaignUpdate
from ..services import campaign_to_dict, log

router = APIRouter(prefix="/api/marketing", tags=["Marketing"])


@router.get("/overview")
def marketing_overview(user: User = Depends(require_roles("marketing", "admin")), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(
        (Campaign.user_id == user.id) | (Campaign.is_demo.is_(True))
    ).order_by(Campaign.created_at.desc()).all()

    active = [c for c in campaigns if c.status == "active"]
    completed = [c for c in campaigns if c.status == "completed"]
    planning = [c for c in campaigns if c.status == "planning"]

    total_reach = sum(c.actual_reach for c in campaigns)
    target_reach = sum(c.target_reach for c in campaigns)
    total_budget = sum(c.budget for c in campaigns)
    total_spent = sum(c.spent for c in campaigns)
    total_engagement = sum(c.actual_engagement for c in campaigns)

    reach_completion_pct = round((total_reach / target_reach * 100), 1) if target_reach > 0 else 0.0
    budget_utilization_pct = round((total_spent / total_budget * 100), 1) if total_budget > 0 else 0.0

    # Top performing campaigns by actual reach or ROI
    top_campaigns = sorted(campaigns, key=lambda c: (c.actual_reach, c.actual_engagement), reverse=True)[:5]

    # Platform distribution of campaigns
    plat_map = {}
    for c in campaigns:
        p = c.platform
        d = plat_map.setdefault(p, {"platform": p, "count": 0, "reach": 0, "budget": 0.0})
        d["count"] += 1
        d["reach"] += c.actual_reach
        d["budget"] += c.budget

    # Audience demographics preview (average across audience metrics)
    aud_rows = db.query(AudienceMetric).all()
    age_dist = {}
    geo_dist = {}
    for a in aud_rows:
        if a.age_distribution:
            for k, v in a.age_distribution.items():
                age_dist[k] = age_dist.get(k, 0) + v
        if a.geo_distribution:
            for k, v in a.geo_distribution.items():
                geo_dist[k] = geo_dist.get(k, 0) + v

    num_aud = max(1, len(aud_rows))
    top_ages = [{"name": k, "value": round(v / num_aud, 1)} for k, v in sorted(age_dist.items())]
    top_geos = [{"name": k, "value": round(v / num_aud, 1)} for k, v in sorted(geo_dist.items(), key=lambda x: x[1], reverse=True)[:5]]

    # Activities
    acts = db.query(Activity).filter(
        (Activity.user_id == user.id) | (Activity.action.like("campaign%"))
    ).order_by(Activity.created_at.desc()).limit(8).all()

    has_demo = any(c.is_demo for c in campaigns)

    return {
        "user_name": user.full_name,
        "has_demo": has_demo,
        "cards": {
            "total_campaigns": len(campaigns),
            "active_campaigns": len(active),
            "completed_campaigns": len(completed),
            "planning_campaigns": len(planning),
            "total_reach": total_reach,
            "target_reach": target_reach,
            "reach_completion_pct": reach_completion_pct,
            "total_engagement": total_engagement,
            "total_budget": total_budget,
            "total_spent": total_spent,
            "budget_utilization_pct": budget_utilization_pct,
        },
        "top_campaigns": [campaign_to_dict(c) for c in top_campaigns],
        "campaigns_list": [campaign_to_dict(c) for c in campaigns],
        "platforms": list(plat_map.values()),
        "audience_demographics": {
            "age": top_ages,
            "geo": top_geos,
        },
        "recent_activities": [
            {"id": a.id, "action": a.action, "detail": a.detail, "created_at": a.created_at}
            for a in acts
        ],
    }


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(status: Optional[str] = None, user: User = Depends(require_roles("marketing", "admin")), db: Session = Depends(get_db)):
    q = db.query(Campaign).filter((Campaign.user_id == user.id) | (Campaign.is_demo.is_(True)))
    if status:
        q = q.filter(Campaign.status == status)
    campaigns = q.order_by(Campaign.created_at.desc()).all()
    return [campaign_to_dict(c) for c in campaigns]


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(body: CampaignIn, user: User = Depends(require_roles("marketing", "admin")), db: Session = Depends(get_db)):
    c = Campaign(user_id=user.id, **body.model_dump(), is_demo=False)
    db.add(c)
    log(db, user.id, "campaign_create", f"Marketing created campaign “{c.title}” for {c.client_name}")
    db.commit()
    db.refresh(c)
    return campaign_to_dict(c)


@router.put("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, body: CampaignUpdate, user: User = Depends(require_roles("marketing", "admin")), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or (c.user_id != user.id and user.role not in ("admin", "administrator")):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found.")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.is_demo = False
    log(db, user.id, "campaign_update", f"Marketing updated campaign “{c.title}”")
    db.commit()
    db.refresh(c)
    return campaign_to_dict(c)


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, user: User = Depends(require_roles("marketing", "admin")), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or (c.user_id != user.id and user.role not in ("admin", "administrator")):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found.")
    log(db, user.id, "campaign_delete", f"Marketing removed campaign “{c.title}”")
    db.delete(c)
    db.commit()
    return {"message": "Campaign deleted successfully."}
