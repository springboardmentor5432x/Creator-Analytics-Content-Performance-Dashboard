"""Preference-aware in-app notification creation.

Every notification emitted for a user passes through :func:`notification_allowed`
so the toggles the user controls in Account Settings actually take effect at
emit time. ``pref_key=None`` categories (for example, security-relevant events)
are always delivered.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import CreatorProfile, Notification, User

# Maps a user-facing preference toggle (see account.DEFAULT_NOTIFICATION_PREFERENCES)
# to the notification categories it controls.
PREFERENCE_CATEGORIES: dict[str, tuple[str, ...]] = {
    "access_requests": ("access", "workspace"),
    "access_decisions": ("access", "workspace"),
    "reports": ("report",),
    "revenue": ("revenue",),
    "sync_failures": ("sync",),
    "security": ("security",),
}

CATEGORY_DEFAULT: dict[str, str | None] = {
    "access": "access_requests",
    "workspace": "access_requests",
    "report": "reports",
    "revenue": "revenue",
    "sync": "sync_failures",
    "security": "security",  # security events default to on and are not muted
    "performance": None,
}

ALWAYS_DELIVERED = {"security"}


def notification_allowed(user: User, category: str | None, pref_key: str | None = None) -> bool:
    """Return whether this user should receive a notification in ``category``.

    ``pref_key`` overrides the category-derived key so an emitter can decide
    which toggle applies (for example, an access *decision* maps to
    ``access_decisions`` while an access *request* maps to ``access_requests``).
    """
    if category in ALWAYS_DELIVERED:
        return True
    key = pref_key or CATEGORY_DEFAULT.get(category or "", None)
    if key is None:
        return True
    prefs = user.notification_preferences or {}
    return bool(prefs.get(key, True))


def create_notification(
    db: Session,
    *,
    user: User | None = None,
    profile: CreatorProfile | None = None,
    title: str,
    message: str,
    category: str,
    link: str | None = None,
    pref_key: str | None = None,
) -> Notification | None:
    """Create a notification for a user or creator profile if not muted.

    Exactly one of ``user`` / ``profile`` must be provided. Returns the created
    row, or ``None`` when the recipient disabled this notification category.
    """
    recipient: User | None = user
    if recipient is None and profile is not None:
        recipient = profile.user
    if recipient is None:
        return None
    if not notification_allowed(recipient, category, pref_key):
        return None
    notification = Notification(
        creator_profile_id=profile.id if profile is not None else None,
        user_id=user.id if (user is not None and profile is None) else None,
        title=title,
        message=message,
        category=category,
        link=link,
    )
    db.add(notification)
    return notification
