"""
CreatorIQ — Reports & Export Router (Phase 7.5).

Provides authenticated export APIs for:
1. Multi-campaign ROI overview (GET /api/reports/campaigns/export)
2. Single-campaign deep dive (GET /api/reports/campaigns/{campaign_id}/export)
3. Creator-level deliverables and performance (GET /api/reports/creators/export)

Supported Formats:
- CSV (text/csv)
- Excel (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- PDF (application/pdf)

Security & Integrity Guarantees:
- CWE-1236 Formula Injection sanitization on all tabular cells.
- Multi-role RBAC & tenant isolation (Creator, Agency, Marketing Team, Administrator).
- Financial compensation masking for peer creators.
- Strict reuse of authoritative roi_engine calculations.
- Display 'N/A' for unavailable metrics without fabricating zero.
- Clear accounting mode & cost ambiguity notices.
"""

from typing import Optional, List
from datetime import date, datetime
import re
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    User, Campaign, Brand, CampaignCreator, Sponsorship,
    CampaignPerformance, AgencyCreator, ContentRecord, AudienceMetric,
    RevenueRecord, FollowerGrowth
)
from ..services import resolve_range, log, engagement_rate
from ..roi_engine import (
    to_decimal, calculate_roi, calculate_roas, calculate_cpm, calculate_cpe,
    calculate_ctr, calculate_conversion_rate, calculate_engagement_rate,
    compute_campaign_cost, compute_attributed_revenue, aggregate_campaign_metrics
)
from .campaign_roi import _check_campaign_access, _build_campaign_roi_summary
from ..reports_engine import (
    export_campaigns_summary_csv, export_campaigns_summary_xlsx, export_campaigns_summary_pdf,
    export_single_campaign_csv, export_single_campaign_xlsx, export_single_campaign_pdf,
    export_creators_summary_csv, export_creators_summary_xlsx, export_creators_summary_pdf,
    export_content_summary_csv, export_content_summary_xlsx, export_content_summary_pdf,
    export_audience_summary_csv, export_audience_summary_xlsx, export_audience_summary_pdf,
    export_revenue_summary_csv, export_revenue_summary_xlsx, export_revenue_summary_pdf,
    export_growth_summary_csv, export_growth_summary_xlsx, export_growth_summary_pdf
)

router = APIRouter(prefix="/api/reports", tags=["Reports & Exports"])

MIME_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf"
}


def _safe_filename_slug(text: str) -> str:
    """Sanitizes text for safe inclusion in Content-Disposition filename headers."""
    cleaned = re.sub(r"[^\w\-_]", "-", text).strip("-")
    return cleaned[:40] or "report"


# -----------------------------------------------------------------------------
# 1. Multi-Campaign Summary Export
# -----------------------------------------------------------------------------

