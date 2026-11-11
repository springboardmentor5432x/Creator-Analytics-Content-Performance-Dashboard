"""Consent-based collaboration for Creator, Agency, Marketing Team, and Admin roles."""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, aliased

from app.access_policy import (
    DEFAULT_PERMISSIONS,
    PERMISSION_KEYS,
    WORKSPACE_PERMISSIONS,
    clean_permissions,
    effective_permissions,
    has_permission,
)
from app.audit import record_audit
from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import (
    AccountMetric,
    AudienceInsight,
    ContentMetric,
    ContentPost,
    CreatorProfile,
    Notification,
    RevenueRecord,
    SocialAccount,
    User,
    WorkspaceAccess,
)
from app.notify import create_notification
from app.schemas import WorkspaceAccessRequest, WorkspacePermissionsRequest

router = APIRouter(prefix="/workspace", tags=["Role workspaces and creator sharing"])

COLLABORATOR_ROLES = {"agency", "marketing_team"}
ALL_CONTENT_METRICS = ("views", "likes", "comments", "shares", "saves", "watch_time_seconds", "reach", "impressions")
INTERACTION_FIELDS = {"likes", "comments", "shares", "saves"}


def _creator_profile(db: Session, user: User) -> CreatorProfile:
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).one_or_none()
    if profile is None:
        raise HTTPException(status_code=403, detail="A Creator profile is required for this action.")
    return profile


def _notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    *,
    category: str,
    link: str | None = None,
    pref_key: str | None = None,
) -> None:
    recipient = db.query(User).filter(User.id == user_id).one_or_none()
    if recipient is None:
        return
    create_notification(
        db,
        user=recipient,
        title=title,
        message=message,
        category=category,
        link=link,
        pref_key=pref_key,
    )


def _notify_creator(
    db: Session,
    profile: CreatorProfile,
    title: str,
    message: str,
    *,
    category: str,
    link: str | None = None,
    pref_key: str | None = None,
) -> None:
    create_notification(
        db,
        profile=profile,
        title=title,
        message=message,
        category=category,
        link=link,
        pref_key=pref_key,
    )


def _audit_access(db: Session, actor: User, action: str, access: WorkspaceAccess, request: Request | None, details: dict | None = None) -> None:
    record_audit(
        db,
        actor,
        action,
        target_type="workspace_access",
        target_id=access.id,
        details={
            "creator_profile_id": access.creator_profile_id,
            "collaborator_user_id": access.collaborator_user_id,
            "status": access.status,
            **(details or {}),
        },
        request=request,
    )


def _access_data(access: WorkspaceAccess, creator: User, collaborator: User) -> dict:
    granted = clean_permissions(access.granted_permissions)
    requested = clean_permissions(access.requested_permissions)
    return {
        "id": access.id,
        "status": access.status,
        "note": access.request_note,
        "created_at": access.created_at.isoformat(),
        "updated_at": access.updated_at.isoformat(),
        "decided_at": access.decided_at.isoformat() if access.decided_at else None,
        "last_accessed_at": access.last_accessed_at.isoformat() if access.last_accessed_at else None,
        "access_count": access.access_count,
        "requested_permissions": requested or list(DEFAULT_PERMISSIONS),
        "granted_permissions": granted,
        "effective_permissions": sorted(effective_permissions(access.granted_permissions)),
        "creator": {
            "id": creator.id,
            "name": creator.full_name,
            "email": creator.email,
        },
        "collaborator": {
            "id": collaborator.id,
            "name": collaborator.full_name,
            "email": collaborator.email,
            "role": collaborator.role,
        },
    }


def _joined_access_rows(db: Session, filters, limit: int | None = None):
    creator_user = aliased(User)
    collaborator = aliased(User)
    query = (
        db.query(WorkspaceAccess, CreatorProfile, creator_user, collaborator)
        .join(CreatorProfile, WorkspaceAccess.creator_profile_id == CreatorProfile.id)
        .join(creator_user, CreatorProfile.user_id == creator_user.id)
        .join(collaborator, WorkspaceAccess.collaborator_user_id == collaborator.id)
        .filter(*filters)
        .order_by(WorkspaceAccess.updated_at.desc())
    )
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def _row_data(row) -> dict:
    access, _profile, creator, collaborator = row
    return _access_data(access, creator, collaborator)


