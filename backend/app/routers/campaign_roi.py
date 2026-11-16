"""
CreatorIQ — Campaign ROI & Performance Router (Phase 7.3).

Provides authenticated REST APIs for:
1. Multi-campaign ROI overview (GET /api/campaigns/roi/summary)
2. Single-campaign ROI summary (GET /api/campaigns/{campaign_id}/roi)
3. Campaign performance milestones (GET, POST /api/campaigns/{campaign_id}/performance)
4. Milestone detail, update, archive (GET, PUT, DELETE /api/campaigns/{campaign_id}/performance/{performance_id})
5. Creator-level campaign performance breakdown (GET /api/campaigns/{campaign_id}/creators/performance)
6. Financial cost and revenue breakdown (GET /api/campaigns/{campaign_id}/breakdown)

RBAC & Tenant Isolation:
- Enforced across Creator, Agency, Marketing Team, and Administrator roles.
- Creators can only inspect their own metrics and compensation; other creators' financial data is shielded.
- Unlinked external revenue records are excluded to prevent cross-campaign attribution contamination.
- Duplicate reporting prevention with HTTP 409 Conflict.
- Safe zero-denominator handling returning null (None) instead of runtime division errors.
"""

from typing import Optional, List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    User, Campaign, Brand, CampaignCreator, Sponsorship,
    CampaignPerformance, AgencyCreator
)
from ..schemas import (
    CampaignPerformanceIn, CampaignPerformanceUpdate, CampaignPerformanceOut,
    CampaignPerformanceListOut, CampaignROISummaryOut, CreatorPerformanceOut,
    CreatorPerformanceListOut, MultiCampaignROISummaryOut, CampaignCostBreakdownOut,
    CampaignRevenueAttributionOut, CampaignCoreMetricsOut, CampaignTotalsOut,
    CreatorCostItem, SponsorshipCostItem
)
from ..services import log, campaign_performance_to_dict, resolve_range
from ..roi_engine import (
    to_decimal, calculate_roi, calculate_roas, calculate_cpm, calculate_cpe,
    calculate_ctr, calculate_conversion_rate, calculate_engagement_rate,
    compute_campaign_cost, compute_attributed_revenue, aggregate_campaign_metrics
)

router = APIRouter(prefix="/api/campaigns", tags=["Campaign ROI & Performance"])


def _check_campaign_access(db: Session, campaign_id: int, user: User) -> Campaign:
    """
    Validates tenant isolation and returns campaign if authorized, else raises 404.
    """
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    if user.role in ("admin", "administrator"):
        return campaign
    if campaign.user_id == user.id:
        return campaign
    if campaign.is_demo and user.role == "marketing":
        return campaign

    if user.role == "agency":
        roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == user.id).all()]
        if roster_cids:
            assigned = db.query(CampaignCreator).filter(
                CampaignCreator.campaign_id == campaign_id,
                CampaignCreator.creator_id.in_(roster_cids)
            ).first()
            if assigned:
                return campaign

    if user.role == "creator":
        assigned = db.query(CampaignCreator).filter(
            CampaignCreator.campaign_id == campaign_id,
            CampaignCreator.creator_id == user.id
        ).first()
        if assigned:
            return campaign

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")


def _can_manage_performance(db: Session, campaign: Campaign, user: User) -> bool:
    """Verifies whether the user is authorized to create/edit performance milestones."""
    if user.role in ("admin", "administrator"):
        return True
    if campaign.user_id == user.id:
        return True
    if user.role == "agency":
        return True
    return False


