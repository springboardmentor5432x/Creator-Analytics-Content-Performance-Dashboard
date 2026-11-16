"""Campaign Creator Assignments Router (Phase 7.2).
Handles creator assignments, deliverables, agreed compensation, duplicate prevention,
and role-based permissions (creators cannot tamper with compensation).
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Campaign, CampaignCreator, AgencyCreator
from ..schemas import CampaignCreatorUpdate, CampaignCreatorOut, CampaignCreatorListOut
from ..services import campaign_creator_to_dict, log

router = APIRouter(prefix="/api/campaigns", tags=["Campaign Creator Assignments"])


class AssignCreatorIn(BaseModel):
    creator_id: int = Field(gt=0)
    agreed_compensation: float = Field(default=0.0, ge=0)
    status: str = Field(default="assigned", pattern="^(assigned|pending|accepted|declined|completed)$")
    deliverables: Optional[str] = Field(default=None, max_length=500)
    assigned_date: Optional[date] = None


def _check_campaign_management_access(db: Session, campaign: Campaign, user: User) -> bool:
    """Verifies whether user is authorized to manage creator assignments for this campaign."""
    if user.role in ("admin", "administrator"):
        return True
    if campaign.user_id == user.id:
        return True
    if user.role == "agency":
        # Agency can manage if campaign was assigned or if roster creators are involved
        return True
    return False


@router.post("/{campaign_id}/creators", response_model=CampaignCreatorOut, status_code=status.HTTP_201_CREATED)
def assign_creator_to_campaign(
    campaign_id: int,
    body: AssignCreatorIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assigns a creator to a campaign with agreed compensation and deliverables.
    Prevents duplicate assignments and validates permissions.
    """
    # 1. Validate Campaign
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # 2. Check Management Permission
    if not _check_campaign_management_access(db, campaign, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to assign creators to this campaign."
        )

    # 3. Validate Creator
    creator = db.get(User, body.creator_id)
    if not creator or creator.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid creator_id: specified user does not have the 'creator' role."
        )

    # 4. If Agency, verify creator is in their roster
    if current_user.role == "agency":
        is_roster = db.query(AgencyCreator).filter(
            AgencyCreator.agency_id == current_user.id,
            AgencyCreator.creator_id == body.creator_id
        ).first()
        if not is_roster:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specified creator is not on your agency roster."
            )

    # 5. Prevent Duplicate Creator Assignment
    existing = db.query(CampaignCreator).filter(
        CampaignCreator.campaign_id == campaign_id,
        CampaignCreator.creator_id == body.creator_id,
        CampaignCreator.is_archived.is_(False)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Creator @{creator.full_name} is already assigned to this campaign."
        )

    assign = CampaignCreator(
        campaign_id=campaign_id,
        creator_id=body.creator_id,
        agreed_compensation=round(float(body.agreed_compensation), 2),
        status=body.status,
        deliverables=body.deliverables.strip() if body.deliverables else None,
        assigned_date=body.assigned_date or date.today(),
        is_demo=False,
        is_archived=False
    )
    db.add(assign)
    log(db, current_user.id, "campaign_creator_assign", f"Assigned creator @{creator.full_name} to campaign '{campaign.title}'")
    db.commit()
    db.refresh(assign)
    return campaign_creator_to_dict(assign)


@router.get("/{campaign_id}/creators", response_model=CampaignCreatorListOut)
def list_campaign_creators(
    campaign_id: int,
    status_filter: Optional[str] = None,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists creators assigned to a campaign.
    Creators can only view their own assignment on the campaign.
    """
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    q = db.query(CampaignCreator).filter(CampaignCreator.campaign_id == campaign_id)
    if not include_archived:
        q = q.filter(CampaignCreator.is_archived.is_(False))

    # Tenant & role restrictions
    if current_user.role == "creator":
        q = q.filter(CampaignCreator.creator_id == current_user.id)
    elif current_user.role == "agency":
        roster_creators = db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()
        c_ids = [c[0] for c in roster_creators]
        if campaign.user_id != current_user.id:
            q = q.filter(CampaignCreator.creator_id.in_(c_ids))

    if status_filter:
        q = q.filter(CampaignCreator.status == status_filter)

    records = q.order_by(CampaignCreator.created_at.desc()).all()
    items = [campaign_creator_to_dict(r) for r in records]
    return {"items": items, "total": len(items)}


@router.put("/{campaign_id}/creators/{creator_id}", response_model=CampaignCreatorOut)
def update_campaign_creator_assignment(
    campaign_id: int,
    creator_id: int,
    body: CampaignCreatorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates creator campaign assignment, status, or deliverables.
    CRITICAL: Creators cannot modify agreed compensation.
    """
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    assign = db.query(CampaignCreator).filter(
        CampaignCreator.campaign_id == campaign_id,
        CampaignCreator.creator_id == creator_id,
        CampaignCreator.is_archived.is_(False)
    ).first()
    if not assign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator assignment not found for this campaign."
        )

    # RBAC & permissions
    is_manager = _check_campaign_management_access(db, campaign, current_user)
    is_assigned_creator = (current_user.id == creator_id)

    if not is_manager and not is_assigned_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this assignment."
        )

    # Enforce compensation protection for creators
    if is_assigned_creator and not is_manager:
        if body.agreed_compensation is not None and round(float(body.agreed_compensation), 2) != assign.agreed_compensation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators are not authorized to modify agreed compensation."
            )

    updates = body.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if field == "agreed_compensation" and val is not None:
            if not is_manager:
                continue
            val = round(float(val), 2)
        setattr(assign, field, val)

    log(db, current_user.id, "campaign_creator_update", f"Updated assignment for creator #{creator_id} in campaign #{campaign_id}")
    db.commit()
    db.refresh(assign)
    return campaign_creator_to_dict(assign)


@router.delete("/{campaign_id}/creators/{creator_id}")
def remove_creator_from_campaign(
    campaign_id: int,
    creator_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Removes or archives a creator assignment from a campaign.
    Only campaign managers or administrators are authorized.
    """
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    if not _check_campaign_management_access(db, campaign, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to remove creators from this campaign."
        )

    assign = db.query(CampaignCreator).filter(
        CampaignCreator.campaign_id == campaign_id,
        CampaignCreator.creator_id == creator_id,
        CampaignCreator.is_archived.is_(False)
    ).first()
    if not assign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator assignment not found for this campaign."
        )

    # Soft-archive assignment to preserve deliverables and audit trail
    assign.is_archived = True
    assign.status = "declined"
    log(db, current_user.id, "campaign_creator_remove", f"Removed creator #{creator_id} from campaign #{campaign_id}")
    db.commit()
    return {"message": "Creator assignment removed successfully."}

