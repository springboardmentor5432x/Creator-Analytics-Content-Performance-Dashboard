"""Tests for the delivery hardening pass.

Covers role-scoped notifications, notification preferences enforcement,
password-change session revocation, login rate limiting, and CSV injection
protection in report exports.
"""

import csv
import io

from fastapi.testclient import TestClient

from app.notify import create_notification
from app.routers import auth as auth_module


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, role: str, email: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "Hardening@123",
            "full_name": f"{role.title()} Hardening",
            "profile_name": f"{role.title()} Workspace",
            "focus_area": "General",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def _request_creator_access(client: TestClient, agency_token: str, creator_email: str) -> int:
    response = client.post(
        "/api/workspace/requests",
        headers=_headers(agency_token),
        json={"creator_email": creator_email},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_agency_receives_and_reads_user_scoped_notifications(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-notify@creatoriq.dev")

    # Before any interaction the agency inbox starts empty.
    empty = client.get("/api/notifications", headers=_headers(agency_token))
    assert empty.status_code == 200
    assert empty.json()["notifications"] == []

    # A rejection writes a notification for the agency user (user_id scope).
    access_id = _request_creator_access(client, agency_token, "demo@creatoriq.dev")
    rejected = client.post(
        f"/api/workspace/requests/{access_id}/reject",
        headers=_headers(creator_token),
    )
    assert rejected.status_code == 200, rejected.text

    inbox = client.get("/api/notifications", headers=_headers(agency_token))
    assert inbox.status_code == 200
    data = inbox.json()
    assert data["unread_count"] >= 1
    notification = next(
        item for item in data["notifications"] if item["title"] == "Creator access rejected"
    )
    assert notification["link"] == "Creator access"

    # Mark read honours ownership: the creator cannot touch the agency row.
    forbidden = client.post(
        f"/api/notifications/{notification['id']}/read",
        headers=_headers(creator_token),
    )
    assert forbidden.status_code == 404

    marked = client.post(
        f"/api/notifications/{notification['id']}/read",
        headers=_headers(agency_token),
    )
    assert marked.status_code == 200
    assert marked.json()["is_read"] is True

    read_all = client.post("/api/notifications/read-all", headers=_headers(agency_token))
    assert read_all.status_code == 204
    final = client.get("/api/notifications", headers=_headers(agency_token))
    assert final.json()["unread_count"] == 0


def test_notification_preferences_are_enforced_at_emit_time(client: TestClient, creator_token: str, test_engine):
    from sqlalchemy.orm import Session
    from app.models import CreatorProfile, Notification

    # Disable revenue notifications for the demo creator.
    muted = client.patch(
        "/api/account/preferences",
        headers=_headers(creator_token),
        json={"notification_preferences": {"revenue": False}},
    )
    assert muted.status_code == 200, muted.text
    assert muted.json()["notification_preferences"]["revenue"] is False

    created = client.post(
        "/api/revenue/records",
        headers=_headers(creator_token),
        json={"source": "Sponsorships", "amount": 1200, "currency": "INR", "recorded_on": "2026-01-15"},
    )
    assert created.status_code == 201, created.text

    inbox = client.get("/api/notifications", headers=_headers(creator_token))
    titles = [item["title"] for item in inbox.json()["notifications"]]
    assert "Revenue entry recorded" not in titles

    # Re-enable and confirm the notification flows again.
    client.patch(
        "/api/account/preferences",
        headers=_headers(creator_token),
        json={"notification_preferences": {"revenue": True}},
    )
    created = client.post(
        "/api/revenue/records",
        headers=_headers(creator_token),
        json={"source": "Affiliate marketing", "amount": 300, "currency": "INR", "recorded_on": "2026-01-16"},
    )
    assert created.status_code == 201, created.text
    inbox = client.get("/api/notifications", headers=_headers(creator_token))
    titles = [item["title"] for item in inbox.json()["notifications"]]
    assert "Revenue entry recorded" in titles


def test_notification_allowed_helper_respects_defaults_and_security(test_engine):
    from sqlalchemy.orm import Session
    from app.models import User

    with Session(test_engine) as db:
        user = db.query(User).filter(User.email == "demo@creatoriq.dev").one()
        from app.notify import notification_allowed

        assert notification_allowed(user, "revenue") is True
        muted_user = User(
            email="muted-prefs@creatoriq.dev",
            full_name="Muted Prefs",
            hashed_password="x",
            role="creator",
            notification_preferences={"revenue": False, "reports": False},
        )
        assert notification_allowed(muted_user, "revenue") is False
        assert notification_allowed(muted_user, "report") is False
        assert notification_allowed(muted_user, "security") is True
        assert notification_allowed(muted_user, "performance") is True


def test_password_change_revokes_previous_session_token(client: TestClient):
    token = _register(client, "creator", "session-rotate@creatoriq.dev")
    headers = _headers(token)

    changed = client.post(
        "/api/account/password",
        headers=headers,
        json={"current_password": "Hardening@123", "new_password": "Rotated@12345"},
    )
    assert changed.status_code == 200, changed.text
    fresh_token = changed.json()["access_token"]

    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert client.get("/api/auth/me", headers=_headers(fresh_token)).status_code == 200


def test_login_rate_limiting_blocks_after_repeated_failures(client: TestClient):
    auth_module._failed_logins.clear()
    try:
        for _ in range(auth_module.FAILED_LOGIN_LIMIT):
            failed = client.post(
                "/api/auth/login",
                json={"email": "ratelimit@creatoriq.dev", "password": "WrongPass@123"},
            )
            assert failed.status_code == 401
        blocked = client.post(
            "/api/auth/login",
            json={"email": "ratelimit@creatoriq.dev", "password": "WrongPass@123"},
        )
        assert blocked.status_code == 429

        # Even the correct password stays blocked until the window expires.
        blocked_correct = client.post(
            "/api/auth/login",
            json={"email": "ratelimit@creatoriq.dev", "password": "Hardening@123"},
        )
        assert blocked_correct.status_code == 429

        # A different account from the same client is unaffected.
        other = client.post(
            "/api/auth/login",
            json={"email": "demo@creatoriq.dev", "password": "CreatorIQ@123"},
        )
        assert other.status_code == 200
    finally:
        auth_module._failed_logins.clear()


def test_csv_export_neutralizes_formula_injection():
    from app.report_exports import csv_bytes

    rows = [
        {"title": "=HYPERLINK(\"http://evil.example\")", "amount": 100},
        {"title": "+SUM(A1:A2)", "amount": 200},
        {"title": "@cmd", "amount": 300},
        {"title": "Safe title", "amount": 400},
        {"title": "-5 discount", "amount": 500},
    ]
    text = csv_bytes(rows).decode("utf-8-sig")
    parsed = list(csv.DictReader(io.StringIO(text)))
    assert parsed[0]["title"].startswith("'=")
    assert parsed[1]["title"].startswith("'+")
    assert parsed[2]["title"].startswith("'@")
    assert parsed[3]["title"] == "Safe title"
    assert parsed[4]["title"].startswith("'-")