def _build_campaign_roi_summary(
    db: Session,
    campaign: Campaign,
    user: User,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    cost_mode: str = "authoritative",
    include_archived: bool = False
) -> CampaignROISummaryOut:
    """Internal helper to construct a CampaignROISummaryOut object."""
    # 1. Fetch creators & sponsorships
    creators = db.query(CampaignCreator).filter(CampaignCreator.campaign_id == campaign.id).all()
    sponsorships = db.query(Sponsorship).filter(Sponsorship.campaign_id == campaign.id).all()

    cost_info = compute_campaign_cost(
        campaign=campaign,
        creators=creators,
        sponsorships=sponsorships,
        cost_mode=cost_mode,
        include_archived=include_archived
    )

    # 2. Fetch performance records (with optional date filtering)
    perf_q = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign.id)
    if not include_archived:
        perf_q = perf_q.filter(CampaignPerformance.is_archived.is_(False))

    if days or start_date or end_date:
        s_date, e_date = resolve_range(start_date, end_date, days)
        perf_q = perf_q.filter(CampaignPerformance.reporting_date >= s_date, CampaignPerformance.reporting_date <= e_date)

    performances = perf_q.order_by(CampaignPerformance.reporting_date.asc()).all()

    # 3. Revenue attribution & metrics
    rev_info = compute_attributed_revenue(performances=performances, include_archived=include_archived)
    metrics_info = aggregate_campaign_metrics(performances=performances, cost_info=cost_info, revenue_info=rev_info)

    brand = db.get(Brand, campaign.brand_id) if getattr(campaign, "brand_id", None) else None

    # Privacy masking: If viewer is a creator, mask other creators' agreed compensations
    creator_items = cost_info.get("creator_items", [])
    sponsorship_items = cost_info.get("sponsorship_items", [])
    if user.role == "creator" and campaign.user_id != user.id:
        creator_items = [
            item if item["creator_id"] == user.id
            else {**item, "agreed_compensation": 0.0, "status": "masked"}
            for item in creator_items
        ]
        sponsorship_items = [
            item if item["creator_id"] == user.id
            else {**item, "amount": 0.0, "payment_status": "masked"}
            for item in sponsorship_items
        ]

    cost_out = CampaignCostBreakdownOut(
        direct_spend=cost_info["direct_spend"],
        creator_compensation_total=cost_info["creator_compensation_total"],
        sponsorship_total=cost_info["sponsorship_total"],
        deduplicated_talent_total=cost_info["deduplicated_talent_total"],
        total_campaign_cost=cost_info["total_campaign_cost"],
        budget=cost_info["budget"],
        budget_utilization_pct=cost_info["budget_utilization_pct"],
        cost_rule_applied=cost_info["cost_rule_applied"],
        has_cost_ambiguity=cost_info.get("has_cost_ambiguity", False),
        cost_ambiguity_note=cost_info.get("cost_ambiguity_note"),
        active_creators_count=cost_info["active_creators_count"],
        active_sponsorships_count=cost_info["active_sponsorships_count"],
        creator_items=[CreatorCostItem(**ci) for ci in creator_items],
        sponsorship_items=[SponsorshipCostItem(**si) for si in sponsorship_items]
    )

    rev_out = CampaignRevenueAttributionOut(
        attributed_revenue=rev_info["attributed_revenue"],
        attribution_status=rev_info["attribution_status"],
        revenue_by_source=rev_info["revenue_by_source"],
        attribution_sources_count=rev_info["attribution_sources_count"],
        has_demo_data=rev_info["has_demo_data"],
        limitations=rev_info["limitations"]
    )

    metrics_out = CampaignCoreMetricsOut(**metrics_info["metrics"])
    totals_out = CampaignTotalsOut(**metrics_info["totals"])

    return CampaignROISummaryOut(
        campaign_id=campaign.id,
        title=campaign.title,
        client_name=campaign.client_name,
        status=campaign.status,
        platform=campaign.platform,
        is_demo=campaign.is_demo,
        brand_id=campaign.brand_id,
        brand_name=brand.name if brand else None,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        cost=cost_out,
        revenue=rev_out,
        metrics=metrics_out,
        totals=totals_out
    )


# -----------------------------------------------------------------------------
# 1. Multi-Campaign ROI Overview (Static Path First)
# -----------------------------------------------------------------------------

