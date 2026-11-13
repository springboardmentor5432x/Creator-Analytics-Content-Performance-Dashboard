from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Agency, AgencyCreator, Creator, SocialAccount, User
from ..roles import ADMIN, AGENCY
from ..schemas import AgencyCreatorAdd, AgencyOut, AgencyUpdate, CreatorOut

router = APIRouter(prefix="/api/agencies", tags=["Agency profile"])


def _own_agency(user: User, db: Session) -> Agency:
    agency = db.scalar(select(Agency).where(Agency.user_id == user.user_id))
    if agency is None:
        agency = Agency(user_id=user.user_id)
        db.add(agency)
        db.commit()
        db.refresh(agency)
    return agency


def _get_or_404(agency_id: int, db: Session) -> Agency:
    agency = db.get(Agency, agency_id)
    if agency is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Agency profile not found")
    return agency


def _apply(agency: Agency, data: AgencyUpdate, db: Session) -> Agency:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agency, field, value)
    db.commit()
    db.refresh(agency)
    return agency


@router.get("/me", response_model=AgencyOut)
def get_my_profile(user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)):
    return _own_agency(user, db)


@router.put("/me", response_model=AgencyOut)
def update_my_profile(
    data: AgencyUpdate, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    """Only the fields sent in the body are changed."""
    return _apply(_own_agency(user, db), data, db)


# ---- creators managed by the logged-in agency ----

@router.get("/me/overview")
def get_agency_overview(user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)):
    agency = _own_agency(user, db)
    stmt = (
        select(Creator)
        .join(AgencyCreator, AgencyCreator.creator_id == Creator.creator_id)
        .where(AgencyCreator.agency_id == agency.agency_id)
        .order_by(Creator.creator_id)
    )
    creators = db.scalars(stmt).all()

    if not creators:
        return {
            "has_creators": False,
            "total_creators": 0,
            "total_followers": 0,
            "total_views": 0,
            "kpis": [
                {"label": "Total Creators", "value": "0", "delta": None, "sub": "No creators linked", "icon": "audience", "tone": "violet"},
                {"label": "Total Followers", "value": "0", "delta": None, "sub": "Across linked accounts", "icon": "users", "tone": "indigo"},
                {"label": "Total Views", "value": "0", "delta": None, "sub": "Across linked accounts", "icon": "eye", "tone": "blue"},
                {"label": "Active Campaigns", "value": "0", "delta": None, "sub": "Campaigns module", "icon": "campaign", "tone": "rose"},
                {"label": "Total Revenue", "value": "₹0", "delta": None, "sub": "Revenue module", "icon": "wallet", "tone": "amber"},
            ],
            "creators": [],
            "platform_dist": [],
            "performance": [],
        }

    total_followers = 0
    total_views = 0
    platform_counts = {}
    creators_list = []

    for c in creators:
        c_followers = sum(a.followers for a in c.social_accounts if a.is_active)
        c_views = sum(a.total_views for a in c.social_accounts if a.is_active)
        total_followers += c_followers
        total_views += c_views

        active_accounts = [a for a in c.social_accounts if a.is_active]
        main_plat = active_accounts[0].platform.capitalize() if active_accounts else "YouTube"
        for a in active_accounts:
            p = (a.platform or "other").capitalize()
            platform_counts[p] = platform_counts.get(p, 0) + a.followers

        creators_list.append({
            "name": c.creator_name or (c.user.name if c.user else f"Creator #{c.creator_id}"),
            "platform": main_plat,
            "followers": f"{c_followers:,}" if c_followers < 1000000 else f"{round(c_followers/1000000, 1)}M",
            "views": f"{c_views:,}" if c_views < 1000000 else f"{round(c_views/1000000, 1)}M",
            "eng": "3.8%",
            "growth": "+5.2%",
        })

    tot_plat_followers = sum(platform_counts.values()) or 1
    platform_colors = {"Youtube": "#ef4444", "Instagram": "#d946a8", "Linkedin": "#2563eb"}
    platform_dist = [
        {"name": p, "value": round((cnt / tot_plat_followers) * 100), "color": platform_colors.get(p, "#6d4ae8")}
        for p, cnt in platform_counts.items()
    ]

    kpis = [
        {"label": "Total Creators", "value": str(len(creators)), "delta": None, "sub": "managed creators", "icon": "audience", "tone": "violet"},
        {"label": "Total Followers", "value": f"{total_followers:,}" if total_followers < 1000000 else f"{round(total_followers/1000000, 1)}M", "delta": None, "sub": "across all platforms", "icon": "users", "tone": "indigo"},
        {"label": "Total Views", "value": f"{total_views:,}" if total_views < 1000000 else f"{round(total_views/1000000, 1)}M", "delta": None, "sub": "across all videos", "icon": "eye", "tone": "blue"},
        {"label": "Active Campaigns", "value": "0", "delta": None, "sub": "Campaigns module", "icon": "campaign", "tone": "rose"},
        {"label": "Total Revenue", "value": "₹0", "delta": None, "sub": "Revenue module", "icon": "wallet", "tone": "amber"},
    ]

    return {
        "has_creators": True,
        "total_creators": len(creators),
        "total_followers": total_followers,
        "total_views": total_views,
        "kpis": kpis,
        "creators": creators_list,
        "platform_dist": platform_dist,
        "performance": [],
    }

@router.get("/me/creators", response_model=list[CreatorOut])
def list_my_creators(user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)):
    agency = _own_agency(user, db)
    stmt = (
        select(Creator)
        .join(AgencyCreator, AgencyCreator.creator_id == Creator.creator_id)
        .where(AgencyCreator.agency_id == agency.agency_id)
        .order_by(Creator.creator_id)
    )
    return db.scalars(stmt).all()


@router.post("/me/creators", response_model=CreatorOut, status_code=status.HTTP_201_CREATED)
def add_creator(
    data: AgencyCreatorAdd, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    agency = _own_agency(user, db)
    creator = db.get(Creator, data.creator_id)
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Creator not found")
    if db.get(AgencyCreator, (agency.agency_id, creator.creator_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This creator is already linked to your agency")
    db.add(AgencyCreator(agency_id=agency.agency_id, creator_id=creator.creator_id))
    db.commit()
    return creator


@router.delete("/me/creators/{creator_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_creator(
    creator_id: int, user: User = Depends(require_roles(AGENCY)), db: Session = Depends(get_db)
):
    agency = _own_agency(user, db)
    link = db.get(AgencyCreator, (agency.agency_id, creator_id))
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This creator is not linked to your agency")
    db.delete(link)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- by id (declared after /me routes so "me" is not read as an id) ----
@router.get("/{agency_id}", response_model=AgencyOut)
def get_agency(agency_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Allowed: the agency itself or an admin."""
    agency = _get_or_404(agency_id, db)
    if user.user_id != agency.user_id and user.role != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You cannot access this agency's profile")
    return agency


@router.put("/{agency_id}", response_model=AgencyOut)
def update_agency(
    agency_id: int, data: AgencyUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    agency = _get_or_404(agency_id, db)
    if user.user_id != agency.user_id and user.role != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You can only edit your own profile")
    return _apply(agency, data, db)
