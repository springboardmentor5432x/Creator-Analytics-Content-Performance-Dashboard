"""End-to-end coverage for the agency workspace router.

Covers role guarding, team management, campaign lifecycle with consent-based
creator assignment, authorized content performance, and agency reports.
"""

from fastapi.testclient import TestClient


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, role: str, email: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "AgencySuite@123",
            "full_name": f"{role.title()} User",
            "profile_name": f"{role.title()} Workspace",
            "focus_area": "Creator partnerships",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def _approve_access(
    client: TestClient,
    creator_token: str,
    agency_token: str,
    permissions: list[str],
) -> int:
    """Create and approve a workspace access so the agency can operate on data."""
    created = client.post(
        "/api/workspace/requests",
        headers=_headers(agency_token),
        json={"creator_email": "demo@creatoriq.dev", "note": "Agency suite test."},
    )
    assert created.status_code == 201, created.text
    access_id = created.json()["id"]
    approved = client.post(
        f"/api/workspace/requests/{access_id}/approve",
        headers=_headers(creator_token),
        json={"permissions": permissions},
    )
    assert approved.status_code == 200, approved.text
    return access_id


# ---------------------------------------------------------------- role guards


def test_agency_endpoints_reject_other_roles(client: TestClient, creator_token: str, admin_token: str):
    marketing_token = _register(client, "marketing_team", "agency-guard-mt@creatoriq.dev")
    paths = [
        "/api/agency/overview",
        "/api/agency/team",
        "/api/agency/campaigns",
        "/api/agency/content",
        "/api/agency/reports",
    ]
    for token in (creator_token, admin_token, marketing_token):
        for path in paths:
            response = client.get(path, headers=_headers(token))
            assert response.status_code == 403, f"{token[:8]} {path}: {response.text}"