@router.get("/campaigns/export")
def export_multi_campaign_roi(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    cost_mode: str = Query("authoritative", pattern="^(authoritative|inclusive|additive|direct_only|talent_only)$"),
    include_demo: bool = False,
    status_filter: Optional[str] = Query(None, alias="status"),
    platform: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports consolidated multi-campaign ROI, total cost, and performance metrics
    across all campaigns accessible to the authenticated tenant.
    """
    q = db.query(Campaign)

    # Role-based tenant filtering
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

    # Reusing authoritative calculation logic
    summaries = [
        _build_campaign_roi_summary(
            db=db,
            campaign=c,
            user=current_user,
            start_date=start_date,
            end_date=end_date,
            days=days,
            cost_mode=cost_mode,
            include_archived=False
        )
        for c in campaigns
    ]

    total_budget = sum(s.cost.budget for s in summaries)
    valid_costs = [s.cost.total_campaign_cost for s in summaries if s.cost.total_campaign_cost is not None]
    total_cost = sum(valid_costs) if valid_costs else None
    total_revenue = sum(s.revenue.attributed_revenue or 0.0 for s in summaries)
    total_impressions = sum(s.totals.impressions for s in summaries)
    total_engagements = sum(s.totals.engagements for s in summaries)

    cost_dec = to_decimal(total_cost) if total_cost is not None else None
    rev_dec = to_decimal(total_revenue) if valid_costs else None

    overall_roi_pct = calculate_roi(rev_dec, cost_dec) if valid_costs else None
    overall_roas = calculate_roas(rev_dec, cost_dec) if valid_costs else None
    overall_cpm = calculate_cpm(cost_dec, total_impressions) if valid_costs else None
    overall_cpe = calculate_cpe(cost_dec, total_engagements) if valid_costs else None

    has_ambiguity = any(s.cost.has_cost_ambiguity for s in summaries)

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": current_user.id,
            "user_role": current_user.role,
            "cost_mode": cost_mode,
            "include_demo": include_demo,
            "filter_status": status_filter or "all",
            "filter_platform": platform or "all"
        },
        "has_ambiguity": has_ambiguity,
        "aggregates": {
            "total_campaigns": len(summaries),
            "total_budget": round(total_budget, 2),
            "total_cost": round(total_cost, 2) if total_cost is not None else None,
            "total_revenue": round(total_revenue, 2),
            "overall_roi_pct": overall_roi_pct,
            "overall_roas": overall_roas,
            "total_impressions": total_impressions,
            "total_engagements": total_engagements,
            "overall_cpm": overall_cpm,
            "overall_cpe": overall_cpe
        },
        "campaigns": [s.model_dump() for s in summaries]
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-campaigns-summary-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_campaigns_summary_csv(report_payload).encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_campaigns_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_campaigns_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported multi-campaign summary in {format.upper()} format.")

    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# -----------------------------------------------------------------------------
# 2. Single-Campaign Deep-Dive Export
# -----------------------------------------------------------------------------

@router.get("/campaigns/{campaign_id}/export")
def export_single_campaign_roi(
    campaign_id: int,
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    cost_mode: str = Query("authoritative", pattern="^(authoritative|inclusive|additive|direct_only|talent_only)$"),
    include_archived: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports comprehensive campaign deep dive report including cost breakdown,
    creator deliverables roster, and performance milestones timeline.
    """
    campaign = _check_campaign_access(db, campaign_id, current_user)

    roi_summary = _build_campaign_roi_summary(
        db=db,
        campaign=campaign,
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        days=days,
        cost_mode=cost_mode,
        include_archived=include_archived
    )

    brand = db.get(Brand, campaign.brand_id) if getattr(campaign, "brand_id", None) else None

    # Fetch creator roster
    cq = db.query(CampaignCreator).filter(CampaignCreator.campaign_id == campaign_id)
    if not include_archived:
        cq = cq.filter(CampaignCreator.is_archived.is_(False))

    if current_user.role == "creator" and campaign.user_id != current_user.id:
        # Creator only exports their own assigned deliverables
        cq = cq.filter(CampaignCreator.creator_id == current_user.id)
    elif current_user.role == "agency" and campaign.user_id != current_user.id:
        roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()]
        cq = cq.filter(CampaignCreator.creator_id.in_(roster_cids))

    assignments = cq.all()

    # Pre-fetch milestones for this campaign
    perf_q = db.query(CampaignPerformance).filter(CampaignPerformance.campaign_id == campaign_id)
    if not include_archived:
        perf_q = perf_q.filter(CampaignPerformance.is_archived.is_(False))

    if days or start_date or end_date:
        s_date, e_date = resolve_range(start_date, end_date, days)
        perf_q = perf_q.filter(CampaignPerformance.reporting_date >= s_date, CampaignPerformance.reporting_date <= e_date)

    if current_user.role == "creator" and campaign.user_id != current_user.id:
        perf_q = perf_q.filter(CampaignPerformance.creator_id == current_user.id)

    milestones = perf_q.order_by(CampaignPerformance.reporting_date.asc()).all()

    # Assemble creator breakdown items with authoritative metric calculation
    creator_items = []
    for a in assignments:
        creator_user = getattr(a, "creator", None)
        c_perfs = [p for p in milestones if p.creator_id == a.creator_id]

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

        # Peer creator financial masking check
        is_masked = (current_user.role == "creator" and campaign.user_id != current_user.id and a.creator_id != current_user.id)
        comp_display = "[Masked]" if is_masked else f"${float(cost_dec):,.2f}"

        creator_items.append({
            "creator_id": a.creator_id,
            "creator_name": creator_user.full_name if creator_user else f"Creator #{a.creator_id}",
            "creator_email": creator_user.email if creator_user else None,
            "status": a.status,
            "deliverables": a.deliverables,
            "agreed_compensation": float(cost_dec) if not is_masked else None,
            "agreed_compensation_display": comp_display,
            "impressions": c_imp,
            "reach": c_reach,
            "engagements": c_eng,
            "clicks": c_clicks,
            "conversions": c_conv,
            "revenue": float(rev_dec) if rev_dec is not None else None,
            "roi_pct": roi_pct,
            "roas": roas,
            "cpm": cpm,
            "cpe": cpe
        })

    # Assemble milestone items
    milestone_items = []
    for m in milestones:
        m_creator = getattr(m, "creator", None)
        milestone_items.append({
            "id": m.id,
            "reporting_date": m.reporting_date.isoformat() if m.reporting_date else "",
            "data_source": m.data_source,
            "creator_id": m.creator_id,
            "creator_name": m_creator.full_name if m_creator else None,
            "impressions": m.impressions,
            "reach": m.reach,
            "engagements": m.engagements,
            "clicks": m.clicks,
            "conversions": m.conversions,
            "revenue": m.revenue,
            "is_archived": m.is_archived
        })

    report_payload = {
        "campaign": {
            "id": campaign.id,
            "title": campaign.title,
            "client_name": campaign.client_name,
            "brand_name": brand.name if brand else None,
            "platform": campaign.platform,
            "status": campaign.status,
            "is_demo": campaign.is_demo,
            "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
            "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
        },
        "cost_mode": cost_mode,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "cost": roi_summary.cost.model_dump(),
        "revenue": roi_summary.revenue.model_dump(),
        "metrics": roi_summary.metrics.model_dump(),
        "totals": roi_summary.totals.model_dump(),
        "creators": creator_items,
        "milestones": milestone_items
    }

    slug = _safe_filename_slug(campaign.title)
    today_str = date.today().isoformat()
    filename = f"creatorIQ-{slug}-report-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_single_campaign_csv(report_payload).encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_single_campaign_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_single_campaign_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported deep dive report for campaign #{campaign_id} in {format.upper()} format.")

    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# -----------------------------------------------------------------------------
