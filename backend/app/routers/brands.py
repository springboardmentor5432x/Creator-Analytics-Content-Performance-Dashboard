"""Brand Management & Advertiser Profiles Router (Phase 7.2).
Handles brand creation, retrieval, updates, owner-level tenant isolation,
contact privacy masking for non-owners, and non-destructive archival.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Brand, Campaign, Sponsorship, AgencyCreator
from ..schemas import BrandIn, BrandUpdate, BrandOut, BrandListOut
from ..services import brand_to_dict, log

router = APIRouter(prefix="/api/brands", tags=["Brand Partnerships"])


def _check_brand_access(db: Session, brand: Brand, user: User, for_write: bool = False) -> bool:
    """Verifies whether the current user is authorized to read or write the brand."""
    if user.role in ("admin", "administrator"):
        return True

    # Brand owner always has full access
    if brand.user_id == user.id:
        return True

    # For write actions, only owner or admin is allowed
    if for_write:
        return False

    # For read actions:
    # 1. Marketing user who owns campaigns collaborating with this brand
    if user.role == "marketing":
        linked_camp = db.query(Campaign).filter(Campaign.brand_id == brand.id, Campaign.user_id == user.id).first()
        if linked_camp:
            return True

    # 2. Creator who has sponsorships or campaigns with this brand
    if user.role == "creator":
        has_sponsorship = db.query(Sponsorship).filter(Sponsorship.brand_id == brand.id, Sponsorship.creator_id == user.id).first()
        if has_sponsorship:
            return True

    # 3. Agency whose roster creator has sponsorships with this brand
    if user.role == "agency":
        roster_creators = db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == user.id).all()
        c_ids = [c[0] for c in roster_creators]
        if c_ids:
            has_roster_spons = db.query(Sponsorship).filter(Sponsorship.brand_id == brand.id, Sponsorship.creator_id.in_(c_ids)).first()
            if has_roster_spons:
                return True

    return False


@router.post("", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(
    body: BrandIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new Brand profile under the authenticated user.
    Prevents duplicate brand names for the same owner.
    """
    # Enforce uniqueness per user
    existing = db.query(Brand).filter(
        Brand.user_id == current_user.id,
        Brand.name == body.name.strip(),
        Brand.is_archived.is_(False)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A brand profile named '{body.name}' already exists in your account."
        )

    brand = Brand(
        user_id=current_user.id,
        name=body.name.strip(),
        description=body.description.strip() if body.description else None,
        industry=body.industry.strip(),
        website=body.website.strip() if body.website else None,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone.strip() if body.contact_phone else None,
        contact_person=body.contact_person.strip() if body.contact_person else None,
        is_demo=False,
        is_archived=False
    )
    db.add(brand)
    log(db, current_user.id, "brand_create", f"Created brand profile '{brand.name}'")
    db.commit()
    db.refresh(brand)
    return brand_to_dict(brand, mask_contacts=False)


@router.get("", response_model=BrandListOut)
def list_brands(
    search: Optional[str] = None,
    industry: Optional[str] = None,
    include_archived: bool = False,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists brand profiles accessible to the user with pagination, search, and contact information privacy.
    Non-owners have contact details masked.
    """
    q = db.query(Brand)
    if not include_archived:
        q = q.filter(Brand.is_archived.is_(False))

    # Tenant filtering
    if current_user.role not in ("admin", "administrator"):
        if current_user.role == "marketing":
            q = q.filter(Brand.user_id == current_user.id)
        elif current_user.role == "agency":
            roster_creators = db.query(AgencyCreator.creator_id).filter(AgencyCreator.agency_id == current_user.id).all()
            c_ids = [c[0] for c in roster_creators]
            brand_ids_subq = db.query(Sponsorship.brand_id).filter(Sponsorship.creator_id.in_(c_ids))
            q = q.filter(or_(Brand.user_id == current_user.id, Brand.id.in_(brand_ids_subq)))
        elif current_user.role == "creator":
            spons_brand_ids = db.query(Sponsorship.brand_id).filter(Sponsorship.creator_id == current_user.id)
            q = q.filter(or_(Brand.user_id == current_user.id, Brand.id.in_(spons_brand_ids)))

    if search:
        s = f"%{search.strip()}%"
        q = q.filter(or_(Brand.name.ilike(s), Brand.industry.ilike(s), Brand.description.ilike(s)))

    if industry:
        q = q.filter(Brand.industry.ilike(f"%{industry.strip()}%"))

    total = q.count()
    brands = q.order_by(Brand.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for b in brands:
        is_owner = (b.user_id == current_user.id or current_user.role in ("admin", "administrator"))
        items.append(brand_to_dict(b, mask_contacts=not is_owner))

    return {"items": items, "total": total}


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(
    brand_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves a single brand profile by ID. Enforces ownership and masks private contacts for non-owners."""
    brand = db.get(Brand, brand_id)
    if not brand or (brand.is_archived and current_user.role not in ("admin", "administrator")):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found.")

    if not _check_brand_access(db, brand, current_user, for_write=False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this brand profile."
        )

    is_owner = (brand.user_id == current_user.id or current_user.role in ("admin", "administrator"))
    return brand_to_dict(brand, mask_contacts=not is_owner)


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: int,
    body: BrandUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates an existing brand profile. Only the owner or an administrator is authorized."""
    brand = db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found.")

    if not _check_brand_access(db, brand, current_user, for_write=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this brand profile."
        )

    for field, val in body.model_dump(exclude_unset=True).items():
        if val is not None and isinstance(val, str):
            val = val.strip()
        setattr(brand, field, val)

    log(db, current_user.id, "brand_update", f"Updated brand profile '{brand.name}'")
    db.commit()
    db.refresh(brand)
    return brand_to_dict(brand, mask_contacts=False)


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Safely deletes or archives a brand profile.
    If the brand has linked sponsorships or campaigns, it is soft-archived to protect financial history.
    """
    brand = db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found.")

    if not _check_brand_access(db, brand, current_user, for_write=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this brand profile."
        )

    # Check financial and campaign history
    has_campaigns = db.query(Campaign).filter(Campaign.brand_id == brand.id).first()
    has_sponsorships = db.query(Sponsorship).filter(Sponsorship.brand_id == brand.id).first()

    if has_campaigns or has_sponsorships:
        # Soft-archive to preserve audit trail and financial history
        brand.is_archived = True
        log(db, current_user.id, "brand_archive", f"Safely archived brand '{brand.name}' with historical campaigns/sponsorships")
        db.commit()
        return {
            "status": "archived",
            "message": "Brand profile has associated campaigns or sponsorships and was safely archived to preserve financial records."
        }

    # Hard deletion safe only when no related financial records exist
    log(db, current_user.id, "brand_delete", f"Deleted brand profile '{brand.name}'")
    db.delete(brand)
    db.commit()
    return {
        "status": "deleted",
        "message": "Brand profile deleted successfully."
    }