def test_agency_overview_and_role_boundary(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-overview@creatoriq.dev")
    response = client.get("/api/agency/overview", headers=_headers(agency_token))
    assert response.status_code == 200, response.text
    assert "agency_name" in response.json()


# ---------------------------------------------------------------------- team


def test_agency_team_member_lifecycle(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-team@creatoriq.dev")
    headers = _headers(agency_token)

    empty = client.get("/api/agency/team", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["members"] == []

    # A member whose email matches an existing CreatorIQ account joins active.
    linked = client.post("/api/agency/team", headers=headers, json={
        "email": "demo@creatoriq.dev",
        "full_name": "Alex Morgan",
        "role": "analyst",
    })
    assert linked.status_code == 201, linked.text
    assert linked.json()["status"] == "active"
    assert linked.json()["joined_at"] is not None

    # An unknown email stays invited until that person signs up.
    invited = client.post("/api/agency/team", headers=headers, json={
        "email": "new-colleague@creatoriq.dev",
        "full_name": "New Colleague",
        "role": "viewer",
    })
    assert invited.status_code == 201, invited.text
    assert invited.json()["status"] == "invited"
    member_id = invited.json()["id"]

    duplicate = client.post("/api/agency/team", headers=headers, json={
        "email": "new-colleague@creatoriq.dev",
        "full_name": "New Colleague",
        "role": "viewer",
    })
    assert duplicate.status_code == 409

    patched = client.patch(f"/api/agency/team/{member_id}", headers=headers, json={"role": "analyst"})
    assert patched.status_code == 200
    assert patched.json()["role"] == "analyst"

    deactivated = client.patch(f"/api/agency/team/{member_id}", headers=headers, json={"status": "deactivated"})
    assert deactivated.status_code == 200
    assert deactivated.json()["status"] == "deactivated"

    listed = client.get("/api/agency/team", headers=headers)
    emails = {member["email"]: member for member in listed.json()["members"]}
    assert emails["demo@creatoriq.dev"]["role"] == "analyst"

    removed = client.delete(f"/api/agency/team/{member_id}", headers=headers)
    assert removed.status_code == 204
    missing = client.patch(f"/api/agency/team/{member_id}", headers=headers, json={"role": "viewer"})
    assert missing.status_code == 404


# ----------------------------------------------------------------- campaigns


def test_campaign_lifecycle_and_consent_gated_assignment(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-campaigns@creatoriq.dev")
    headers = _headers(agency_token)

    created = client.post("/api/agency/campaigns", headers=headers, json={
        "name": "Autumn launch",
        "brand": "Nova Foods",
        "budget": 250000.0,
        "currency": "INR",
        "platforms": ["YouTube", "Instagram"],
        "status": "draft",
    })
    assert created.status_code == 201, created.text
    campaign = created.json()
    assert campaign["status"] == "draft"
    assert campaign["creator_count"] == 0
    campaign_id = campaign["id"]

    listed = client.get("/api/agency/campaigns", headers=headers)
    assert listed.status_code == 200
    totals = listed.json()["totals"]
    assert totals["total"] == 1
    assert {"currency": "INR", "amount": 250000.0} in totals["budget_by_currency"]

    # Without consent the demo creator cannot be assigned to the campaign.
    consent = client.post(f"/api/agency/campaigns/{campaign_id}/creators", headers=headers, json={
        "creator_profile_id": 1,
    })
    assert consent.status_code in {403, 404}, consent.text

    # Grant access with content permission, then assignment succeeds.
    _approve_access(client, creator_token, agency_token, ["profile", "content"])
    clients = client.get("/api/workspace/clients", headers=headers)
    assert clients.status_code == 200
    client_row = clients.json()["clients"][0]
    assert client_row["email"] == "demo@creatoriq.dev"
    assert "creator_profile_id" in client_row

    assigned = client.post(f"/api/agency/campaigns/{campaign_id}/creators", headers=headers, json={
        "creator_profile_id": client_row["creator_profile_id"],
    })
    assert assigned.status_code == 201, assigned.text
    assignment_id = assigned.json()["id"]

    duplicate = client.post(f"/api/agency/campaigns/{campaign_id}/creators", headers=headers, json={
        "creator_profile_id": client_row["creator_profile_id"],
    })
    assert duplicate.status_code == 409

    after_assign = client.get("/api/agency/campaigns", headers=headers)
    row = after_assign.json()["campaigns"][0]
    assert row["creator_count"] == 1
    assert row["creators"][0]["creator_name"] == "Alex Morgan"

    activated = client.patch(f"/api/agency/campaigns/{campaign_id}", headers=headers, json={"status": "active"})
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"

    filtered = client.get("/api/agency/campaigns?status=active", headers=headers)
    assert [item["id"] for item in filtered.json()["campaigns"]] == [campaign_id]
    draft_only = client.get("/api/agency/campaigns?status=draft", headers=headers)
    assert draft_only.json()["campaigns"] == []

    removed = client.delete(
        f"/api/agency/campaigns/{campaign_id}/creators/{assignment_id}", headers=headers
    )
    assert removed.status_code == 204

    deleted = client.delete(f"/api/agency/campaigns/{campaign_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get("/api/agency/campaigns", headers=headers).json()["campaigns"] == []


# ------------------------------------------------------------------- content


def test_agency_content_requires_content_permission(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-content@creatoriq.dev")
    headers = _headers(agency_token)

    _approve_access(client, creator_token, agency_token, ["profile", "followers"])

    blocked = client.get("/api/agency/content", headers=headers)
    assert blocked.status_code == 200, blocked.text
    assert blocked.json()["authorized_creators"] == []
    assert blocked.json()["posts"] == []

    # Tighten to include the content permission; posts become visible.
    updated = client.get("/api/workspace/requests", headers=headers)
    access_id = updated.json()["requests"][0]["id"]
    tightened = client.patch(
        f"/api/workspace/requests/{access_id}/permissions",
        headers=_headers(creator_token),
        json={"permissions": ["profile", "content"]},
    )
    assert tightened.status_code == 200, tightened.text

    allowed = client.get("/api/agency/content", headers=headers)
    assert allowed.status_code == 200, allowed.text
    data = allowed.json()
    assert [creator["name"] for creator in data["authorized_creators"]] == ["Alex Morgan"]
    assert len(data["posts"]) > 0
    for post in data["posts"]:
        assert post["creator_name"] == "Alex Morgan"
        assert post["views"] is not None

    youtube = client.get("/api/agency/content?platform=YouTube", headers=headers)
    assert youtube.status_code == 200
    assert {post["platform"] for post in youtube.json()["posts"]} == {"YouTube"}


# ------------------------------------------------------------------- reports


def test_agency_report_generate_download_delete_and_ownership(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-reports@creatoriq.dev")
    other_agency_token = _register(client, "agency", "agency-reports-other@creatoriq.dev")
    headers = _headers(agency_token)

    _approve_access(client, creator_token, agency_token, ["profile", "content"])

    generated = client.post("/api/agency/reports/generate", headers=headers, json={
        "report_type": "performance",
        "format": "pdf",
        "days": 30,
    })
    assert generated.status_code == 201, generated.text
    report = generated.json()
    assert report["status"] == "ready"
    assert report["download_url"] is not None

    listed = client.get("/api/agency/reports", headers=headers)
    assert [item["id"] for item in listed.json()["reports"]] == [report["id"]]

    download = client.get(f"/api/agency/reports/{report['id']}/download", headers=headers)
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("application/pdf")
    assert download.content[:5] == b"%PDF-"

    # Another agency workspace cannot download this report (ownership check).
    other_download = client.get(
        f"/api/agency/reports/{report['id']}/download", headers=_headers(other_agency_token)
    )
    assert other_download.status_code == 404

    removed = client.delete(f"/api/agency/reports/{report['id']}", headers=headers)
    assert removed.status_code == 204
    assert client.get("/api/agency/reports", headers=headers).json()["reports"] == []
