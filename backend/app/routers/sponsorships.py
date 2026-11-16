"""Brand Sponsorships & Creator Financial Contracts Router (Phase 7.2).
Handles sponsorship creation, retrieval, updates, status filters, payment management,
strict tenant/creator isolation, and soft-archival for financial audit history.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Brand, Campaign, Sponsorship, AgencyCreator
from ..schemas import SponsorshipIn, SponsorshipUpdate, SponsorshipOut, SponsorshipListOut
from ..services import sponsorship_to_dict, log

router = APIRouter(prefix="/api/sponsorships", tags=["Brand Sponsorships"])


def _check_sponsorship_access(db: Session, s: Sponsorship, user: User, for_write: bool = False) -> bool:
    """Verifies whether current user is authorized to read or modify the sponsorship."""
    if user.role in ("admin", "administrator"):
        return True

    # Creator assigned to the sponsorship
    if s.creator_id == user.id:
        return True

    # Brand owner
    if s.brand and s.brand.user_id == user.id:
        return True

    # Campaign owner
    if s.campaign and s.campaign.user_id == user.id:
        return True

    # Agency representing the creator
    if user.role == "agency":
        is_roster = db.query(AgencyCreator).filter(
            AgencyCreator.agency_id == user.id,
            AgencyCreator.creator_id == s.creator_id
        ).first()
        if is_roster:
            return True

    return False


@router.post("", response_model=SponsorshipOut, status_code=status.HTTP_201_CREATED)
def create_sponsorship(
    body: SponsorshipIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new sponsorship contract between a brand, creator, and optional campaign.
    Validates related entities, ownership, and role authorization.
    """
    # 1. Validate Brand
    brand = db.get(Brand, body.brand_id)
    if not brand or brand.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found.")

    # 2. Validate Creator
    creator = db.get(User, body.creator_id)
    if not creator or creator.role != "creator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid creator_id: specified user does not have the 'creator' role."
        )

    # 3. Validate Campaign if supplied
    campaign = None
    if body.campaign_id:
        campaign = db.get(Campaign, body.campaign_id)
        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
        # If campaign has brand_id set, verify it matches
        if campaign.brand_id and campaign.brand_id != brand.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign is associated with a different brand profile."
            )

    # 4. RBAC Validation on creation
    if current_user.role == "creator":
        if body.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators can only create sponsorship records for their own account."
            )
        # Creators cannot mark newly created sponsorships as already 'paid'
        if body.payment_status == "paid":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators cannot self-authorize payment status as 'paid'."
            )
    elif current_user.role == "marketing":
        # Marketing user must own the brand or campaign
        if brand.user_id != current_user.id and (not campaign or campaign.user_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to create sponsorships for brands or campaigns you do not own."
            )
    elif current_user.role == "agency":
        # Agency must have the creator in their roster
        is_roster = db.query(AgencyCreator).filter(
            AgencyCreator.agency_id == current_user.id,
            AgencyCreator.creator_id == body.creator_id
        ).first()
        if not is_roster:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specified creator is not on your agency roster."
            )

    sponsorship = Sponsorship(
        brand_id=brand.id,
        campaign_id=campaign.id if campaign else None,
        creator_id=creator.id,
        amount=round(float(body.amount), 2),
        payment_status=body.payment_status,
        contract_status=body.contract_status,
        payment_due_date=body.payment_due_date,
        payment_date=body.payment_date,
        deliverable_summary=body.deliverable_summary.strip() if body.deliverable_summary else None,
        notes=body.notes.strip() if body.notes else None,
        is_demo=False,
        is_archived=False
    )
    db.add(sponsorship)
    log(db, current_user.id, "sponsorship_create", f"Created sponsorship of ${sponsorship.amount:,.2f} for creator @{creator.full_name}")
    db.commit()
    db.refresh(sponsorship)
    return sponsorship_to_dict(sponsorship)