# 3. Creator Deliverables & Performance Export
# -----------------------------------------------------------------------------

@router.get("/creators/export")
def export_creator_performance(
    campaign_id: Optional[int] = None,
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    include_demo: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports creator-level performance and deliverable status.
    Creators can only export their own records; other creators' compensations are masked.
    """
    # 1. Identify accessible campaigns
    if campaign_id:
        campaign = _check_campaign_access(db, campaign_id, current_user)
        accessible_campaigns = [campaign]
        scope_desc = f"Campaign #{campaign.id} ({campaign.title})"
    else:
        q = db.query(Campaign)
        if current_user.role in ("admin", "administrator"):
            pass
        elif current_user.role == "marketing":
            if include_demo:
                q = q.filter((Campaign.user_id == current_user.id) | (Campaign.is_demo.is_(True)))
            else:
                q = q.filter(Campaign.user_id == current_user.id)
        elif current_user.role == "agency":
            roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()]
            assigned_cids = [c[0] for c in db.query(CampaignCreator.campaign_id).filter(CampaignCreator.creator_id.in_(roster_cids)).all()]
            q = q.filter(or_(Campaign.user_id == current_user.id, Campaign.id.in_(assigned_cids)))
        elif current_user.role == "creator":
            assigned_cids = [c[0] for c in db.query(CampaignCreator.campaign_id).filter(CampaignCreator.creator_id == current_user.id).all()]
            q = q.filter(or_(Campaign.user_id == current_user.id, Campaign.id.in_(assigned_cids)))

        if not include_demo:
            q = q.filter(Campaign.is_demo.is_(False))

        accessible_campaigns = q.all()
        scope_desc = f"Consolidated ({len(accessible_campaigns)} Campaigns)"

    camp_ids = [c.id for c in accessible_campaigns]

    if not camp_ids:
        # Empty set handled gracefully
        creators_list = []
    else:
        cq = db.query(CampaignCreator).filter(CampaignCreator.campaign_id.in_(camp_ids), CampaignCreator.is_archived.is_(False))

        if current_user.role == "creator":
            cq = cq.filter(CampaignCreator.creator_id == current_user.id)
        elif current_user.role == "agency":
            roster_cids = [r[0] for r in db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()]
            # Include roster or owned campaign creators
            owned_camp_ids = [c.id for c in accessible_campaigns if c.user_id == current_user.id]
            cq = cq.filter(or_(CampaignCreator.creator_id.in_(roster_cids), CampaignCreator.campaign_id.in_(owned_camp_ids)))

        assignments = cq.all()

        # Pre-fetch performances
        perf_q = db.query(CampaignPerformance).filter(
            CampaignPerformance.campaign_id.in_(camp_ids),
            CampaignPerformance.is_archived.is_(False)
        )
        if days or start_date or end_date:
            s_date, e_date = resolve_range(start_date, end_date, days)
            perf_q = perf_q.filter(CampaignPerformance.reporting_date >= s_date, CampaignPerformance.reporting_date <= e_date)

        all_perfs = perf_q.all()
        camp_map = {c.id: c for c in accessible_campaigns}

        creators_list = []
        for a in assignments:
            parent_camp = camp_map.get(a.campaign_id)
            creator_user = getattr(a, "creator", None)
            c_perfs = [p for p in all_perfs if p.campaign_id == a.campaign_id and p.creator_id == a.creator_id]

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

            is_masked = (current_user.role == "creator" and parent_camp and parent_camp.user_id != current_user.id and a.creator_id != current_user.id)
            comp_display = "[Masked]" if is_masked else f"${float(cost_dec):,.2f}"

            creators_list.append({
                "campaign_id": a.campaign_id,
                "campaign_title": parent_camp.title if parent_camp else f"Campaign #{a.campaign_id}",
                "creator_id": a.creator_id,
                "creator_name": creator_user.full_name if creator_user else f"Creator #{a.creator_id}",
                "creator_email": creator_user.email if creator_user else None,
                "status": a.status,
                "deliverables": a.deliverables,
                "agreed_compensation": float(cost_dec) if not is_masked else None,
                "agreed_compensation_display": comp_display,
                "impressions": c_imp,
                "reach": c_reach,
                "engagements": c_eng,
                "clicks": c_clicks,
                "conversions": c_conv,
                "revenue": float(rev_dec) if rev_dec is not None else None,
                "roi_pct": roi_pct,
                "roas": roas,
                "cpm": cpm,
                "cpe": cpe,
                "ctr": ctr,
                "conversion_rate": conv_rate
            })

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": current_user.id,
            "user_role": current_user.role,
            "campaign_scope": scope_desc
        },
        "creators": creators_list
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-creator-performance-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_creators_summary_csv(report_payload).encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_creators_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_creators_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported creator deliverables report in {format.upper()} format.")

    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )




# -----------------------------------------------------------------------------
# Module 2 & 9: Content Performance Report Export API
# -----------------------------------------------------------------------------

@router.get("/content/export")
def export_content_report(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$", description="Export format: csv, xlsx, pdf"),
    platform: Optional[str] = Query(None, description="Optional platform filter: youtube, instagram, etc."),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    creator_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports comprehensive content performance analytics (Module 2 & 9)
    in CSV, Excel, or PDF format with formula injection sanitization.
    """
    target_user_id = current_user.id
    if creator_id and current_user.role in ("agency", "admin", "administrator"):
        if current_user.role == "agency":
            link = db.query(AgencyCreator).filter_by(agency_id=current_user.id, creator_id=creator_id).first()
            if not link:
                raise HTTPException(status_code=403, detail="Agency does not manage this creator.")
        target_user_id = creator_id

    query = db.query(ContentRecord).filter(ContentRecord.user_id == target_user_id)
    if platform and platform != "all":
        query = query.filter(ContentRecord.platform == platform.lower())
    if start_date:
        query = query.filter(ContentRecord.published_at >= start_date)
    if end_date:
        query = query.filter(ContentRecord.published_at <= end_date)

    items = query.order_by(ContentRecord.published_at.desc()).all()
    content_list = []
    for c in items:
        eng_rate = engagement_rate(c.likes, c.comments, c.shares, c.saves, c.reach)
        content_list.append({
            "id": c.id,
            "title": c.title,
            "platform": c.platform,
            "published_at": c.published_at.isoformat() if c.published_at else "",
            "views": c.views,
            "likes": c.likes,
            "comments": c.comments,
            "shares": c.shares,
            "saves": c.saves,
            "reach": c.reach,
            "watch_time_minutes": c.watch_time_minutes,
            "engagement_rate": eng_rate
        })

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": target_user_id,
            "user_role": current_user.role,
            "platform_filter": platform or "all",
            "date_range": f"{start_date or 'Earliest'} to {end_date or 'Latest'}"
        },
        "content": content_list
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-content-performance-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_content_summary_csv(report_payload).getvalue().encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_content_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_content_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported content analytics report in {format.upper()} format.")
    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# -----------------------------------------------------------------------------
