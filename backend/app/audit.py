"""Audit logging helper used by administrative and consent workflows."""

from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host[:64] if request.client else None


def record_audit(
    db: Session,
    actor: User | None,
    action: str,
    *,
    target_type: str | None = None,
    target_id: int | None = None,
    details: dict | None = None,
    request: Request | None = None,
    commit: bool = False,
) -> AuditLog:
    """Add an audit row to the active transaction.

    The caller normally commits together with the business change so an action
    is never recorded as successful when its transaction rolls back.
    """
    entry = AuditLog(
        actor_user_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        actor_role=actor.role if actor else None,
        action=action[:80],
        target_type=target_type[:50] if target_type else None,
        target_id=target_id,
        details={**(details or {}), "ip": client_ip(request)},
    )
    db.add(entry)
    if commit:
        db.commit()
    return entry
