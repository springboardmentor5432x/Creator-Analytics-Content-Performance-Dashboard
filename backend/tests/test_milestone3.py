from fastapi.testclient import TestClient


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_revenue_reporting_notifications_and_schedule_workflow(client: TestClient, creator_token: str):
    headers = _headers(creator_token)

    created = client.post(
        "/api/revenue/records",
        headers=headers,
        json={
            "source": "Affiliate marketing",
            "amount": 3210.5,
            "currency": "inr",
            "description": "October referral payout",
            "recorded_on": "2026-11-05",
        },
    )
    assert created.status_code == 201, created.text
    record = created.json()
    assert record["currency"] == "INR"
    assert record["amount"] == 3210.5

    summary = client.get("/api/revenue/summary?days=90", headers=headers)
    assert summary.status_code == 200
    assert any(row["source"] == "Affiliate marketing" for row in summary.json()["by_source"])

    updated = client.patch(
        f"/api/revenue/records/{record['id']}",
        headers=headers,
        json={"amount": 3500, "description": "Confirmed referral payout"},
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 3500
    assert updated.json()["description"] == "Confirmed referral payout"

    pdf_report = client.post(
        "/api/reports/generate",
        headers=headers,
        json={"report_type": "revenue", "format": "pdf", "days": 30},
    )
    assert pdf_report.status_code == 201, pdf_report.text
    assert pdf_report.json()["days"] == 30
    pdf_download = client.get(f"/api{pdf_report.json()['download_url']}", headers=headers)
    assert pdf_download.status_code == 200
    assert pdf_download.headers["content-type"].startswith("application/pdf")
    assert pdf_download.content.startswith(b"%PDF-")

    spreadsheet_report = client.post(
        "/api/reports/generate",
        headers=headers,
        json={"report_type": "performance", "format": "xlsx", "days": 7},
    )
    assert spreadsheet_report.status_code == 201, spreadsheet_report.text
    assert spreadsheet_report.json()["days"] == 7
    spreadsheet_download = client.get(
        f"/api{spreadsheet_report.json()['download_url']}", headers=headers
    )
    assert spreadsheet_download.status_code == 200
    assert spreadsheet_download.content.startswith(b"PK")

    schedule = client.post(
        "/api/reports/schedules",
        headers=headers,
        json={"report_type": "audience", "format": "csv", "days": 30, "cadence": "weekly"},
    )
    assert schedule.status_code == 201, schedule.text
    assert schedule.json()["is_active"] is True
    assert schedule.json()["days"] == 30
    generated = client.post(
        f"/api/reports/schedules/{schedule.json()['id']}/run", headers=headers
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["format"] == "csv"

    notifications = client.get("/api/notifications", headers=headers)
    assert notifications.status_code == 200
    assert notifications.json()["unread_count"] >= 1
    marked = client.post("/api/notifications/read-all", headers=headers)
    assert marked.status_code == 204


def test_revenue_records_are_scoped_to_the_creator(client: TestClient, creator_token: str):
    owner_headers = _headers(creator_token)
    record = client.post(
        "/api/revenue/records",
        headers=owner_headers,
        json={"source": "Other", "amount": 100, "currency": "INR"},
    ).json()
    registration = client.post(
        "/api/auth/register",
        json={
            "email": "revenue-isolation@creatoriq.dev",
            "password": "RevenueIsolation@123",
            "full_name": "Revenue Isolation",
            "profile_name": "Revenue Isolation",
            "focus_area": "Testing",
            "role": "creator",
        },
    )
    assert registration.status_code == 201, registration.text
    other_headers = _headers(registration.json()["access_token"])
    assert client.patch(
        f"/api/revenue/records/{record['id']}",
        headers=other_headers,
        json={"amount": 999},
    ).status_code == 404
    assert client.get(
        f"/api/reports/{999999}/download", headers=other_headers
    ).status_code == 404