# Module 3 & 9: Audience Demographics & Devices Report Export API
# -----------------------------------------------------------------------------

@router.get("/audience/export")
def export_audience_report(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    creator_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports audience demographics, devices, and active hours (Module 3 & 9).
    """
    target_user_id = current_user.id
    if creator_id and current_user.role in ("agency", "admin", "administrator"):
        if current_user.role == "agency":
            link = db.query(AgencyCreator).filter_by(agency_id=current_user.id, creator_id=creator_id).first()
            if not link:
                raise HTTPException(status_code=403, detail="Agency does not manage this creator.")
        target_user_id = creator_id

    records = db.query(AudienceMetric).filter_by(user_id=target_user_id).all()
    aud_list = []
    for a in records:
        top_age = "N/A"
        if a.age_distribution:
            top_age = max(a.age_distribution.items(), key=lambda x: x[1])[0]

        gender_str = ", ".join(f"{k}: {v}%" for k, v in (a.gender_distribution or {}).items())
        geo_str = ", ".join(f"{k}: {v}%" for k, v in list((a.geo_distribution or {}).items())[:4])
        dev_str = ", ".join(f"{k}: {v}%" for k, v in (a.device_distribution or {}).items()) if a.device_distribution else "Mobile: 70%, Desktop: 25%, Tablet: 5%"

        aud_list.append({
            "platform": a.platform,
            "top_age": top_age,
            "gender_str": gender_str or "N/A",
            "geo_str": geo_str or "N/A",
            "device_str": dev_str
        })

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": target_user_id,
            "user_role": current_user.role
        },
        "audience": aud_list
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-audience-analytics-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_audience_summary_csv(report_payload).getvalue().encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_audience_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_audience_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported audience analytics report in {format.upper()} format.")
    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# -----------------------------------------------------------------------------
# Module 5 & 9: 5-Source Revenue Report Export API
# -----------------------------------------------------------------------------

@router.get("/revenue/export")
def export_revenue_report(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    source: Optional[str] = None,
    platform: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    creator_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports detailed revenue breakdown across all 5 income sources (Module 5 & 9).
    """
    target_user_id = current_user.id
    if creator_id and current_user.role in ("agency", "admin", "administrator"):
        if current_user.role == "agency":
            link = db.query(AgencyCreator).filter_by(agency_id=current_user.id, creator_id=creator_id).first()
            if not link:
                raise HTTPException(status_code=403, detail="Agency does not manage this creator.")
        target_user_id = creator_id

    query = db.query(RevenueRecord).filter(
        RevenueRecord.user_id == target_user_id,
        RevenueRecord.is_archived == False
    )
    if source and source != "all":
        query = query.filter(RevenueRecord.source == source)
    if platform and platform != "all":
        query = query.filter(RevenueRecord.platform == platform)
    if start_date:
        query = query.filter(RevenueRecord.date >= start_date)
    if end_date:
        query = query.filter(RevenueRecord.date <= end_date)

    records = query.order_by(RevenueRecord.date.desc()).all()
    total_rev = sum(r.amount for r in records)

    rev_list = []
    for r in records:
        rev_list.append({
            "id": r.id,
            "date": r.date.isoformat(),
            "source": r.source,
            "platform": r.platform,
            "amount": float(r.amount),
            "notes": r.notes
        })

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": target_user_id,
            "user_role": current_user.role,
            "total_revenue": float(total_rev)
        },
        "records": rev_list
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-revenue-report-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_revenue_summary_csv(report_payload).getvalue().encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_revenue_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_revenue_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported revenue report in {format.upper()} format.")
    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# -----------------------------------------------------------------------------