def _governance_row_data(row) -> dict:
    """Administrators see collaboration status, never private creator details."""
    access, _profile, creator, collaborator = row
    data = _access_data(access, creator, collaborator)
    data.pop("note", None)
    return data


@router.get("/permissions")
def permission_catalog(_user: User = Depends(get_current_user)):
    return {
        "permissions": list(WORKSPACE_PERMISSIONS),
        "default_permissions": list(DEFAULT_PERMISSIONS),
    }


@router.get("/overview")
def workspace_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == "creator":
        profile = _creator_profile(db, user)
        counts = Counter(
            status_value
            for (status_value,) in db.query(WorkspaceAccess.status)
            .filter(WorkspaceAccess.creator_profile_id == profile.id)
            .all()
        )
        return {
            "role": user.role,
            "approved": counts["approved"],
            "pending": counts["pending"],
            "total": sum(counts.values()),
            "revoked": counts["revoked"] + counts["cancelled"],
            "rejected": counts["rejected"],
            "privacy_status": "protected",
        }
    if user.role in COLLABORATOR_ROLES:
        counts = Counter(
            status_value
            for (status_value,) in db.query(WorkspaceAccess.status)
            .filter(WorkspaceAccess.collaborator_user_id == user.id)
            .all()
        )
        approved_rows = _joined_access_rows(
            db,
            [WorkspaceAccess.collaborator_user_id == user.id, WorkspaceAccess.status == "approved"],
        )
        connected_accounts = 0
        for _access, profile, _creator, _collaborator in approved_rows:
            connected_accounts += (
                db.query(SocialAccount)
                .filter(
                    SocialAccount.creator_profile_id == profile.id,
                    SocialAccount.is_connected.is_(True),
                )
                .count()
            )
        activity = [
            {
                "id": access.id,
                "status": access.status,
                "creator_name": creator.full_name,
                "updated_at": access.updated_at.isoformat(),
            }
            for access, _profile, creator, _collaborator in _joined_access_rows(
                db, [WorkspaceAccess.collaborator_user_id == user.id], limit=8
            )
        ]
        return {
            "role": user.role,
            "approved": counts["approved"],
            "pending": counts["pending"],
            "total": sum(counts.values()),
            "rejected": counts["rejected"],
            "revoked": counts["revoked"] + counts["cancelled"],
            "connected_accounts": connected_accounts,
            "active_collaborations": counts["approved"],
            "recent_activity": activity,
        }
    if user.role == "administrator":
        role_counts = Counter(role for (role,) in db.query(User.role).all())
        access_counts = Counter(status_value for (status_value,) in db.query(WorkspaceAccess.status).all())
        return {"role": user.role, "users": dict(role_counts), "access": dict(access_counts)}
    raise HTTPException(status_code=403, detail="Unsupported workspace role.")


@router.get("/requests")
def list_workspace_requests(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == "creator":
        profile = _creator_profile(db, user)
        filters = [WorkspaceAccess.creator_profile_id == profile.id]
        direction = "incoming"
    elif user.role in COLLABORATOR_ROLES:
        filters = [WorkspaceAccess.collaborator_user_id == user.id]
        direction = "outgoing"
    else:
        raise HTTPException(status_code=403, detail="This role cannot manage creator access requests.")
    if status_filter:
        filters.append(WorkspaceAccess.status == status_filter)
    rows = _joined_access_rows(db, filters)
    return {"direction": direction, "requests": [_row_data(row) for row in rows]}


@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_workspace_request(
    payload: WorkspaceAccessRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency", "marketing_team")),
):
    creator = db.query(User).filter(func.lower(User.email) == payload.creator_email.lower()).one_or_none()
    if creator is None or creator.role != "creator":
        raise HTTPException(status_code=404, detail="No Creator account exists for that email address.")
    profile = _creator_profile(db, creator)
    access = (
        db.query(WorkspaceAccess)
        .filter(
            WorkspaceAccess.creator_profile_id == profile.id,
            WorkspaceAccess.collaborator_user_id == user.id,
        )
        .one_or_none()
    )
    if access is not None and access.status in {"pending", "approved"}:
        raise HTTPException(status_code=409, detail="An active access request already exists for this Creator.")
    requested = clean_permissions(payload.permissions) or list(DEFAULT_PERMISSIONS)
    note = payload.note.strip() if payload.note else None
    if access is None:
        access = WorkspaceAccess(
            creator_profile_id=profile.id,
            collaborator_user_id=user.id,
            collaborator_role=user.role,
            request_note=note,
            requested_permissions=requested,
            granted_permissions=[],
        )
        db.add(access)
    else:
        access.status = "pending"
        access.collaborator_role = user.role
        access.request_note = note
        access.requested_permissions = requested
        access.granted_permissions = []
        access.decided_at = None
    db.flush()
    _notify_creator(
        db,
        profile,
        "New agency access request",
        f"{user.full_name} requested access to {len(requested)} workspace permission(s).",
        category="access",
        link="Shared access",
        pref_key="access_requests",
    )
    _audit_access(db, user, "workspace.request_created", access, request, {"requested_permissions": requested})
    db.commit()
    db.refresh(access)
    return _access_data(access, creator, user)


def _creator_owned_access(db: Session, access_id: int, user: User) -> WorkspaceAccess:
    profile = _creator_profile(db, user)
    access = db.query(WorkspaceAccess).filter(WorkspaceAccess.id == access_id, WorkspaceAccess.creator_profile_id == profile.id).one_or_none()
    if access is None:
        raise HTTPException(status_code=404, detail="Access request not found.")
    return access


def _collaborator_owned_access(db: Session, access_id: int, user: User) -> WorkspaceAccess:
    access = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.id == access_id,
        WorkspaceAccess.collaborator_user_id == user.id,
    ).one_or_none()
    if access is None:
        raise HTTPException(status_code=404, detail="Access request not found.")
    return access


