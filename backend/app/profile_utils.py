"""Role-aware profile helpers used by registration, administration and settings."""
from sqlalchemy.orm import Session

from app.models import AgencyProfile, CreatorProfile, MarketingTeamProfile, User


def get_role_profile(db: Session, user: User):
    if user.role == "creator":
        return db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
    if user.role == "agency":
        return db.query(AgencyProfile).filter(AgencyProfile.user_id == user.id).first()
    if user.role == "marketing_team":
        return db.query(MarketingTeamProfile).filter(MarketingTeamProfile.user_id == user.id).first()
    return None


def get_profile_values(db: Session, user: User) -> dict:
    profile = get_role_profile(db, user)
    if profile is None:
        return {"profile_name": None, "focus_area": None, "bio": None}
    if user.role == "creator":
        return {
            "profile_name": profile.display_name,
            "focus_area": profile.niche,
            "bio": profile.bio,
        }
    if user.role == "agency":
        return {
            "profile_name": profile.agency_name,
            "focus_area": profile.service_focus,
            "bio": profile.bio,
        }
    return {
        "profile_name": profile.team_name,
        "focus_area": profile.focus_area,
        "bio": profile.bio,
    }


def ensure_role_profile(
    db: Session,
    user: User,
    profile_name: str | None = None,
    focus_area: str | None = None,
    bio: str | None = None,
):
    """Create the profile table row that matches a user's current role.

    Existing records from a role change are retained rather than deleting analytics
    data. If a role-specific profile already exists, this helper leaves it intact.
    """
    if user.role == "administrator":
        return None

    legacy_creator_profile = None
    if user.role != "creator":
        # Prior project builds stored every signup as a CreatorProfile. When a
        # database is upgraded, reuse those display fields without treating that
        # old row as current-role analytics data.
        legacy_creator_profile = (
            db.query(CreatorProfile)
            .filter(CreatorProfile.user_id == user.id)
            .first()
        )
    fallback_name = legacy_creator_profile.display_name if legacy_creator_profile else user.full_name
    fallback_focus = legacy_creator_profile.niche if legacy_creator_profile else "General"
    name = (profile_name or fallback_name).strip() or user.full_name
    focus = (focus_area or fallback_focus).strip() or "General"
    if user.role == "creator":
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
        if profile is None:
            profile = CreatorProfile(user_id=user.id, display_name=name, niche=focus, bio=bio)
            db.add(profile)
        return profile
    if user.role == "agency":
        profile = db.query(AgencyProfile).filter(AgencyProfile.user_id == user.id).first()
        if profile is None:
            profile = AgencyProfile(user_id=user.id, agency_name=name, service_focus=focus, bio=bio)
            db.add(profile)
        return profile
    if user.role == "marketing_team":
        profile = db.query(MarketingTeamProfile).filter(MarketingTeamProfile.user_id == user.id).first()
        if profile is None:
            profile = MarketingTeamProfile(user_id=user.id, team_name=name, focus_area=focus, bio=bio)
            db.add(profile)
        return profile
    raise ValueError(f"Unsupported user role: {user.role}")


def update_role_profile(db: Session, user: User, changes: dict) -> None:
    profile = get_role_profile(db, user)
    if profile is None:
        profile = ensure_role_profile(db, user)
    if profile is None:
        if any(changes.get(key) is not None for key in ("profile_name", "focus_area", "bio")):
            raise ValueError("Administrator accounts do not have a creator or workspace profile.")
        return

    if user.role == "creator":
        mapping = {"profile_name": "display_name", "focus_area": "niche", "bio": "bio"}
    elif user.role == "agency":
        mapping = {"profile_name": "agency_name", "focus_area": "service_focus", "bio": "bio"}
    else:
        mapping = {"profile_name": "team_name", "focus_area": "focus_area", "bio": "bio"}

    for request_key, model_key in mapping.items():
        if request_key in changes:
            value = changes[request_key]
            if isinstance(value, str):
                value = value.strip()
            setattr(profile, model_key, value)
