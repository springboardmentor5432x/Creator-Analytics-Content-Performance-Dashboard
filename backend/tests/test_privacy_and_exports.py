from datetime import date

from fastapi.testclient import TestClient


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, role: str, email: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "PrivacyCheck@123",
            "full_name": f"{role.title()} Privacy",
            "profile_name": f"{role.title()} Privacy Workspace",
            "focus_area": "Privacy testing",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def _all_keys(value) -> set[str]:
    if isinstance(value, dict):
        keys = {str(key).lower() for key in value}
        for item in value.values():
            keys |= _all_keys(item)
        return keys
    if isinstance(value, list):
        keys: set[str] = set()
        for item in value:
            keys |= _all_keys(item)
        return keys
    return set()


def test_csv_report_export_downloads_a_readable_file(client: TestClient, creator_token: str):
    headers = _headers(creator_token)
    created = client.post(
        "/api/reports/generate",
        headers=headers,
        json={"report_type": "revenue", "format": "csv", "days": 30},
    )
    assert created.status_code == 201, created.text
    report = created.json()
    assert report["format"] == "csv"

    download = client.get(f"/api{report['download_url']}", headers=headers)
    assert download.status_code == 200, download.text
    assert download.headers["content-type"].startswith("text/csv")
    assert "attachment" in download.headers["content-disposition"]
    assert ".csv" in download.headers["content-disposition"]
    # The exporter uses a UTF-8 BOM so spreadsheets open the file correctly.
    assert download.content.startswith(b"\xef\xbb\xbf")
    assert b"source" in download.content.lower()


def test_report_download_preserves_the_requested_window_and_snapshot(client: TestClient, creator_token: str):
    headers = _headers(creator_token)
    created = client.post(
        "/api/reports/generate",
        headers=headers,
        json={"report_type": "revenue", "format": "csv", "days": 7},
    )
    assert created.status_code == 201, created.text
    report = created.json()
    assert report["days"] == 7

    later_record = client.post(
        "/api/revenue/records",
        headers=headers,
        json={
            "source": "Other",
            "amount": 42,
            "currency": "INR",
            "description": "Added after snapshot",
            "recorded_on": date.today().isoformat(),
        },
    )
    assert later_record.status_code == 201, later_record.text

    download = client.get(f"/api{report['download_url']}", headers=headers)
    assert download.status_code == 200, download.text
    assert b"Added after snapshot" not in download.content


def test_api_responses_never_expose_credential_fields(client: TestClient, creator_token: str, admin_token: str):
    responses = [
        client.get("/api/integrations/accounts", headers=_headers(creator_token)),
        client.get("/api/auth/me", headers=_headers(creator_token)),
        client.get("/api/admin/users", headers=_headers(admin_token)),
    ]
    forbidden_fragments = ("password", "secret", "token", "encrypted", "ciphertext")
    for response in responses:
        assert response.status_code == 200, response.text
        keys = _all_keys(response.json())
        assert not any(fragment in key for key in keys for fragment in forbidden_fragments), keys


def test_administrator_cannot_read_private_creator_analytics(client: TestClient, admin_token: str):
    headers = _headers(admin_token)

    # The admin dashboard is intentionally empty because it is not a creator workspace.
    summary = client.get("/api/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["data_status"] == "no_creator_profile_for_role"
    assert summary.json()["followers"] == 0
    assert summary.json()["views_7d"] == 0
    assert summary.json()["revenue_by_currency"] == []

    for path in (
        "/api/dashboard/trends",
        "/api/dashboard/platforms",
        "/api/dashboard/top-content",
    ):
        response = client.get(path, headers=headers)
        assert response.status_code == 200
        assert response.json()["data_source"] == "none"

    # Private monetization, reporting, integration, and collaborator endpoints stay creator-scoped.
    assert client.get("/api/revenue/records", headers=headers).status_code == 403
    assert client.get("/api/reports", headers=headers).status_code == 403
    # The notifications endpoint is account-scoped: an administrator sees only
    # their own inbox (empty here) and never creator notification records.
    admin_inbox = client.get("/api/notifications", headers=headers)
    assert admin_inbox.status_code == 200
    assert admin_inbox.json()["notifications"] == []
    assert client.get("/api/integrations/accounts", headers=headers).status_code == 403
    assert client.get("/api/workspace/clients", headers=headers).status_code == 403


def test_admin_governance_omits_private_request_notes(client: TestClient, creator_token: str, admin_token: str):
    agency_token = _register(client, "agency", "agency-governance-note@creatoriq.dev")
    note = "Private campaign brief and budget details."
    created = client.post(
        "/api/workspace/requests",
        headers=_headers(agency_token),
        json={"creator_email": "demo@creatoriq.dev", "note": note},
    )
    assert created.status_code == 201, created.text

    governance = client.get("/api/workspace/governance", headers=_headers(admin_token))
    assert governance.status_code == 200
    assert note not in governance.text
    for request in governance.json()["recent_requests"]:
        assert "note" not in request

    # The creator still sees the note while deciding whether to approve access.
    creator_requests = client.get("/api/workspace/requests", headers=_headers(creator_token))
    assert creator_requests.status_code == 200
    assert any(item["note"] == note for item in creator_requests.json()["requests"])