@router.get("", response_model=SponsorshipListOut)
def list_sponsorships(
    payment_status: Optional[str] = None,
    contract_status: Optional[str] = None,
    brand_id: Optional[int] = None,
    campaign_id: Optional[int] = None,
    creator_id: Optional[int] = None,
    include_archived: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists sponsorships with filtering, financial aggregation, and strict tenant/role isolation.
    Creators only see their own sponsorships and payouts.
    """
    q = db.query(Sponsorship)
    if not include_archived:
        q = q.filter(Sponsorship.is_archived.is_(False))

    # Tenant isolation
    if current_user.role == "creator":
        if creator_id is not None and creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators are not permitted to view other creators' sponsorships or payouts."
            )
        q = q.filter(Sponsorship.creator_id == current_user.id)
    elif current_user.role == "marketing":
        # Marketing sees sponsorships on their brands or campaigns
        owned_brand_ids = db.query(Brand.id).filter(Brand.user_id == current_user.id)
        owned_camp_ids = db.query(Campaign.id).filter(Campaign.user_id == current_user.id)
        q = q.filter(or_(Sponsorship.brand_id.in_(owned_brand_ids), Sponsorship.campaign_id.in_(owned_camp_ids)))
        if creator_id:
            q = q.filter(Sponsorship.creator_id == creator_id)
    elif current_user.role == "agency":
        roster_creators = db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()
        c_ids = [c[0] for c in roster_creators]
        q = q.filter(Sponsorship.creator_id.in_(c_ids))
        if creator_id:
            if creator_id not in c_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Creator is not on your agency roster."
                )
            q = q.filter(Sponsorship.creator_id == creator_id)
    elif current_user.role in ("admin", "administrator"):
        if creator_id:
            q = q.filter(Sponsorship.creator_id == creator_id)

    # Optional filters
    if payment_status:
        q = q.filter(Sponsorship.payment_status == payment_status)
    if contract_status:
        q = q.filter(Sponsorship.contract_status == contract_status)
    if brand_id:
        q = q.filter(Sponsorship.brand_id == brand_id)
    if campaign_id:
        q = q.filter(Sponsorship.campaign_id == campaign_id)

    all_matches = q.all()
    total = len(all_matches)
    total_amount = round(sum(s.amount for s in all_matches), 2)
    paid_amount = round(sum(s.amount for s in all_matches if s.payment_status == "paid"), 2)
    pending_amount = round(sum(s.amount for s in all_matches if s.payment_status in ("pending", "processing")), 2)

    paginated = q.order_by(Sponsorship.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [sponsorship_to_dict(s) for s in paginated]

    return {
        "items": items,
        "total": total,
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "pending_amount": pending_amount,
    }


@router.get("/{sponsorship_id}", response_model=SponsorshipOut)
def get_sponsorship(
    sponsorship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single sponsorship record by ID. Enforces ownership and tenant isolation."""
    s = db.get(Sponsorship, sponsorship_id)
    if not s or (s.is_archived and current_user.role not in ("admin", "administrator")):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsorship record not found.")

    if not _check_sponsorship_access(db, s, current_user, for_write=False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this sponsorship record."
        )

    return sponsorship_to_dict(s)


@router.put("/{sponsorship_id}", response_model=SponsorshipOut)
def update_sponsorship(
    sponsorship_id: int,
    body: SponsorshipUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing sponsorship.
    CRITICAL: Creators cannot modify monetary amounts or self-authorize payment status as 'paid'.
    """
    s = db.get(Sponsorship, sponsorship_id)
    if not s or (s.is_archived and current_user.role not in ("admin", "administrator")):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsorship record not found.")

    if not _check_sponsorship_access(db, s, current_user, for_write=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this sponsorship record."
        )

    # Financial safety check for creators
    if current_user.role == "creator":
        if body.amount is not None and round(float(body.amount), 2) != s.amount:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators are not authorized to modify financial payment amounts."
            )
        if body.payment_status is not None and body.payment_status != s.payment_status:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators cannot self-authorize or change payment status."
            )

    updates = body.model_dump(exclude_unset=True)
    for field, val in updates.items():
        if field == "amount" and val is not None:
            val = round(float(val), 2)
        setattr(s, field, val)

    log(db, current_user.id, "sponsorship_update", f"Updated sponsorship record #{s.id}")
    db.commit()
    db.refresh(s)
    return sponsorship_to_dict(s)


@router.delete("/{sponsorship_id}")
def delete_sponsorship(
    sponsorship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Safely archives a sponsorship record to preserve financial and accounting history.
    Hard deletion is prohibited to ensure audit compliance.
    """
    s = db.get(Sponsorship, sponsorship_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sponsorship record not found.")

    # Creators cannot delete sponsorships
    if current_user.role == "creator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creators are not permitted to delete sponsorship contracts."
        )

    if not _check_sponsorship_access(db, s, current_user, for_write=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to archive this sponsorship."
        )

    # Soft-archive
    s.is_archived = True
    if s.payment_status != "paid":
        s.payment_status = "cancelled"
    s.contract_status = "cancelled"

    log(db, current_user.id, "sponsorship_archive", f"Archived sponsorship #{s.id} for audit preservation")
    db.commit()
    return {
        "status": "archived",
        "message": "Sponsorship record safely archived to preserve financial and accounting history."
    }

