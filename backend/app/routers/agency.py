"""Agency workspace operations: overview, team, campaigns, content and reports."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.access_policy import effective_permissions
from app.audit import record_audit
from app.database import get_db
from app.dependencies import require_roles
from app.models import (
    AccountMetric,
    AgencyProfile,
    AgencyTeamMember,
    AudienceInsight,
    Campaign,
    CampaignCreator,
    ContentMetric,
    ContentPost,
    CreatorProfile,
    Notification,
    Report,
    RevenueRecord,
    SocialAccount,
    User,
    WorkspaceAccess,
)
from app.report_exports import csv_bytes, pdf_bytes, xlsx_bytes
from app.notify import create_notification
from app.schemas import (
    AgencyReportGenerateRequest,
    CampaignCreateRequest,
    CampaignCreatorAssignment,
    CampaignUpdateRequest,
    TeamMemberCreateRequest,
    TeamMemberUpdateRequest,
)

router = APIRouter(prefix="/agency", tags=["Agency workspace"])

ALL_CONTENT_METRICS = ("views", "likes", "comments", "shares", "saves", "watch_time_seconds", "reach", "impressions")
INTERACTION_FIELDS = {"likes", "comments", "shares", "saves"}
TEAM_ROLES = ("agency_owner", "agency_admin", "campaign_manager", "analyst", "viewer")


def _agency_profile(db: Session, user: User) -> AgencyProfile:
    profile = db.query(AgencyProfile).filter(AgencyProfile.user_id == user.id).one_or_none()
    if profile is None:
        raise HTTPException(status_code=403, detail="An agency profile is required for this action.")
    return profile


def _approved_access(db: Session, user: User) -> list[WorkspaceAccess]:
    return (
        db.query(WorkspaceAccess)
        .filter(
            WorkspaceAccess.collaborator_user_id == user.id,
            WorkspaceAccess.status == "approved",
        )
        .all()
    )


def _creator_context(db: Session, access: WorkspaceAccess) -> tuple[CreatorProfile, User] | None:
    profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one_or_none()
    if profile is None:
        return None
    creator = db.query(User).filter(User.id == profile.user_id).one_or_none()
    if creator is None:
        return None
    return profile, creator


def _has(access: WorkspaceAccess, permission: str) -> bool:
    return permission in effective_permissions(access.granted_permissions)


def _campaign_data(
    db: Session,
    campaign: Campaign,
    authorized: dict[int, WorkspaceAccess],
) -> dict:
    assignments = db.query(CampaignCreator).filter(CampaignCreator.campaign_id == campaign.id).all()
    creator_rows = []
    total_views = 0
    total_engagements = 0
    rates: list[float] = []
    performance_available = False
    for assignment in assignments:
        profile = db.query(CreatorProfile).filter(CreatorProfile.id == assignment.creator_profile_id).one_or_none()
        if profile is None:
            continue
        access = authorized.get(profile.id)
        creator = db.query(User).filter(User.id == profile.user_id).one_or_none()
        row = {
            "assignment_id": assignment.id,
            "creator_profile_id": profile.id,
            "creator_name": creator.full_name if creator else profile.display_name,
            "status": assignment.status,
            "notes": assignment.notes,
            "performance_available": bool(access and _has(access, "content")),
        }
        if row["performance_available"]:
            performance_available = True
            start = campaign.start_date or (date.today() - timedelta(days=29))
            end = campaign.end_date or date.today()
            metrics = (
                db.query(ContentMetric)
                .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
                .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
                .filter(
                    SocialAccount.creator_profile_id == profile.id,
                    ContentMetric.recorded_on >= start,
                    ContentMetric.recorded_on <= end,
                )
                .all()
            )
            views = engagements = 0
            for metric in metrics:
                available = set(metric.metrics_available or ALL_CONTENT_METRICS)
                if "views" in available:
                    views += metric.views
                if INTERACTION_FIELDS & available:
                    engagements += metric.likes + metric.comments + metric.shares + metric.saves
                    rates.append(metric.engagement_rate)
            total_views += views
            total_engagements += engagements
            row.update({"views": views, "engagements": engagements})
        creator_rows.append(row)
    budget = float(campaign.budget or 0)
    return {
        "id": campaign.id,
        "name": campaign.name,
        "brand": campaign.brand,
        "description": campaign.description,
        "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
        "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
        "budget": budget,
        "currency": campaign.currency,
        "platforms": campaign.platforms or [],
        "objectives": campaign.objectives,
        "status": campaign.status,
        "created_at": campaign.created_at.isoformat(),
        "creator_count": len(assignments),
        "creators": creator_rows,
        "performance_available": performance_available,
        "performance": {
            "views": total_views,
            "engagements": total_engagements,
            "engagement_rate": round(sum(rates) / len(rates), 2) if rates else None,
        } if performance_available else None,
    }


@router.get("/overview")
def agency_overview(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    profile = _agency_profile(db, user)
    accesses = _approved_access(db, user)
    pending = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.collaborator_user_id == user.id,
        WorkspaceAccess.status == "pending",
    ).count()
    connected = 0
    creator_profile_ids = []
    for access in accesses:
        context = _creator_context(db, access)
        if context is None:
            continue
        creator_profile, _creator = context
        creator_profile_ids.append(creator_profile.id)
        connected += db.query(SocialAccount).filter(
            SocialAccount.creator_profile_id == creator_profile.id,
            SocialAccount.is_connected.is_(True),
        ).count()
    campaigns = db.query(Campaign).filter(Campaign.agency_user_id == user.id).all()
    team_count = db.query(AgencyTeamMember).filter(
        AgencyTeamMember.agency_user_id == user.id,
        AgencyTeamMember.status != "deactivated",
    ).count()
    profile_complete = bool(profile.agency_name and profile.bio and (profile.website or profile.contact_number or profile.business_email))
    checklist = [
        {
            "key": "profile",
            "title": "Complete your agency profile",
            "complete": profile_complete,
            "detail": "Add a description and at least one public contact detail.",
        },
        {
            "key": "access",
            "title": "Request creator access",
            "complete": db.query(WorkspaceAccess).filter(WorkspaceAccess.collaborator_user_id == user.id).count() > 0,
            "detail": "Creator data remains private until a creator approves access.",
        },
        {
            "key": "review",
            "title": "Review approved creators",
            "complete": bool(accesses),
            "detail": f"{len(accesses)} creator workspace{'s' if len(accesses) != 1 else ''} currently approved.",
        },
        {
            "key": "connections",
            "title": "Connect authorized creator accounts",
            "complete": connected > 0,
            "detail": "Creators connect their own social accounts; agencies never receive provider tokens.",
        },
        {
            "key": "security",
            "title": "Configure workspace security",
            "complete": team_count > 1,
            "detail": "Invite team members with scoped roles instead of sharing the agency login.",
        },
    ]
    recent = (
        db.query(WorkspaceAccess)
        .filter(WorkspaceAccess.collaborator_user_id == user.id)
        .order_by(WorkspaceAccess.updated_at.desc())
        .limit(8)
        .all()
    )
    activity = []
    for access in recent:
        context = _creator_context(db, access)
        creator_name = context[1].full_name if context else "Creator workspace"
        activity.append({
            "id": access.id,
            "status": access.status,
            "creator_name": creator_name,
            "updated_at": access.updated_at.isoformat(),
        })
    next_action = (
        "Complete your agency profile"
        if not profile_complete
        else "Request creator access"
        if not accesses and not pending
        else "Review pending creator requests"
        if pending
        else "Create your first campaign"
        if not campaigns
        else "Review campaign progress"
    )
    return {
        "agency_name": profile.agency_name,
        "totals": {
            "approved_creators": len(accesses),
            "pending_requests": pending,
            "active_collaborations": len(accesses),
            "connected_accounts": connected,
            "campaigns": len(campaigns),
            "active_campaigns": len([campaign for campaign in campaigns if campaign.status == "active"]),
            "team_members": team_count,
        },
        "privacy_status": "consent_required",
        "checklist": checklist,
        "recent_activity": activity,
        "next_action": next_action,
    }


@router.get("/team")
def list_team(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    members = (
        db.query(AgencyTeamMember)
        .filter(AgencyTeamMember.agency_user_id == user.id)
        .order_by(AgencyTeamMember.invited_at.asc())
        .all()
    )
    return {
        "roles": list(TEAM_ROLES),
        "members": [
            {
                "id": member.id,
                "email": member.email,
                "full_name": member.full_name,
                "role": member.role,
                "status": member.status,
                "invited_at": member.invited_at.isoformat(),
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            }
            for member in members
        ],
    }


@router.post("/team", status_code=status.HTTP_201_CREATED)
def invite_team_member(
    payload: TeamMemberCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    email = str(payload.email).lower().strip()
    if db.query(AgencyTeamMember).filter(
        AgencyTeamMember.agency_user_id == user.id,
        AgencyTeamMember.email == email,
    ).first():
        raise HTTPException(status_code=409, detail="That email is already part of this agency team.")
    linked_user = db.query(User).filter(func.lower(User.email) == email).one_or_none()
    member = AgencyTeamMember(
        agency_user_id=user.id,
        member_user_id=linked_user.id if linked_user else None,
        email=email,
        full_name=payload.full_name.strip(),
        role=payload.role,
        status="active" if linked_user else "invited",
        joined_at=datetime.now(timezone.utc) if linked_user else None,
    )
    db.add(member)
    if linked_user:
        create_notification(
            db,
            user=linked_user,
            title="Added to an agency team",
            message=f"You were added to {user.full_name}'s agency workspace as {payload.role.replace('_', ' ')}.",
            category="workspace",
            link="Overview",
        )
    record_audit(
        db, user, "agency.team_member_invited",
        target_type="agency_team_member", target_id=None,
        details={"email": email, "role": payload.role}, request=request,
    )
    db.commit()
    db.refresh(member)
    return {
        "id": member.id,
        "email": member.email,
        "full_name": member.full_name,
        "role": member.role,
        "status": member.status,
        "invited_at": member.invited_at.isoformat(),
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
    }


@router.patch("/team/{member_id}")
def update_team_member(
    member_id: int,
    payload: TeamMemberUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    member = db.query(AgencyTeamMember).filter(
        AgencyTeamMember.id == member_id,
        AgencyTeamMember.agency_user_id == user.id,
    ).one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "role" in changes and changes["role"]:
        member.role = changes["role"]
    if "status" in changes and changes["status"]:
        member.status = changes["status"]
        if changes["status"] == "active" and member.joined_at is None:
            member.joined_at = datetime.now(timezone.utc)
    record_audit(
        db, user, "agency.team_member_updated",
        target_type="agency_team_member", target_id=member.id,
        details={"email": member.email, "fields": sorted(payload.model_fields_set)}, request=request,
    )
    db.commit()
    db.refresh(member)
    return {
        "id": member.id,
        "email": member.email,
        "full_name": member.full_name,
        "role": member.role,
        "status": member.status,
    }


@router.delete("/team/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    member_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    member = db.query(AgencyTeamMember).filter(
        AgencyTeamMember.id == member_id,
        AgencyTeamMember.agency_user_id == user.id,
    ).one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found.")
    record_audit(
        db, user, "agency.team_member_removed",
        target_type="agency_team_member", target_id=member.id,
        details={"email": member.email}, request=request,
    )
    db.delete(member)
    db.commit()
    return None


@router.get("/campaigns")
def list_campaigns(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    accesses = _approved_access(db, user)
    authorized = {access.creator_profile_id: access for access in accesses}
    query = db.query(Campaign).filter(Campaign.agency_user_id == user.id)
    if status_filter:
        query = query.filter(Campaign.status == status_filter)
    campaigns = query.order_by(Campaign.created_at.desc()).all()
    data = [_campaign_data(db, campaign, authorized) for campaign in campaigns]
    totals = {
        "total": len(data),
        "active": len([item for item in data if item["status"] == "active"]),
        "completed": len([item for item in data if item["status"] == "completed"]),
        "draft": len([item for item in data if item["status"] == "draft"]),
        "budget_by_currency": _sum_budgets(campaigns),
    }
    return {"campaigns": data, "totals": totals}


def _sum_budgets(campaigns: list[Campaign]) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    for campaign in campaigns:
        totals[campaign.currency] += float(campaign.budget or 0)
    return [
        {"currency": currency, "amount": round(amount, 2)}
        for currency, amount in sorted(totals.items())
    ]


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    if payload.start_date and payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="The campaign end date must be on or after its start date.")
    campaign = Campaign(
        agency_user_id=user.id,
        name=payload.name.strip(),
        brand=payload.brand.strip() if payload.brand else None,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        budget=payload.budget,
        currency=payload.currency.upper(),
        platforms=payload.platforms,
        objectives=payload.objectives,
        status=payload.status,
    )
    db.add(campaign)
    db.flush()
    record_audit(
        db, user, "agency.campaign_created",
        target_type="campaign", target_id=campaign.id,
        details={"name": campaign.name}, request=request,
    )
    db.commit()
    db.refresh(campaign)
    return _campaign_data(db, campaign, {})


@router.patch("/campaigns/{campaign_id}")
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.agency_user_id == user.id
    ).one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    changes = payload.model_dump(exclude_unset=True)
    start = changes.get("start_date", campaign.start_date)
    end = changes.get("end_date", campaign.end_date)
    if start and end and end < start:
        raise HTTPException(status_code=422, detail="The campaign end date must be on or after its start date.")
    for field, value in changes.items():
        if field == "currency" and value:
            value = value.upper()
        if field in {"name", "brand"} and isinstance(value, str):
            value = value.strip()
        setattr(campaign, field, value)
    record_audit(
        db, user, "agency.campaign_updated",
        target_type="campaign", target_id=campaign.id,
        details={"fields": sorted(payload.model_fields_set)}, request=request,
    )
    db.commit()
    db.refresh(campaign)
    accesses = _approved_access(db, user)
    authorized = {access.creator_profile_id: access for access in accesses}
    return _campaign_data(db, campaign, authorized)


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.agency_user_id == user.id
    ).one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    record_audit(
        db, user, "agency.campaign_deleted",
        target_type="campaign", target_id=campaign.id,
        details={"name": campaign.name}, request=request,
    )
    db.delete(campaign)
    db.commit()
    return None


@router.post("/campaigns/{campaign_id}/creators", status_code=status.HTTP_201_CREATED)
def assign_creator_to_campaign(
    campaign_id: int,
    payload: CampaignCreatorAssignment,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.agency_user_id == user.id
    ).one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    access = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.collaborator_user_id == user.id,
        WorkspaceAccess.creator_profile_id == payload.creator_profile_id,
        WorkspaceAccess.status == "approved",
    ).one_or_none()
    if access is None:
        raise HTTPException(status_code=403, detail="Creator consent is required before assigning this workspace to a campaign.")
    existing = db.query(CampaignCreator).filter(
        CampaignCreator.campaign_id == campaign.id,
        CampaignCreator.creator_profile_id == payload.creator_profile_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="That creator is already assigned to this campaign.")
    assignment = CampaignCreator(
        campaign_id=campaign.id,
        creator_profile_id=payload.creator_profile_id,
        notes=payload.notes,
    )
    db.add(assignment)
    record_audit(
        db, user, "agency.campaign_creator_assigned",
        target_type="campaign", target_id=campaign.id,
        details={"creator_profile_id": payload.creator_profile_id}, request=request,
    )
    db.commit()
    return {"id": assignment.id, "campaign_id": campaign.id, "creator_profile_id": assignment.creator_profile_id}


@router.delete("/campaigns/{campaign_id}/creators/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_campaign_creator(
    campaign_id: int,
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.agency_user_id == user.id
    ).one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    assignment = db.query(CampaignCreator).filter(
        CampaignCreator.id == assignment_id,
        CampaignCreator.campaign_id == campaign.id,
    ).one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Campaign assignment not found.")
    record_audit(
        db, user, "agency.campaign_creator_removed",
        target_type="campaign", target_id=campaign.id,
        details={"creator_profile_id": assignment.creator_profile_id}, request=request,
    )
    db.delete(assignment)
    db.commit()
    return None


@router.get("/content")
def agency_content(
    platform: str | None = Query(default=None, max_length=40),
    creator_profile_id: int | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=730),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    accesses = _approved_access(db, user)
    start = date.today() - timedelta(days=days - 1)
    authorized = []
    posts: list[dict] = []
    for access in accesses:
        if not _has(access, "content"):
            continue
        context = _creator_context(db, access)
        if context is None:
            continue
        profile, creator = context
        if creator_profile_id and profile.id != creator_profile_id:
            continue
        authorized.append({"creator_profile_id": profile.id, "name": creator.full_name})
        query = (
            db.query(ContentPost, SocialAccount)
            .join(SocialAccount)
            .filter(SocialAccount.creator_profile_id == profile.id)
        )
        if platform:
            query = query.filter(func.lower(SocialAccount.platform) == platform.lower())
        for post, account in query.all():
            metrics = db.query(ContentMetric).filter(ContentMetric.content_post_id == post.id).all()
            views = engagements = 0
            rates: list[float] = []
            metrics_available: set[str] = set()
            for metric in metrics:
                available = set(metric.metrics_available or ALL_CONTENT_METRICS)
                metrics_available |= available
                if "views" in available:
                    views += metric.views
                if INTERACTION_FIELDS & available:
                    engagements += metric.likes + metric.comments + metric.shares + metric.saves
                    rates.append(metric.engagement_rate)
            posts.append({
                "id": post.id,
                "creator_profile_id": profile.id,
                "creator_name": creator.full_name,
                "title": post.title,
                "platform": account.platform,
                "content_type": post.content_type,
                "post_url": post.post_url,
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "views": views if "views" in metrics_available else None,
                "engagements": engagements if INTERACTION_FIELDS & metrics_available else None,
                "engagement_rate": round(sum(rates) / len(rates), 2) if rates else None,
                "metrics_available": sorted(metrics_available),
            })
    posts.sort(key=lambda item: item["views"] or 0, reverse=True)
    return {
        "authorized_creators": authorized,
        "period_days": days,
        "posts": posts[:limit],
        "note": "Only creators with granted content permission are included.",
    }


def _authorized_report_rows(
    db: Session,
    user: User,
    report_type: str,
    days: int,
) -> list[dict[str, object]]:
    accesses = _approved_access(db, user)
    start = date.today() - timedelta(days=days - 1)
    rows: list[dict[str, object]] = []
    for access in accesses:
        context = _creator_context(db, access)
        if context is None:
            continue
        profile, creator = context
        if report_type in {"performance", "content"} and _has(access, "content"):
            metrics = (
                db.query(ContentMetric, SocialAccount)
                .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
                .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
                .filter(
                    SocialAccount.creator_profile_id == profile.id,
                    ContentMetric.recorded_on >= start,
                )
                .all()
            )
            views = engagements = 0
            for metric, _account in metrics:
                available = set(metric.metrics_available or ALL_CONTENT_METRICS)
                if "views" in available:
                    views += metric.views
                if INTERACTION_FIELDS & available:
                    engagements += metric.likes + metric.comments + metric.shares + metric.saves
            rows.append({
                "creator": creator.full_name,
                "metric": "views" if report_type == "performance" else "engagements",
                "value": views if report_type == "performance" else engagements,
                "period_days": days,
                "source": "creator_approved_analytics",
            })
        if report_type == "audience" and _has(access, "audience"):
            insights = (
                db.query(AudienceInsight)
                .join(SocialAccount)
                .filter(SocialAccount.creator_profile_id == profile.id)
                .order_by(AudienceInsight.recorded_on.desc())
                .all()
            )
            if insights:
                insight = insights[0]
                rows.append({
                    "creator": creator.full_name,
                    "platform": insight.social_account.platform,
                    "recorded_on": insight.recorded_on.isoformat(),
                    "reach": insight.reach if "reach" in (insight.metrics_available or []) else "Unavailable",
                    "impressions": insight.impressions if "impressions" in (insight.metrics_available or []) else "Unavailable",
                })
        if report_type == "growth" and _has(access, "growth"):
            metrics = (
                db.query(AccountMetric)
                .join(SocialAccount)
                .filter(
                    SocialAccount.creator_profile_id == profile.id,
                    AccountMetric.recorded_on >= start,
                )
                .order_by(AccountMetric.recorded_on.asc())
                .all()
            )
            for metric in metrics:
                rows.append({
                    "creator": creator.full_name,
                    "date": metric.recorded_on.isoformat(),
                    "followers": metric.followers_count if metric.followers_count is not None else "Unavailable",
                    "views": metric.views,
                })
        if report_type == "revenue" and _has(access, "revenue"):
            records = db.query(RevenueRecord).filter(
                RevenueRecord.creator_profile_id == profile.id,
                RevenueRecord.recorded_on >= start,
            ).all()
            for record in records:
                rows.append({
                    "creator": creator.full_name,
                    "date": record.recorded_on.isoformat(),
                    "source": record.source,
                    "brand": record.brand or "",
                    "amount": float(record.amount),
                    "currency": record.currency,
                    "payment_status": record.payment_status,
                    "source_type": record.source_type,
                })
    if report_type == "campaign":
        campaigns = db.query(Campaign).filter(Campaign.agency_user_id == user.id).all()
        authorized = {access.creator_profile_id: access for access in accesses}
        for campaign in campaigns:
            data = _campaign_data(db, campaign, authorized)
            rows.append({
                "campaign": data["name"],
                "brand": data["brand"] or "",
                "status": data["status"],
                "budget": data["budget"],
                "currency": data["currency"],
                "creators": data["creator_count"],
                "views": data["performance"]["views"] if data["performance"] else "Unavailable",
            })
    if not rows:
        rows.append({
            "note": "No creator data was authorized for this report. Creator consent is required.",
        })
    return rows


def _agency_report_data(report: Report) -> dict:
    return {
        "id": report.id,
        "report_type": report.report_type,
        "title": report.title,
        "format": report.format.lower(),
        "days": report.days,
        "platform": report.platform,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
        "download_url": f"/agency/reports/{report.id}/download" if report.status == "ready" else None,
    }


@router.get("/reports")
def list_agency_reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    reports = (
        db.query(Report)
        .filter(Report.agency_user_id == user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return {"reports": [_agency_report_data(report) for report in reports]}


@router.post("/reports/generate", status_code=status.HTTP_201_CREATED)
def generate_agency_report(
    payload: AgencyReportGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    report_type = payload.report_type
    rows = _authorized_report_rows(db, user, report_type, payload.days)
    title = f"Agency {report_type.title()} report - last {payload.days} days"
    report = Report(
        agency_user_id=user.id,
        report_type=report_type,
        title=title,
        format=payload.format.upper(),
        days=payload.days,
        platform=payload.platform,
        rows=rows,
        status="ready",
    )
    db.add(report)
    db.flush()
    report.file_url = f"/api/agency/reports/{report.id}/download"
    create_notification(
        db,
        user=user,
        title="Agency report ready",
        message=f"{report.title} is ready to download.",
        category="report",
        link="Reports",
    )
    record_audit(
        db, user, "agency.report_generated",
        target_type="report", target_id=report.id,
        details={"report_type": report_type, "days": payload.days}, request=request,
    )
    db.commit()
    db.refresh(report)
    return _agency_report_data(report)


@router.get("/reports/{report_id}/download")
def download_agency_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    report = db.query(Report).filter(
        Report.id == report_id, Report.agency_user_id == user.id
    ).one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    rows = report.rows or [{"note": "No authorized data was available for this report."}]
    format_name = report.format.lower()
    safe_stem = f"creatoriq-agency-{report.report_type}-{report.days}d-{date.today().isoformat()}"
    if format_name == "xlsx":
        body, media_type, extension = xlsx_bytes(rows, report.title), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    elif format_name == "csv":
        body, media_type, extension = csv_bytes(rows), "text/csv; charset=utf-8", "csv"
    else:
        body, media_type, extension = pdf_bytes(report.title, rows), "application/pdf", "pdf"
    return StreamingResponse(
        BytesIO(body),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_stem}.{extension}"'},
    )


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agency_report(
    report_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency")),
):
    report = db.query(Report).filter(
        Report.id == report_id, Report.agency_user_id == user.id
    ).one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    record_audit(
        db, user, "agency.report_deleted",
        target_type="report", target_id=report.id, request=request,
    )
    db.delete(report)
    db.commit()
    return None