@router.get("/roi/summary", response_model=MultiCampaignROISummaryOut)
def get_multi_campaign_roi_summary(
    include_demo: bool = False,
    status_filter: Optional[str] = Query(None, alias="status"),
    platform: Optional[str] = None,
    cost_mode: str = Query("authoritative", pattern="^(authoritative|inclusive|additive|direct_only|talent_only)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns consolidated multi-campaign ROI, total cost, and attributed revenue
    across all campaigns accessible to the authenticated tenant.
    """
    q = db.query(Campaign)

    # Tenant restrictions
    if current_user.role in ("admin", "administrator"):
        pass
    elif current_user.role == "marketing":
        if include_demo:
            q = q.filter((Campaign.user_id == current_user.id) | (Campaign.is_demo.is_(True)))
        else:
            q = q.filter(Campaign.user_id == current_user.id)
    elif current_user.role == "agency":
        roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()]
        assigned_camp_ids = [
            c[0] for c in db.query(CampaignCreator.campaign_id).filter(CampaignCreator.creator_id.in_(roster_cids)).all()
        ]
        q = q.filter(or_(Campaign.user_id == current_user.id, Campaign.id.in_(assigned_camp_ids)))
    elif current_user.role == "creator":
        assigned_camp_ids = [
            c[0] for c in db.query(CampaignCreator.campaign_id).filter(CampaignCreator.creator_id == current_user.id).all()
        ]
        q = q.filter(or_(Campaign.user_id == current_user.id, Campaign.id.in_(assigned_camp_ids)))

    if not include_demo:
        q = q.filter(Campaign.is_demo.is_(False))

    if status_filter:
        q = q.filter(Campaign.status == status_filter)
    if platform and platform != "all":
        q = q.filter(Campaign.platform == platform)

    campaigns = q.order_by(Campaign.created_at.desc()).all()

    summaries = [
        _build_campaign_roi_summary(db=db, campaign=c, user=current_user, cost_mode=cost_mode, include_archived=False)
        for c in campaigns
    ]

    total_budget = sum(s.cost.budget for s in summaries)
    valid_costs = [s.cost.total_campaign_cost for s in summaries if s.cost.total_campaign_cost is not None]
    total_cost = sum(valid_costs) if valid_costs else 0.0
    total_revenue = sum(s.revenue.attributed_revenue or 0.0 for s in summaries)
    total_impressions = sum(s.totals.impressions for s in summaries)
    total_engagements = sum(s.totals.engagements for s in summaries)

    overall_roi_pct = calculate_roi(to_decimal(total_revenue), to_decimal(total_cost)) if valid_costs else None
    overall_roas = calculate_roas(to_decimal(total_revenue), to_decimal(total_cost)) if valid_costs else None
    overall_cpm = calculate_cpm(to_decimal(total_cost), total_impressions) if valid_costs else None
    overall_cpe = calculate_cpe(to_decimal(total_cost), total_engagements) if valid_costs else None

    has_demo = any(c.is_demo for c in campaigns)

    return MultiCampaignROISummaryOut(
        total_campaigns=len(summaries),
        total_budget=round(total_budget, 2),
        total_cost=round(total_cost, 2) if valid_costs else None,
        total_attributed_revenue=round(total_revenue, 2),
        overall_roi_pct=overall_roi_pct,
        overall_roas=overall_roas,
        total_impressions=total_impressions,
        total_engagements=total_engagements,
        overall_cpm=overall_cpm,
        overall_cpe=overall_cpe,
        has_demo=has_demo,
        campaigns=summaries
    )


# -----------------------------------------------------------------------------
# 2. Single Campaign ROI Summary
# -----------------------------------------------------------------------------

@router.get("/{campaign_id}/roi", response_model=CampaignROISummaryOut)
def get_campaign_roi_summary(
    campaign_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    cost_mode: str = Query("authoritative", pattern="^(authoritative|inclusive|additive|direct_only|talent_only)$"),
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns authoritative Campaign ROI, ROAS, CPM, CPE, CTR, and Conversion Rate.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)
    return _build_campaign_roi_summary(
        db=db,
        campaign=campaign,
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        days=days,
        cost_mode=cost_mode,
        include_archived=include_archived
    )


# -----------------------------------------------------------------------------
# 3. Campaign Performance Milestones (List & Create)
# -----------------------------------------------------------------------------

@router.get("/{campaign_id}/performance", response_model=CampaignPerformanceListOut)
def list_campaign_performances(
    campaign_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    creator_id: Optional[int] = None,
    data_source: Optional[str] = None,
    include_archived: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists periodic performance milestones for a campaign with date-range and creator filtering.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)

    q = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign_id)

    if not include_archived:
        q = q.filter(CampaignPerformance.is_archived.is_(False))

    # Creator role can only view their own milestones
    if current_user.role == "creator" and campaign.user_id != current_user.id:
        q = q.filter(CampaignPerformance.creator_id == current_user.id)
    elif creator_id:
        q = q.filter(CampaignPerformance.creator_id == creator_id)

    if data_source:
        q = q.filter(CampaignPerformance.data_source == data_source)

    if days or start_date or end_date:
        s_date, e_date = resolve_range(start_date, end_date, days)
        q = q.filter(CampaignPerformance.reporting_date >= s_date, CampaignPerformance.reporting_date <= e_date)

    total = q.count()
    records = q.order_by(CampaignPerformance.reporting_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

    # Aggregate KPIs across the query
    all_filtered = q.all()
    t_imp = sum(r.impressions for r in all_filtered)
    t_reach = sum(r.reach for r in all_filtered)
    t_eng = sum(r.engagements for r in all_filtered)
    t_clicks = sum(r.clicks for r in all_filtered)
    t_conv = sum(r.conversions for r in all_filtered)
    t_rev = sum(r.revenue for r in all_filtered)

    items = [campaign_performance_to_dict(r) for r in records]

    return {
        "items": items,
        "total": total,
        "total_impressions": t_imp,
        "total_reach": t_reach,
        "total_engagements": t_eng,
        "total_clicks": t_clicks,
        "total_conversions": t_conv,
        "total_revenue": round(t_rev, 2),
        "overall_engagement_rate": calculate_engagement_rate(t_eng, t_reach),
        "overall_click_through_rate": calculate_ctr(t_clicks, t_imp),
        "overall_conversion_rate": calculate_conversion_rate(t_conv, t_clicks)
    }


@router.post("/{campaign_id}/performance", response_model=CampaignPerformanceOut, status_code=status.HTTP_201_CREATED)
def record_campaign_performance(
    campaign_id: int,
    body: CampaignPerformanceIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records a periodic performance and attributed revenue milestone.
    Prevents duplicate reporting for the same (campaign, creator, date) with 409 Conflict.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)
    if not _can_manage_performance(db, campaign, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to record performance milestones for this campaign."
        )

    if body.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mismatched campaign_id in path and request body."
        )

    # Validate creator if specified
    if body.creator_id:
        creator = db.get(User, body.creator_id)
        if not creator:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned creator user not found.")

    # Duplicate Prevention Check
    existing_query = db.query(CampaignPerformance).filter(
        CampaignPerformance.campaign_id == campaign_id,
        CampaignPerformance.reporting_date == body.reporting_date,
        CampaignPerformance.is_archived.is_(False)
    )
    if body.creator_id:
        existing_query = existing_query.filter(CampaignPerformance.creator_id == body.creator_id)
    else:
        existing_query = existing_query.filter(CampaignPerformance.creator_id.is_(None))

    existing = existing_query.first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A performance milestone for this campaign on {body.reporting_date} already exists."
        )

    perf = CampaignPerformance(
        campaign_id=campaign_id,
        creator_id=body.creator_id,
        impressions=body.impressions,
        reach=body.reach,
        engagements=body.engagements,
        clicks=body.clicks,
        conversions=body.conversions,
        revenue=round(float(body.revenue), 2),
        reporting_date=body.reporting_date,
        data_source=body.data_source,
        is_demo=campaign.is_demo,
        is_archived=False
    )
    db.add(perf)
    log(db, current_user.id, "campaign_performance_record", f"Logged performance for campaign '{campaign.title}' on {body.reporting_date}")
    db.commit()
    db.refresh(perf)
    return campaign_performance_to_dict(perf)


# -----------------------------------------------------------------------------
# 4. Milestone Detail, Update, and Archive
# -----------------------------------------------------------------------------

@router.get("/{campaign_id}/performance/{performance_id}", response_model=CampaignPerformanceOut)
def get_campaign_performance(
    campaign_id: int,
    performance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = _check_campaign_access(db, campaign_id, current_user)
    perf = db.get(CampaignPerformance, performance_id)
    if not perf or perf.campaign_id != campaign_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance record not found.")

    if current_user.role == "creator" and campaign.user_id != current_user.id and perf.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance record not found.")

    return campaign_performance_to_dict(perf)


@router.put("/{campaign_id}/performance/{performance_id}", response_model=CampaignPerformanceOut)
def update_campaign_performance(
    campaign_id: int,
    performance_id: int,
    body: CampaignPerformanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    campaign = _check_campaign_access(db, campaign_id, current_user)
    if not _can_manage_performance(db, campaign, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit performance records.")

    perf = db.get(CampaignPerformance, performance_id)
    if not perf or perf.campaign_id != campaign_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance record not found.")

    update_data = body.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "revenue" and val is not None:
            val = round(float(val), 2)
        setattr(perf, field, val)

    log(db, current_user.id, "campaign_performance_update", f"Updated milestone #{perf.id} for campaign '{campaign.title}'")
    db.commit()
    db.refresh(perf)
    return campaign_performance_to_dict(perf)


@router.delete("/{campaign_id}/performance/{performance_id}", status_code=status.HTTP_200_OK)
def delete_campaign_performance(
    campaign_id: int,
    performance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Soft-archives a performance record to preserve historical reporting audit logs.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)
    if not _can_manage_performance(db, campaign, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to archive performance records.")

    perf = db.get(CampaignPerformance, performance_id)
    if not perf or perf.campaign_id != campaign_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Performance record not found.")

    perf.is_archived = True
    log(db, current_user.id, "campaign_performance_archive", f"Archived milestone #{perf.id} for campaign '{campaign.title}'")
    db.commit()
    return {"success": True, "message": "Performance milestone archived successfully."}


# -----------------------------------------------------------------------------
# 5. Creator-Level Campaign Performance Breakdown
# -----------------------------------------------------------------------------

@router.get("/{campaign_id}/creators/performance", response_model=CreatorPerformanceListOut)
def get_creator_campaign_performance(
    campaign_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns granular performance and efficiency metrics broken down by creator.
    Creators can only view their own performance metrics and compensation.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)

    cq = db.query(CampaignCreator).filter(CampaignCreator.campaign_id == campaign_id)
    if not include_archived:
        cq = cq.filter(CampaignCreator.is_archived.is_(False))

    # Tenant restrictions: Creators only see themselves
    if current_user.role == "creator" and campaign.user_id != current_user.id:
        cq = cq.filter(CampaignCreator.creator_id == current_user.id)
    elif current_user.role == "agency" and campaign.user_id != current_user.id:
        roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()]
        cq = cq.filter(CampaignCreator.creator_id.in_(roster_cids))

    assignments = cq.all()

    # Pre-fetch performances
    perf_q = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign_id)
    if not include_archived:
        perf_q = perf_q.filter(CampaignPerformance.is_archived.is_(False))

    if days or start_date or end_date:
        s_date, e_date = resolve_range(start_date, end_date, days)
        perf_q = perf_q.filter(CampaignPerformance.reporting_date >= s_date, CampaignPerformance.reporting_date <= e_date)

    all_perfs = perf_q.all()

    items = []
    for a in assignments:
        creator_user = getattr(a, "creator", None)
        c_perfs = [p for p in all_perfs if p.creator_id == a.creator_id]

        c_imp = sum(p.impressions for p in c_perfs)
        c_reach = sum(p.reach for p in c_perfs)
        c_eng = sum(p.engagements for p in c_perfs)
        c_clicks = sum(p.clicks for p in c_perfs)
        c_conv = sum(p.conversions for p in c_perfs)
        c_rev = sum(p.revenue for p in c_perfs) if c_perfs else None

        cost_dec = to_decimal(a.agreed_compensation)
        rev_dec = to_decimal(c_rev) if c_rev is not None else None

        roi_pct = calculate_roi(rev_dec, cost_dec)
        roas = calculate_roas(rev_dec, cost_dec)
        cpm = calculate_cpm(cost_dec, c_imp)
        cpe = calculate_cpe(cost_dec, c_eng)
        ctr = calculate_ctr(c_clicks, c_imp)
        conv_rate = calculate_conversion_rate(c_conv, c_clicks)

        items.append(CreatorPerformanceOut(
            creator_id=a.creator_id,
            creator_name=creator_user.full_name if creator_user else f"Creator #{a.creator_id}",
            creator_email=creator_user.email if creator_user else None,
            agreed_compensation=a.agreed_compensation,
            status=a.status,
            deliverables=a.deliverables,
            impressions=c_imp,
            reach=c_reach,
            engagements=c_eng,
            clicks=c_clicks,
            conversions=c_conv,
            attributed_revenue=c_rev,
            cpm=cpm,
            cpe=cpe,
            ctr=ctr,
            conversion_rate=conv_rate,
            roi_pct=roi_pct,
            roas=roas
        ))

    return CreatorPerformanceListOut(
        campaign_id=campaign.id,
        campaign_title=campaign.title,
        items=items,
        total=len(items)
    )


# -----------------------------------------------------------------------------
# 6. Detailed Campaign Cost and Revenue Breakdown
# -----------------------------------------------------------------------------

@router.get("/{campaign_id}/breakdown")
def get_campaign_breakdown(
    campaign_id: int,
    cost_mode: str = Query("authoritative", pattern="^(authoritative|inclusive|additive|direct_only|talent_only)$"),
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns complete transparent breakdown of direct spend, talent liabilities,
    sponsorship commitments, revenue sources, and attribution disclaimers.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)
    summary = _build_campaign_roi_summary(
        db=db,
        campaign=campaign,
        user=current_user,
        cost_mode=cost_mode,
        include_archived=include_archived
    )

    return {
        "campaign_id": campaign.id,
        "title": campaign.title,
        "status": campaign.status,
        "client_name": campaign.client_name,
        "cost_breakdown": summary.cost.model_dump(),
        "revenue_attribution": summary.revenue.model_dump(),
        "metrics": summary.metrics.model_dump(),
        "totals": summary.totals.model_dump(),
        "cost_calculation_rule": summary.cost.cost_rule_applied,
        "revenue_attribution_policy": "Strict zero-cross-contamination: only CampaignPerformance records linked to this campaign ID are attributed."
    }

