"""Creator-controlled workspace permissions shared by consent and agency views.

A creator approves an explicit subset of the permissions below. Agency and
Marketing Team users can only read the parts of a creator workspace that are
covered by the *currently granted* permission list.

Legacy approvals created before granular permissions existed have an empty
``granted_permissions`` list. They keep the historic summary visibility by
falling back to ``DEFAULT_PERMISSIONS``; an explicit empty list is therefore
not distinguishable from "not recorded yet". New approvals always record the
creator's selection.
"""

from __future__ import annotations

WORKSPACE_PERMISSIONS: tuple[dict[str, str], ...] = (
    {"key": "profile", "label": "View profile summary"},
    {"key": "followers", "label": "View follower statistics"},
    {"key": "content", "label": "View content performance"},
    {"key": "audience", "label": "View audience insights"},
    {"key": "growth", "label": "View growth trends"},
    {"key": "revenue", "label": "View revenue information"},
    {"key": "platforms", "label": "Access selected platform summaries"},
)

PERMISSION_KEYS: tuple[str, ...] = tuple(item["key"] for item in WORKSPACE_PERMISSIONS)
DEFAULT_PERMISSIONS: list[str] = ["profile", "followers", "content", "platforms"]

PERMISSION_LABELS: dict[str, str] = {item["key"]: item["label"] for item in WORKSPACE_PERMISSIONS}


def clean_permissions(values: list[str] | tuple[str, ...] | None) -> list[str]:
    """Return only known permission keys, in policy order and without duplicates."""
    requested = set(values or [])
    return [key for key in PERMISSION_KEYS if key in requested]


def effective_permissions(granted: list[str] | None) -> set[str]:
    """Resolve the permissions an approved collaborator currently holds."""
    cleaned = clean_permissions(granted)
    return set(cleaned if cleaned else DEFAULT_PERMISSIONS)


def has_permission(granted: list[str] | None, permission: str) -> bool:
    return permission in effective_permissions(granted)
