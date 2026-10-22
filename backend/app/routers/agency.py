from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import User, ContentRecord, FollowerGrowth, Activity, Campaign, AgencyCreator
from ..schemas import CampaignIn, CampaignOut, CampaignUpdate, AgencyCreatorLinkIn
from ..services import campaign_to_dict, engagement_rate, log, resolve_range

router = APIRouter(prefix="/api/agency", tags=["Agency"])


def _get_agency_creators(db: Session, agency_id: int):
    # Check if this agency has specific links
    linked_ids = [r.creator_id for r in db.query(AgencyCreator).filter(AgencyCreator.agency_id == agency_id).all()]
    if linked_ids:
        return db.query(User).filter(User.id.in_(linked_ids), User.is_active.is_(True)).all()
    # Otherwise return all creators on the platform for comprehensive management
    return db.query(User).filter(User.role == "creator", User.is_active.is_(True)).all()


@router.get("/overview")
def agency_overview(days: int = 30, user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    start, end = resolve_range(None, None, days)
    creators = _get_agency_creators(db, user.id)
    creator_ids = [c.id for c in creators]

    posts = db.query(ContentRecord).filter(
        ContentRecord.user_id.in_(creator_ids),
        ContentRecord.published_at >= start,
        ContentRecord.published_at <= end
    ).all() if creator_ids else []

    # Follower counts per creator
    latest_followers = {}
    for cid in creator_ids:
        growth = db.query(FollowerGrowth).filter(
            FollowerGrowth.user_id == cid
        ).order_by(FollowerGrowth.date.desc()).all()
        # Max/latest per platform for this creator
        plat_f = {}
        for g in growth:
            if g.platform not in plat_f:
                plat_f[g.platform] = g.followers
        latest_followers[cid] = sum(plat_f.values())

    # Build creator ranking & statistics
    creator_stats = []
    for c in creators:
        c_posts = [p for p in posts if p.user_id == c.id]
        c_views = sum(p.views for p in c_posts)
        c_eng = sum(p.likes + p.comments + p.shares + p.saves for p in c_posts)
        c_reach = sum(p.reach for p in c_posts)
        c_rate = engagement_rate(
            sum(p.likes for p in c_posts),
            sum(p.comments for p in c_posts),
            sum(p.shares for p in c_posts),
            sum(p.saves for p in c_posts),
            c_reach
        )
        # Primary platform
        plat_counts = {}
        for p in c_posts:
            plat_counts[p.platform] = plat_counts.get(p.platform, 0) + 1
        primary_platform = max(plat_counts, key=plat_counts.get) if plat_counts else "youtube"

        creator_stats.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "bio": c.bio,
            "primary_platform": primary_platform,
            "posts_count": len(c_posts),
            "views": c_views,
            "engagement": c_eng,
            "engagement_rate": c_rate,
            "followers": latest_followers.get(c.id, 0),
            "status": "Active" if c.is_active else "Inactive",
        })

    # Sort creators by engagement rate descending, then views
    ranked_creators = sorted(creator_stats, key=lambda x: (x["engagement_rate"], x["views"]), reverse=True)

    # Combined platform metrics
    platform_data = {}
    for p in posts:
        d = platform_data.setdefault(p.platform, {"platform": p.platform, "posts": 0, "views": 0, "engagement": 0})
        d["posts"] += 1
        d["views"] += p.views
        d["engagement"] += p.likes + p.comments + p.shares + p.saves

    # Campaigns
    campaigns = db.query(Campaign).filter(
        (Campaign.user_id == user.id) | (Campaign.is_demo.is_(True))
    ).order_by(Campaign.created_at.desc()).all()
    active_campaigns = [c for c in campaigns if c.status == "active"]

    total_views = sum(p.views for p in posts)
    total_eng = sum(p.likes + p.comments + p.shares + p.saves for p in posts)
    total_reach = sum(p.reach for p in posts)
    avg_eng_rate = engagement_rate(
        sum(p.likes for p in posts),
        sum(p.comments for p in posts),
        sum(p.shares for p in posts),
        sum(p.saves for p in posts),
        total_reach
    )

    # Activities
    act_ids = [user.id] + creator_ids
    acts = db.query(Activity).filter(Activity.user_id.in_(act_ids)).order_by(Activity.created_at.desc()).limit(10).all()

    has_demo = any(p.is_demo for p in posts) or any(c.is_demo for c in campaigns)

    return {
        "agency_name": user.full_name,
        "days": days,
        "has_demo": has_demo,
        "cards": {
            "total_creators": len(creators),
            "active_campaigns": len(active_campaigns),
            "total_content": len(posts),
            "combined_views": total_views,
            "combined_reach": total_reach,
            "combined_engagement": total_eng,
            "average_engagement_rate": avg_eng_rate,
        },
        "top_creators": ranked_creators[:4],
        "creators_ranking": ranked_creators,
        "platforms": sorted(platform_data.values(), key=lambda x: x["views"], reverse=True),
        "campaigns": [campaign_to_dict(c) for c in campaigns[:6]],
        "recent_activities": [
            {"id": a.id, "user_id": a.user_id, "action": a.action, "detail": a.detail, "created_at": a.created_at}
            for a in acts
        ],
    }


@router.get("/creators")
def list_creators(user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    creators = _get_agency_creators(db, user.id)
    cids = [c.id for c in creators]
    posts = db.query(ContentRecord).filter(ContentRecord.user_id.in_(cids)).all() if cids else []
    
    res = []
    for c in creators:
        c_posts = [p for p in posts if p.user_id == c.id]
        views = sum(p.views for p in c_posts)
        eng = sum(p.likes + p.comments + p.shares + p.saves for p in c_posts)
        reach = sum(p.reach for p in c_posts)
        res.append({
            "id": c.id,
            "full_name": c.full_name,
            "email": c.email,
            "bio": c.bio,
            "posts_count": len(c_posts),
            "views": views,
            "engagement": eng,
            "engagement_rate": engagement_rate(
                sum(p.likes for p in c_posts),
                sum(p.comments for p in c_posts),
                sum(p.shares for p in c_posts),
                sum(p.saves for p in c_posts),
                reach
            ),
            "is_active": c.is_active,
            "created_at": c.created_at,
        })
    return res


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(status: Optional[str] = None, user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    q = db.query(Campaign).filter((Campaign.user_id == user.id) | (Campaign.is_demo.is_(True)))
    if status:
        q = q.filter(Campaign.status == status)
    campaigns = q.order_by(Campaign.created_at.desc()).all()
    return [campaign_to_dict(c) for c in campaigns]


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(body: CampaignIn, user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    c = Campaign(user_id=user.id, **body.model_dump(), is_demo=False)
    db.add(c)
    log(db, user.id, "campaign_create", f"Agency launched campaign “{c.title}” for {c.client_name}")
    db.commit()
    db.refresh(c)
    return campaign_to_dict(c)


@router.put("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, body: CampaignUpdate, user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or (c.user_id != user.id and user.role not in ("admin", "administrator")):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found.")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.is_demo = False
    log(db, user.id, "campaign_update", f"Updated campaign “{c.title}”")
    db.commit()
    db.refresh(c)
    return campaign_to_dict(c)


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, user: User = Depends(require_roles("agency", "admin")), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if not c or (c.user_id != user.id and user.role not in ("admin", "administrator")):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found.")
    log(db, user.id, "campaign_delete", f"Deleted campaign “{c.title}”")
    db.delete(c)
    db.commit()
    return {"message": "Campaign deleted successfully."}
