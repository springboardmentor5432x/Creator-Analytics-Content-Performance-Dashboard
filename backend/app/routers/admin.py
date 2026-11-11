"""Administrator account management, governance overview and audit trail."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.database import get_db
from app.dependencies import require_roles
from app.models import (
    AgencyTeamMember,
    AuditLog,
    Campaign,
    Notification,
    User,
    WorkspaceAccess,
)
from app.profile_utils import ensure_role_profile, get_profile_values, get_role_profile
from app.schemas import (
    AdminResetPasswordRequest,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    RoleUpdateRequest,
    UserResponse,
)
from app.security import hash_password

router = APIRouter(prefix="/admin", tags=["Administrator"])

TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"


def _temporary_password(length: int = 16) -> str:
    body = "".join(secrets.choice(TEMP_PASSWORD_ALPHABET) for _ in range(length - 4))
    return f"{body}@A9"


def _active_admin_count(db: Session, exclude_id: int | None = None) -> int:
    query = db.query(func.count(User.id)).filter(
        User.role == "administrator", User.is_active.is_(True)
    )
    if exclude_id is not None:
        query = query.filter(User.id != exclude_id)
    return int(query.scalar() or 0)


def _detail(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "timezone": user.timezone,
        "date_format": user.date_format,
        **get_profile_values(db, user),
        "has_profile": get_role_profile(db, user) is not None,
    }


@router.get("/overview")
def admin_overview(
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    roles = {role: int(count) for role, count in role_rows}
    access_rows = db.query(WorkspaceAccess.status, func.count(WorkspaceAccess.id)).group_by(
        WorkspaceAccess.status
    ).all()
    access = {status_value: int(count) for status_value, count in access_rows}
    total_users = int(db.query(func.count(User.id)).scalar() or 0)
    active_users = int(db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0)
    recent_audit = (
        db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()
    )
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    administrators = roles.get("administrator", 0)
    distinct_roles = len([role for role, count in roles.items() if count])
    checklist = [
        {
            "key": "account_types",
            "title": "Create the correct account type",
            "complete": total_users > 1,
            "detail": f"{total_users} account{'s' if total_users != 1 else ''} provisioned across {distinct_roles} role{'s' if distinct_roles != 1 else ''}.",
        },
        {
            "key": "review_roles",
            "title": "Review roles",
            "complete": bool(db.query(AuditLog).filter(AuditLog.action.in_(("admin.role_changed", "admin.user_updated"))).first()),
            "detail": "Role changes are recorded in the audit trail.",
        },
        {
            "key": "protect_boundaries",
            "title": "Protect account boundaries",
            "complete": administrators >= 1,
            "detail": f"{administrators} active administrator account{'s' if administrators != 1 else ''}. Private creator analytics stay creator-owned.",
        },
    ]
    next_action = (
        "Invite an agency or creator account"
        if total_users <= 1
        else "Review pending collaboration requests"
        if access.get("pending", 0)
        else "Review the latest audit activity"
    )
    return {
        "totals": {
            "users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "administrators": administrators,
        },
        "roles": roles,
        "access": access,
        "checklist": checklist,
        "next_action": next_action,
        "recent_users": [_detail(db, user) for user in recent_users],
        "recent_activity": [
            {
                "id": event.id,
                "action": event.action,
                "actor_email": event.actor_email,
                "actor_role": event.actor_role,
                "target_type": event.target_type,
                "target_id": event.target_id,
                "created_at": event.created_at.isoformat(),
                "details": event.details or {},
            }
            for event in recent_audit
        ],
    }


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreateRequest,
    request: Request,
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """Create an account with an explicitly assigned role; administrator-only."""
    email = str(payload.email).lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    ensure_role_profile(
        db,
        user,
        payload.profile_name.strip() or payload.full_name.strip(),
        payload.focus_area.strip(),
    )
    record_audit(
        db,
        _admin,
        "admin.user_created",
        target_type="user",
        target_id=user.id,
        details={"email": email, "role": payload.role},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    q: str | None = Query(default=None, max_length=120),
    role: str | None = Query(default=None, max_length=30),
    account_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive)$"),
    limit: int = Query(default=100, ge=1, le=500),
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """List basic account metadata. Password hashes are never returned."""
    query = db.query(User)
    if q:
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(func.lower(User.email).like(term), func.lower(User.full_name).like(term))
        )
    if role:
        query = query.filter(User.role == role)
    if account_status == "active":
        query = query.filter(User.is_active.is_(True))
    elif account_status == "inactive":
        query = query.filter(User.is_active.is_(False))
    return query.order_by(User.id.asc()).limit(limit).all()


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return _detail(db, user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """Edit account metadata and, when supplied, the role."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    changes = payload.model_dump(exclude_unset=True)
    next_role = changes.pop("role", None)
    if next_role is not None and next_role != user.role:
        previous_role = user.role
        if user.id == admin.id and next_role != "administrator":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You cannot remove your own administrator role.",
            )
        if user.role == "administrator" and user.is_active and _active_admin_count(db, exclude_id=user.id) == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="At least one active administrator account must remain.",
            )
        ensure_role_profile(db, user)
        previous_profile = get_profile_values(db, user)
        user.role = next_role
        ensure_role_profile(
            db,
            user,
            previous_profile.get("profile_name") or user.full_name,
            previous_profile.get("focus_area") or "General",
            previous_profile.get("bio"),
        )
        record_audit(
            db,
            admin,
            "admin.role_changed",
            target_type="user",
            target_id=user.id,
            details={"email": user.email, "from": previous_role, "to": next_role},
            request=request,
        )

    email = changes.pop("email", None)
    if email is not None:
        email = str(email).lower().strip()
        if db.query(User).filter(User.email == email, User.id != user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
        user.email = email

    full_name = changes.pop("full_name", None)
    if full_name is not None:
        user.full_name = full_name.strip()

    ensure_role_profile(db, user)
    try:
        from app.profile_utils import update_role_profile

        update_role_profile(db, user, changes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    record_audit(
        db,
        admin,
        "admin.user_updated",
        target_type="user",
        target_id=user.id,
        details={"email": user.email, "fields": sorted(payload.model_fields_set)},
        request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    """Change a user's role; only an administrator may call this route."""
    return update_user(
        user_id,
        AdminUserUpdateRequest(role=payload.role),
        request,
        admin,
        db,
    )


@router.post("/users/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_active = True
    record_audit(
        db, admin, "admin.user_activated",
        target_type="user", target_id=user.id,
        details={"email": user.email}, request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You cannot deactivate your own account.")
    if user.role == "administrator" and user.is_active and _active_admin_count(db, exclude_id=user.id) == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="At least one active administrator account must remain.")
    user.is_active = False
    record_audit(
        db, admin, "admin.user_deactivated",
        target_type="user", target_id=user.id,
        details={"email": user.email}, request=request,
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: AdminResetPasswordRequest,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    temporary = payload.new_password or _temporary_password()
    user.hashed_password = hash_password(temporary)
    user.token_version = int(user.token_version or 0) + 1
    record_audit(
        db, admin, "admin.password_reset",
        target_type="user", target_id=user.id,
        details={"email": user.email}, request=request,
    )
    db.commit()
    return {
        "user_id": user.id,
        "email": user.email,
        "temporary_password": temporary,
        "message": "Share this temporary password securely. It is shown only once.",
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You cannot delete your own account.")
    if user.role == "administrator" and user.is_active and _active_admin_count(db, exclude_id=user.id) == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="At least one active administrator account must remain.")

    # Clean up rows that reference this account without an ORM cascade.
    from app.models import CreatorProfile

    creator_profile_ids = [
        profile_id
        for (profile_id,) in db.query(CreatorProfile.id).filter(CreatorProfile.user_id == user.id).all()
    ]
    access_query = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.collaborator_user_id == user.id
    )
    if creator_profile_ids:
        access_query = db.query(WorkspaceAccess).filter(
            (WorkspaceAccess.collaborator_user_id == user.id)
            | (WorkspaceAccess.creator_profile_id.in_(creator_profile_ids))
        )
    access_query.delete(synchronize_session=False)
    db.query(AgencyTeamMember).filter(
        (AgencyTeamMember.agency_user_id == user.id) | (AgencyTeamMember.member_user_id == user.id)
    ).delete(synchronize_session=False)
    db.query(Campaign).filter(Campaign.agency_user_id == user.id).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.user_id == user.id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.actor_user_id == user.id).update(
        {AuditLog.actor_user_id: None}, synchronize_session=False
    )
    details = {"email": user.email, "role": user.role}
    record_audit(
        db, admin, "admin.user_deleted",
        target_type="user", target_id=user.id,
        details=details, request=request,
    )
    db.delete(user)
    db.commit()
    return None


@router.get("/audit-logs")
def list_audit_logs(
    action: str | None = Query(default=None, max_length=80),
    actor_email: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=100, ge=1, le=500),
    _admin: User = Depends(require_roles("administrator")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.like(f"%{action}%"))
    if actor_email:
        query = query.filter(func.lower(AuditLog.actor_email).like(f"%{actor_email.lower()}%"))
    events = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "id": event.id,
                "action": event.action,
                "actor_user_id": event.actor_user_id,
                "actor_email": event.actor_email,
                "actor_role": event.actor_role,
                "target_type": event.target_type,
                "target_id": event.target_id,
                "details": event.details or {},
                "created_at": event.created_at.isoformat(),
            }
            for event in events
        ]
    }
