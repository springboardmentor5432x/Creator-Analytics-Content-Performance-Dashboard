from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.database import get_db
from app.dependencies import get_current_user
from app.models import AuditLog, AgencyProfile, CreatorProfile, User
from app.profile_utils import ensure_role_profile, get_profile_values, get_role_profile, update_role_profile
from app.schemas import (
    AccountPreferencesRequest,
    AccountProfileResponse,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserResponse,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/account", tags=["Account settings"])

DEFAULT_NOTIFICATION_PREFERENCES = {
    "access_requests": True,
    "access_decisions": True,
    "reports": True,
    "revenue": True,
    "sync_failures": True,
    "security": True,
}


def _profile_attributes(db: Session, user: User) -> dict:
    """Return safe profile fields; never includes credentials or OAuth tokens."""
    profile = get_role_profile(db, user)
    data: dict = {
        "avatar_url": user.avatar_url,
        "phone": user.phone,
        "website": user.website,
        "country": user.country,
        "address": user.address,
        "business_email": getattr(profile, "business_email", None),
        "contact_number": getattr(profile, "contact_number", None),
        "social_links": getattr(profile, "social_links", None) or {},
    }
    if isinstance(profile, AgencyProfile):
        data.update({
            "avatar_url": user.avatar_url or profile.logo_url,
            "business_email": profile.business_email or user.email,
            "contact_number": profile.contact_number or user.phone,
            "website": user.website or profile.website,
            "country": user.country or profile.country,
            "address": user.address or profile.address,
        })
    elif isinstance(profile, CreatorProfile):
        data.update({
            "avatar_url": user.avatar_url or profile.avatar_url,
            "website": user.website or profile.website,
            "country": user.country or profile.country,
        })
    return data


def response_for(db: Session, user: User) -> dict:
    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at,
        "timezone": user.timezone,
        "date_format": user.date_format,
        "notification_preferences": user.notification_preferences or {},
        "last_login_at": user.last_login_at,
        **get_profile_values(db, user),
        **_profile_attributes(db, user),
    }


@router.get("/profile", response_model=AccountProfileResponse)
def read_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_role_profile(db, user)
    db.commit()
    db.refresh(user)
    return response_for(db, user)


@router.patch("/profile", response_model=AccountProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    full_name = changes.pop("full_name", None)
    if full_name is not None:
        user.full_name = full_name.strip()

    user_fields = ("avatar_url", "phone", "website", "country", "address")
    for field in user_fields:
        if field in changes:
            value = changes.pop(field)
            setattr(user, field, value.strip() if isinstance(value, str) else value)

    # Agency-specific fields map to the agency profile; the generic profile
    # update helper only understands profile_name/focus_area/bio.
    profile = get_role_profile(db, user)
    if isinstance(profile, AgencyProfile):
        for field in ("business_email", "contact_number"):
            if field in changes:
                value = changes.pop(field)
                setattr(profile, field, value.strip() if isinstance(value, str) else value)
        for field in ("logo_url",):
            if field in changes:
                setattr(profile, field, changes.pop(field))
        # Keep the agency profile's contact fields aligned with the account.
        profile.website = user.website or profile.website
        profile.country = user.country or profile.country
        profile.address = user.address or profile.address
        profile.contact_number = profile.contact_number or user.phone
    if isinstance(profile, CreatorProfile):
        if "social_links" in changes:
            profile.social_links = changes.pop("social_links") or {}
        profile.avatar_url = user.avatar_url or profile.avatar_url
        profile.website = user.website or profile.website
        profile.country = user.country or profile.country
    else:
        changes.pop("social_links", None)

    try:
        update_role_profile(db, user, changes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    record_audit(
        db,
        user,
        "account.profile_updated",
        target_type="user",
        target_id=user.id,
        details={"fields": sorted(payload.model_fields_set)},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return response_for(db, user)


@router.post("/password", response_model=TokenResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a new password that differs from the current password.")
    user.hashed_password = hash_password(payload.new_password)
    # Rotating the session version signs out every previously issued token so
    # a stolen session cannot survive a credential change. The current device
    # receives a freshly signed token in the response.
    user.token_version = int(user.token_version or 0) + 1
    record_audit(
        db,
        user,
        "account.password_changed",
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        user=UserResponse.model_validate(user),
    )


@router.get("/preferences")
def read_preferences(user: User = Depends(get_current_user)):
    preferences = {**DEFAULT_NOTIFICATION_PREFERENCES, **(user.notification_preferences or {})}
    return {
        "timezone": user.timezone,
        "date_format": user.date_format,
        "notification_preferences": preferences,
    }


@router.patch("/preferences")
def update_preferences(
    payload: AccountPreferencesRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    if "timezone" in changes and changes["timezone"] is not None:
        user.timezone = changes["timezone"].strip() or "UTC"
    if "date_format" in changes and changes["date_format"] is not None:
        user.date_format = changes["date_format"]
    if "notification_preferences" in changes and changes["notification_preferences"] is not None:
        user.notification_preferences = {
            **DEFAULT_NOTIFICATION_PREFERENCES,
            **{str(k): bool(v) for k, v in changes["notification_preferences"].items()},
        }
    record_audit(
        db,
        user,
        "account.preferences_updated",
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return read_preferences(user)


@router.get("/login-activity")
def login_activity(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = (
        db.query(AuditLog)
        .filter(
            AuditLog.actor_user_id == user.id,
            AuditLog.action.in_(
                (
                    "auth.login", "auth.login_failed", "auth.logout",
                    "account.password_changed", "account.sessions_revoked",
                )
            ),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(max(1, min(int(limit), 100)))
        .all()
    )
    return {
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "events": [
            {
                "id": event.id,
                "action": event.action,
                "created_at": event.created_at.isoformat(),
                "ip": (event.details or {}).get("ip"),
            }
            for event in events
        ],
    }


@router.get("/sessions")
def sessions(user: User = Depends(get_current_user)):
    """Return the information this stateless JWT deployment can verify.

    Individual tokens are not stored, so the API reports the current token
    generation rather than inventing a device list.
    """
    return {
        "session_version": int(user.token_version or 0),
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "note": "CreatorIQ uses signed tokens. Rotating the session version immediately signs out all other devices.",
    }


@router.post("/sessions/logout-others")
def logout_other_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.token_version = int(user.token_version or 0) + 1
    record_audit(
        db,
        user,
        "account.sessions_revoked",
        target_type="user",
        target_id=user.id,
        request=request,
    )
    db.commit()
    db.refresh(user)
    return {
        "access_token": create_access_token(user.id, user.token_version),
        "token_type": "bearer",
        "message": "All other sessions have been signed out.",
    }