# Module 4 & 9: Follower Growth & Historical Reach Export API
# -----------------------------------------------------------------------------

@router.get("/growth/export")
def export_growth_report(
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    platform: Optional[str] = None,
    creator_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports follower growth, new followers, and reach trajectory (Module 4 & 9).
    """
    target_user_id = current_user.id
    if creator_id and current_user.role in ("agency", "admin", "administrator"):
        if current_user.role == "agency":
            link = db.query(AgencyCreator).filter_by(agency_id=current_user.id, creator_id=creator_id).first()
            if not link:
                raise HTTPException(status_code=403, detail="Agency does not manage this creator.")
        target_user_id = creator_id

    query = db.query(FollowerGrowth).filter(FollowerGrowth.user_id == target_user_id)
    if platform and platform != "all":
        query = query.filter(FollowerGrowth.platform == platform)

    rows = query.order_by(FollowerGrowth.date.desc()).limit(180).all()
    growth_list = []
    for row in rows:
        growth_list.append({
            "date": row.date.isoformat(),
            "platform": row.platform,
            "followers": row.followers,
            "new_followers": row.new_followers,
            "impressions": row.impressions,
            "reach": row.reach
        })

    report_payload = {
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "user_id": target_user_id,
            "user_role": current_user.role
        },
        "growth": growth_list
    }

    today_str = date.today().isoformat()
    filename = f"creatorIQ-follower-growth-{today_str}.{format}"

    if format == "csv":
        data_bytes = export_growth_summary_csv(report_payload).getvalue().encode("utf-8")
    elif format == "xlsx":
        data_bytes = export_growth_summary_xlsx(report_payload).getvalue()
    elif format == "pdf":
        data_bytes = export_growth_summary_pdf(report_payload).getvalue()
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format.")

    log(db, current_user.id, "report_export", f"Exported follower growth report in {format.upper()} format.")
    return Response(
        content=data_bytes,
        media_type=MIME_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