def _access_users(db: Session, access: WorkspaceAccess) -> tuple[User, User]:
    profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one()
    creator = db.query(User).filter(User.id == profile.user_id).one()
    collaborator = db.query(User).filter(User.id == access.collaborator_user_id).one()
    return creator, collaborator


@router.post("/requests/{access_id}/approve")
def approve_workspace_request(
    access_id: int,
    request: Request,
    payload: WorkspacePermissionsRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    access = _creator_owned_access(db, access_id, user)
    if access.status == "approved":
        raise HTTPException(status_code=409, detail="This request is already approved.")
    if access.status not in {"pending", "rejected", "revoked", "cancelled", None}:
        raise HTTPException(status_code=409, detail="Only pending requests can be approved.")
    selected = clean_permissions(payload.permissions) if payload and payload.permissions else clean_permissions(access.requested_permissions)
    if not selected:
        selected = list(DEFAULT_PERMISSIONS)
    access.status = "approved"
    access.granted_permissions = selected
    access.decided_at = datetime.now(timezone.utc)
    creator, collaborator = _access_users(db, access)
    _notify_user(
        db,
        collaborator.id,
        "Creator access approved",
        f"{creator.full_name} approved your workspace request.",
        category="access",
        link="Creator access",
        pref_key="access_decisions",
    )
    _audit_access(db, user, "workspace.request_approved", access, request, {"granted_permissions": selected})
    db.commit()
    db.refresh(access)
    return {"id": access.id, "status": access.status, "granted_permissions": access.granted_permissions}


@router.post("/requests/{access_id}/reject")
def reject_workspace_request(
    access_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    access = _creator_owned_access(db, access_id, user)
    if access.status != "pending":
        raise HTTPException(status_code=409, detail="Only pending requests can be rejected.")
    access.status = "rejected"
    access.decided_at = datetime.now(timezone.utc)
    creator, collaborator = _access_users(db, access)
    _notify_user(
        db, collaborator.id, "Creator access rejected",
        f"{creator.full_name} declined your workspace request.",
        category="access", link="Creator access", pref_key="access_decisions",
    )
    _audit_access(db, user, "workspace.request_rejected", access, request)
    db.commit()
    return {"id": access.id, "status": access.status}


@router.post("/requests/{access_id}/revoke")
def revoke_workspace_access(
    access_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    access = db.query(WorkspaceAccess).filter(WorkspaceAccess.id == access_id).one_or_none()
    if access is None:
        raise HTTPException(status_code=404, detail="Access request not found.")
    is_creator_owner = user.role == "creator" and access.creator_profile_id == _creator_profile(db, user).id
    is_collaborator_owner = user.role in COLLABORATOR_ROLES and access.collaborator_user_id == user.id
    if not (is_creator_owner or is_collaborator_owner):
        raise HTTPException(status_code=403, detail="You cannot revoke this access request.")
    access.status = "revoked"
    access.decided_at = datetime.now(timezone.utc)
    creator, collaborator = _access_users(db, access)
    if is_creator_owner:
        _notify_user(
            db, collaborator.id, "Creator access revoked",
            f"{creator.full_name} revoked your workspace access. Previously granted permissions no longer apply.",
            category="access", link="Creator access", pref_key="access_decisions",
        )
    else:
        profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one()
        _notify_creator(
            db, profile, "Agency access withdrawn",
            f"{collaborator.full_name} withdrew their workspace access.",
            category="access", link="Shared access", pref_key="access_decisions",
        )
    _audit_access(db, user, "workspace.access_revoked", access, request, {"revoked_by": user.role})
    db.commit()
    return {"id": access.id, "status": access.status}


@router.post("/requests/{access_id}/cancel")
def cancel_workspace_request(
    access_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency", "marketing_team")),
):
    access = _collaborator_owned_access(db, access_id, user)
    if access.status != "pending":
        raise HTTPException(status_code=409, detail="Only pending requests can be cancelled.")
    access.status = "cancelled"
    access.decided_at = datetime.now(timezone.utc)
    profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one()
    _notify_creator(
        db, profile, "Access request withdrawn",
        f"{user.full_name} cancelled their pending workspace request.",
        category="access", link="Shared access", pref_key="access_requests",
    )
    _audit_access(db, user, "workspace.request_cancelled", access, request)
    db.commit()
    return {"id": access.id, "status": access.status}


@router.patch("/requests/{access_id}/permissions")
def update_workspace_permissions(
    access_id: int,
    payload: WorkspacePermissionsRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    access = _creator_owned_access(db, access_id, user)
    if access.status != "approved":
        raise HTTPException(status_code=409, detail="Permissions can only be changed for an approved collaboration.")
    selected = clean_permissions(payload.permissions)
    access.granted_permissions = selected
    creator, collaborator = _access_users(db, access)
    _notify_user(
        db, collaborator.id, "Workspace permissions updated",
        f"{creator.full_name} updated the permissions for your workspace access.",
        category="access", link="Creator access", pref_key="access_decisions",
    )
    _audit_access(db, user, "workspace.permissions_updated", access, request, {"granted_permissions": selected})
    db.commit()
    return {"id": access.id, "granted_permissions": access.granted_permissions}


@router.post("/requests/{access_id}/request-permissions")
def request_additional_permissions(
    access_id: int,
    payload: WorkspacePermissionsRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency", "marketing_team")),
):
    access = _collaborator_owned_access(db, access_id, user)
    requested = clean_permissions(payload.permissions)
    if not requested:
        raise HTTPException(status_code=422, detail="Select at least one permission.")
    access.requested_permissions = requested
    profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one()
    _notify_creator(
        db, profile, "Additional permissions requested",
        f"{user.full_name} requested an updated permission set for your workspace.",
        category="access", link="Shared access", pref_key="access_requests",
    )
    _audit_access(db, user, "workspace.permissions_requested", access, request, {"requested_permissions": requested})
    db.commit()
    return {"id": access.id, "requested_permissions": access.requested_permissions}


@router.get("/clients")
def list_approved_creator_clients(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency", "marketing_team")),
):
    rows = _joined_access_rows(db, [WorkspaceAccess.collaborator_user_id == user.id, WorkspaceAccess.status == "approved"])
    clients = []
    for access, profile, creator, _collaborator in rows:
        permissions = effective_permissions(access.granted_permissions)
        accounts = db.query(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
        content_count = db.query(ContentPost).join(SocialAccount).filter(
            SocialAccount.creator_profile_id == profile.id
        ).count() if "content" in permissions else None
        clients.append({
            "access_id": access.id,
            "creator_profile_id": profile.id,
            "name": creator.full_name,
            "email": creator.email,
            "profile_name": profile.display_name if "profile" in permissions else None,
            "niche": profile.niche if "profile" in permissions else None,
            "followers": sum(account.followers_count or 0 for account in accounts) if "followers" in permissions else None,
            "platforms": len(accounts) if permissions & {"platforms", "followers"} else None,
            "content_items": content_count,
            "granted_permissions": sorted(permissions),
            "last_accessed_at": access.last_accessed_at.isoformat() if access.last_accessed_at else None,
            "approved_at": access.decided_at.isoformat() if access.decided_at else None,
        })
    return {"clients": clients}


def _content_summary(db: Session, profile: CreatorProfile, days: int = 30) -> dict:
    start = date.today() - timedelta(days=days - 1)
    rows = (
        db.query(ContentMetric, ContentPost, SocialAccount)
        .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(SocialAccount.creator_profile_id == profile.id, ContentMetric.recorded_on >= start)
        .all()
    )
    totals = Counter()
    engagement_rates: list[float] = []
    for metric, _post, _account in rows:
        available = set(metric.metrics_available or ALL_CONTENT_METRICS)
        for field in ("views", "likes", "comments", "shares", "saves", "reach", "impressions", "watch_time_seconds"):
            if field in available:
                totals[field] += int(getattr(metric, field) or 0)
        if INTERACTION_FIELDS & available:
            engagement_rates.append(metric.engagement_rate)
    return {
        "period_days": days,
        "views": totals["views"],
        "likes": totals["likes"],
        "comments": totals["comments"],
        "shares": totals["shares"],
        "saves": totals["saves"],
        "reach": totals["reach"],
        "impressions": totals["impressions"],
        "watch_time_seconds": totals["watch_time_seconds"],
        "engagements": totals["likes"] + totals["comments"] + totals["shares"] + totals["saves"],
        "engagement_rate": round(sum(engagement_rates) / len(engagement_rates), 2) if engagement_rates else None,
    }


@router.get("/clients/{access_id}")
def approved_creator_workspace(
    access_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("agency", "marketing_team")),
):
    access = _collaborator_owned_access(db, access_id, user)
    if access.status != "approved":
        raise HTTPException(status_code=403, detail="Creator consent is required before this workspace can be opened.")
    profile = db.query(CreatorProfile).filter(CreatorProfile.id == access.creator_profile_id).one()
    creator = db.query(User).filter(User.id == profile.user_id).one()
    permissions = effective_permissions(access.granted_permissions)

    accounts = db.query(SocialAccount).filter(SocialAccount.creator_profile_id == profile.id).all()
    payload: dict = {
        "access_id": access.id,
        "status": access.status,
        "granted_permissions": sorted(permissions),
        "unavailable_permissions": sorted(set(PERMISSION_KEYS) - permissions),
        "creator": {
            "name": creator.full_name,
            "email": creator.email if "profile" in permissions else None,
        },
    }
    if "profile" in permissions:
        payload["profile"] = {
            "display_name": profile.display_name,
            "niche": profile.niche,
            "bio": profile.bio,
            "country": profile.country,
            "website": profile.website,
            "avatar_url": profile.avatar_url,
        }
    if permissions & {"platforms", "followers"}:
        payload["platforms"] = [
            {
                "platform": account.platform,
                "handle": account.handle,
                "followers": account.followers_count if "followers" in permissions else None,
                "connected": account.is_connected,
                "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
            }
            for account in accounts
        ]
    if "followers" in permissions:
        payload["analytics"] = {
            "followers": sum(account.followers_count or 0 for account in accounts),
        }
    if "content" in permissions:
        content = _content_summary(db, profile)
        payload["analytics"] = {**payload.get("analytics", {}), **content}
        posts = (
            db.query(ContentPost, SocialAccount.platform)
            .join(SocialAccount)
            .filter(SocialAccount.creator_profile_id == profile.id)
            .order_by(ContentPost.published_at.desc().nullslast(), ContentPost.id.desc())
            .limit(10)
            .all()
        )
        post_metrics: dict[int, dict] = {}
        for metric, post, _account in (
            db.query(ContentMetric, ContentPost, SocialAccount)
            .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
            .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
            .filter(SocialAccount.creator_profile_id == profile.id)
            .all()
        ):
            bucket = post_metrics.setdefault(post.id, {"views": 0, "engagements": 0, "rates": []})
            available = set(metric.metrics_available or ALL_CONTENT_METRICS)
            if "views" in available:
                bucket["views"] += metric.views
            if INTERACTION_FIELDS & available:
                bucket["engagements"] += metric.likes + metric.comments + metric.shares + metric.saves
                bucket["rates"].append(metric.engagement_rate)
        payload["content"] = [
            {
                "id": post.id,
                "title": post.title,
                "platform": platform,
                "content_type": post.content_type,
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "views": post_metrics.get(post.id, {}).get("views"),
                "engagements": post_metrics.get(post.id, {}).get("engagements"),
                "engagement_rate": (
                    round(sum(post_metrics[post.id]["rates"]) / len(post_metrics[post.id]["rates"]), 2)
                    if post_metrics.get(post.id, {}).get("rates") else None
                ),
            }
            for post, platform in posts
        ]
    if "audience" in permissions:
        insights = (
            db.query(AudienceInsight)
            .join(SocialAccount)
            .filter(SocialAccount.creator_profile_id == profile.id)
            .order_by(AudienceInsight.recorded_on.desc())
            .all()
        )
        payload["audience"] = [
            {
                "platform": insight.social_account.platform,
                "recorded_on": insight.recorded_on.isoformat(),
                "age_distribution": insight.age_distribution,
                "gender_distribution": insight.gender_distribution,
                "geographic_distribution": insight.geographic_distribution,
                "device_distribution": insight.device_distribution,
                "active_hours": insight.active_hours,
                "metrics_available": insight.metrics_available,
            }
            for insight in insights[:10]
        ]
    if "growth" in permissions:
        start = date.today() - timedelta(days=29)
        metrics = (
            db.query(AccountMetric)
            .join(SocialAccount)
            .filter(SocialAccount.creator_profile_id == profile.id, AccountMetric.recorded_on >= start)
            .order_by(AccountMetric.recorded_on.asc())
            .all()
        )
        by_day: dict[str, dict] = {}
        for metric in metrics:
            entry = by_day.setdefault(metric.recorded_on.isoformat(), {"date": metric.recorded_on.isoformat(), "followers": 0, "views": 0, "available": False})
            if metric.followers_count is not None:
                entry["followers"] += metric.followers_count
                entry["available"] = True
            entry["views"] += metric.views
        payload["growth"] = list(by_day.values())
    if "revenue" in permissions:
        records = (
            db.query(RevenueRecord)
            .filter(RevenueRecord.creator_profile_id == profile.id)
            .order_by(RevenueRecord.recorded_on.desc())
            .limit(50)
            .all()
        )
        totals: dict[str, float] = {}
        for record in records:
            totals[record.currency] = round(totals.get(record.currency, 0) + float(record.amount), 2)
        payload["revenue"] = {
            "totals_by_currency": [{"currency": currency, "amount": amount} for currency, amount in sorted(totals.items())],
            "records": [
                {
                    "date": record.recorded_on.isoformat(),
                    "source": record.source,
                    "brand": record.brand,
                    "amount": float(record.amount),
                    "currency": record.currency,
                    "payment_status": record.payment_status,
                    "source_type": record.source_type,
                }
                for record in records
            ],
        }

    access.last_accessed_at = datetime.now(timezone.utc)
    access.access_count = int(access.access_count or 0) + 1
    _audit_access(
        db, user, "workspace.access_viewed", access, request,
        {"permissions_used": sorted(permissions)},
    )
    db.commit()
    return payload


@router.get("/activity")
def workspace_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role in COLLABORATOR_ROLES:
        rows = _joined_access_rows(db, [WorkspaceAccess.collaborator_user_id == user.id], limit=limit)
    elif user.role == "creator":
        profile = _creator_profile(db, user)
        rows = _joined_access_rows(db, [WorkspaceAccess.creator_profile_id == profile.id], limit=limit)
    elif user.role == "administrator":
        rows = _joined_access_rows(db, [], limit=limit)
    else:
        raise HTTPException(status_code=403, detail="Unsupported workspace role.")
    return {
        "activity": [
            {
                "id": access.id,
                "status": access.status,
                "creator_name": creator.full_name,
                "collaborator_name": collaborator.full_name,
                "collaborator_role": collaborator.role,
                "updated_at": access.updated_at.isoformat(),
            }
            for access, _profile, creator, collaborator in rows
        ]
    }


@router.get("/governance")
def access_governance(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    creator: str | None = Query(default=None, max_length=120),
    agency: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("administrator")),
):
    filters = []
    if status_filter:
        filters.append(WorkspaceAccess.status == status_filter)
    rows = _joined_access_rows(db, filters)
    if creator:
        term = creator.lower()
        rows = [row for row in rows if term in row[2].full_name.lower() or term in row[2].email.lower()]
    if agency:
        term = agency.lower()
        rows = [row for row in rows if term in row[3].full_name.lower() or term in row[3].email.lower()]
    status_counts = Counter(status_value for (status_value,) in db.query(WorkspaceAccess.status).all())
    return {
        "status_counts": dict(status_counts),
        "recent_requests": [_governance_row_data(row) for row in rows[:limit]],
    }
