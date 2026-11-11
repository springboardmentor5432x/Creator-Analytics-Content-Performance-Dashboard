from fastapi.testclient import TestClient


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, role: str, email: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "WorkspaceAccess@123",
            "full_name": f"{role.title()} User",
            "profile_name": f"{role.title()} Workspace",
            "focus_area": "Creator partnerships",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def test_creator_explicitly_controls_collaborator_access(client: TestClient, creator_token: str, admin_token: str):
    agency_token = _register(client, "agency", "agency-access@creatoriq.dev")
    agency_headers = _headers(agency_token)
    creator_headers = _headers(creator_token)

    created = client.post(
        "/api/workspace/requests",
        headers=agency_headers,
        json={"creator_email": "demo@creatoriq.dev", "note": "Campaign reporting review."},
    )
    assert created.status_code == 201, created.text
    access_id = created.json()["id"]
    assert created.json()["status"] == "pending"

    # A collaborator cannot see client summaries until the creator approves.
    assert client.get("/api/workspace/clients", headers=agency_headers).json()["clients"] == []
    creator_requests = client.get("/api/workspace/requests", headers=creator_headers)
    assert creator_requests.status_code == 200
    assert creator_requests.json()["direction"] == "incoming"
    assert creator_requests.json()["requests"][0]["collaborator"]["role"] == "agency"

    approved = client.post(f"/api/workspace/requests/{access_id}/approve", headers=creator_headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    clients = client.get("/api/workspace/clients", headers=agency_headers)
    assert clients.status_code == 200
    assert clients.json()["clients"][0]["email"] == "demo@creatoriq.dev"

    governance = client.get("/api/workspace/governance", headers=_headers(admin_token))
    assert governance.status_code == 200
    assert governance.json()["status_counts"]["approved"] >= 1

    revoked = client.post(f"/api/workspace/requests/{access_id}/revoke", headers=creator_headers)
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"
    assert client.get("/api/workspace/clients", headers=agency_headers).json()["clients"] == []


def test_marketing_team_cannot_approve_a_creator_request(client: TestClient, creator_token: str):
    agency_token = _register(client, "agency", "agency-pending@creatoriq.dev")
    marketing_token = _register(client, "marketing_team", "marketing-pending@creatoriq.dev")
    created = client.post(
        "/api/workspace/requests",
        headers=_headers(agency_token),
        json={"creator_email": "demo@creatoriq.dev"},
    )
    assert created.status_code == 201
    access_id = created.json()["id"]
    assert client.post(
        f"/api/workspace/requests/{access_id}/approve",
        headers=_headers(marketing_token),
    ).status_code == 403
    assert client.post(
        f"/api/workspace/requests/{access_id}/approve",
        headers=_headers(creator_token),
    ).status_code == 200
