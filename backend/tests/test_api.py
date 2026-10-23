from fastapi.testclient import TestClient


def test_root_and_health_are_available(client: TestClient):
    root = client.get("/")
    health = client.get("/health")
    assert root.status_code == 200
    assert root.json()["docs"] == "/docs"
    assert health.status_code == 200
    assert health.json()["status"] == "ok"


def test_protected_dashboard_rejects_missing_token(client: TestClient):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 401
    assert response.json()["detail"] == "Please sign in to continue."


def test_login_and_current_user(client: TestClient, creator_token: str):
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {creator_token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "demo@creatoriq.dev"
    assert response.json()["role"] == "creator"
    assert "hashed_password" not in response.json()


def test_bad_password_is_rejected(client: TestClient):
    response = client.post("/api/auth/login", json={"email": "demo@creatoriq.dev", "password": "wrong-password"})
    assert response.status_code == 401


def test_inactive_user_token_is_rejected(client: TestClient):
    response = client.post("/api/auth/login", json={"email": "inactive@creatoriq.dev", "password": "Inactive@123"})
    assert response.status_code == 401


def test_public_registration_cannot_assign_administrator_role(client: TestClient):
    response = client.post("/api/auth/register", json={
        "email": "newcreator@example.com",
        "full_name": "New Creator",
        "password": "StrongPass@123",
        "creator_name": "New Profile",
        "niche": "Technology",
        "role": "administrator",
    })
    assert response.status_code == 422


def test_duplicate_registration_is_rejected(client: TestClient):
    payload = {
        "email": "duplicate@example.com",
        "full_name": "Duplicate Creator",
        "password": "StrongPass@123",
        "creator_name": "Duplicate Profile",
        "niche": "Education",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_creator_cannot_open_admin_user_list(client: TestClient, creator_token: str):
    response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {creator_token}"})
    assert response.status_code == 403


def test_admin_can_open_safe_user_list(client: TestClient, admin_token: str):
    response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert any(user["email"] == "demo@creatoriq.dev" for user in response.json())
    assert all("hashed_password" not in user for user in response.json())


def test_creator_has_dashboard_permissions(client: TestClient, creator_token: str):
    response = client.get("/api/auth/permissions", headers={"Authorization": f"Bearer {creator_token}"})
    assert response.status_code == 200
    assert response.json()["role"] == "creator"
    assert "analytics:read" in response.json()["permissions"]
    assert "users:manage" not in response.json()["permissions"]


def test_dashboard_data_is_scoped_to_signed_in_creator(client: TestClient):
    new_user = client.post("/api/auth/register", json={
        "email": "emptycreator@example.com",
        "full_name": "Empty Creator",
        "password": "StrongPass@123",
        "creator_name": "Empty Profile",
        "niche": "Education",
    })
    token = new_user.json()["access_token"]
    response = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["followers"] == 0
    assert data["views_7d"] == 0
    assert data["revenue_mtd"] == 0
    assert data["platforms_count"] == 0
    assert data["demo_data"] is False


def test_creator_cannot_change_roles(client: TestClient, creator_token: str):
    users = client.get("/api/admin/users", headers={"Authorization": f"Bearer {creator_token}"})
    assert users.status_code == 403

    response = client.patch(
        "/api/admin/users/1/role",
        json={"role": "administrator"},
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert response.status_code == 403


def test_admin_can_change_another_users_role(client: TestClient, admin_token: str):
    created = client.post("/api/auth/register", json={
        "email": "rolechange@example.com",
        "full_name": "Role Change User",
        "password": "StrongPass@123",
        "creator_name": "Role Change Profile",
        "niche": "Technology",
    })
    assert created.status_code == 201
    user_id = created.json()["user"]["id"]

    response = client.patch(
        f"/api/admin/users/{user_id}/role",
        json={"role": "marketing_team"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["role"] == "marketing_team"


def test_admin_cannot_remove_own_admin_role(client: TestClient, admin_token: str):
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    admin_id = response.json()["id"]
    update = client.patch(
        f"/api/admin/users/{admin_id}/role",
        json={"role": "creator"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update.status_code == 409


def test_invalid_role_value_is_rejected(client: TestClient, admin_token: str):
    created = client.post("/api/auth/register", json={
        "email": "invalidrole@example.com",
        "full_name": "Invalid Role User",
        "password": "StrongPass@123",
        "creator_name": "Invalid Role Profile",
        "niche": "Technology",
    })
    user_id = created.json()["user"]["id"]
    response = client.patch(
        f"/api/admin/users/{user_id}/role",
        json={"role": "superuser"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


def test_standard_signup_can_choose_agency_or_marketing_team_but_not_admin(client: TestClient):
    for role, email in [("agency", "agency-signup@example.com"), ("marketing_team", "marketing-signup@example.com")]:
        response = client.post("/api/auth/register", json={
            "email": email,
            "full_name": f"{role} user",
            "password": "StrongPass@123",
            "creator_name": f"{role} workspace",
            "niche": "Technology",
            "role": role,
        })
        assert response.status_code == 201, response.text
        assert response.json()["user"]["role"] == role

    privileged = client.post("/api/auth/register", json={
        "email": "public-admin@example.com",
        "full_name": "Not an Admin",
        "password": "StrongPass@123",
        "creator_name": "Test Workspace",
        "role": "administrator",
    })
    assert privileged.status_code == 422


def test_admin_can_create_role_based_accounts(client: TestClient, admin_token: str):
    for role in ("creator", "agency", "marketing_team", "administrator"):
        response = client.post("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"}, json={
            "email": f"created-{role}@example.com",
            "full_name": f"Created {role}",
            "password": "StrongPass@123",
            "role": role,
            "profile_name": f"{role.title()} Workspace",
            "niche": "Technology",
        })
        assert response.status_code == 201, response.text
        assert response.json()["role"] == role
        assert "hashed_password" not in response.json()


def test_non_admin_cannot_create_role_based_accounts(client: TestClient, creator_token: str):
    response = client.post("/api/admin/users", headers={"Authorization": f"Bearer {creator_token}"}, json={
        "email": "unauthorized-create@example.com",
        "full_name": "Unauthorized",
        "password": "StrongPass@123",
        "role": "administrator",
    })
    assert response.status_code == 403


def test_role_signup_creates_role_specific_profile_records(client: TestClient, test_engine):
    from sqlalchemy.orm import Session
    from app.models import AgencyProfile, CreatorProfile, MarketingTeamProfile, User

    payloads = [
        ("agency", "agency-profile@example.com", "Northstar Agency", "Creator partnerships"),
        ("marketing_team", "marketing-profile@example.com", "Northstar Marketing Team", "Content strategy"),
        ("creator", "creator-profile@example.com", "Creator Studio", "Technology"),
    ]
    for role, email, profile_name, focus_area in payloads:
        response = client.post("/api/auth/register", json={
            "email": email,
            "full_name": f"{role} owner",
            "password": "StrongPass@123",
            "profile_name": profile_name,
            "focus_area": focus_area,
            "role": role,
        })
        assert response.status_code == 201, response.text

    with Session(test_engine) as db:
        agency_user = db.query(User).filter_by(email="agency-profile@example.com").one()
        marketing_user = db.query(User).filter_by(email="marketing-profile@example.com").one()
        creator_user = db.query(User).filter_by(email="creator-profile@example.com").one()
        assert db.query(AgencyProfile).filter_by(user_id=agency_user.id, agency_name="Northstar Agency").one()
        assert db.query(MarketingTeamProfile).filter_by(user_id=marketing_user.id, team_name="Northstar Marketing Team").one()
        assert db.query(CreatorProfile).filter_by(user_id=creator_user.id, display_name="Creator Studio").one()
        assert db.query(CreatorProfile).filter_by(user_id=agency_user.id).first() is None
        assert db.query(CreatorProfile).filter_by(user_id=marketing_user.id).first() is None


def test_account_profile_can_be_read_and_updated_for_agency(client: TestClient):
    from app.security import hash_password

    created = client.post("/api/auth/register", json={
        "email": "profile-settings@example.com",
        "full_name": "Profile Owner",
        "password": "StrongPass@123",
        "profile_name": "Original Agency",
        "focus_area": "Creator partnerships",
        "role": "agency",
    })
    assert created.status_code == 201, created.text
    token = created.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    read = client.get("/api/account/profile", headers=headers)
    assert read.status_code == 200, read.text
    assert read.json()["profile_name"] == "Original Agency"
    assert read.json()["focus_area"] == "Creator partnerships"
    assert read.json()["role"] == "agency"

    updated = client.patch("/api/account/profile", headers=headers, json={
        "full_name": "Updated Owner",
        "profile_name": "Updated Agency",
        "focus_area": "Brand partnerships",
        "bio": "A workspace for managing creators.",
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == "Updated Owner"
    assert updated.json()["profile_name"] == "Updated Agency"
    assert updated.json()["focus_area"] == "Brand partnerships"
    assert updated.json()["bio"] == "A workspace for managing creators."
    assert updated.json()["email"] == "profile-settings@example.com"


def test_account_password_change_requires_current_password(client: TestClient):
    created = client.post("/api/auth/register", json={
        "email": "password-change@example.com",
        "full_name": "Password Owner",
        "password": "StrongPass@123",
        "profile_name": "Password Creator",
        "focus_area": "Education",
    })
    assert created.status_code == 201, created.text
    token = created.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/account/password", headers=headers, json={
        "current_password": "wrong-password",
        "new_password": "NewStrongPass@123",
    })
    assert response.status_code == 400

    changed = client.post("/api/account/password", headers=headers, json={
        "current_password": "StrongPass@123",
        "new_password": "NewStrongPass@123",
    })
    assert changed.status_code == 204
    relogin = client.post("/api/auth/login", json={
        "email": "password-change@example.com",
        "password": "NewStrongPass@123",
    })
    assert relogin.status_code == 200


def test_admin_role_change_provisions_new_role_profile_and_retains_previous_data(client: TestClient, admin_token: str, test_engine):
    from sqlalchemy.orm import Session
    from app.models import AgencyProfile, CreatorProfile, User

    created = client.post("/api/auth/register", json={
        "email": "switch-to-agency@example.com",
        "full_name": "Switch Account",
        "password": "StrongPass@123",
        "profile_name": "Switch Workspace",
        "focus_area": "General",
        "role": "creator",
    })
    user_id = created.json()["user"]["id"]
    changed = client.patch(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "agency"},
    )
    assert changed.status_code == 200, changed.text
    with Session(test_engine) as db:
        user = db.get(User, user_id)
        assert db.query(AgencyProfile).filter_by(user_id=user_id, agency_name="Switch Workspace").one()
        # Previous profile data is retained on a role change; a destructive data migration is avoided.
        assert db.query(CreatorProfile).filter_by(user_id=user_id).one()
        assert user.role == "agency"



def test_role_changed_from_creator_does_not_expose_creator_dashboard_metrics(client: TestClient, admin_token: str, test_engine):
    from datetime import date
    from sqlalchemy.orm import Session
    from app.models import ContentMetric, ContentPost, CreatorProfile, SocialAccount

    created = client.post("/api/auth/register", json={
        "email": "role-data-isolation@example.com",
        "full_name": "Role Isolation Owner",
        "password": "StrongPass@123",
        "profile_name": "Role Isolation Creator",
        "focus_area": "Technology",
    })
    assert created.status_code == 201, created.text
    user_id = created.json()["user"]["id"]
    account_token = created.json()["access_token"]

    # Give this test account real rows so that the test can prove the data is
    # hidden from its dashboard when its role changes from Creator to Agency.
    with Session(test_engine) as db:
        profile = db.query(CreatorProfile).filter_by(user_id=user_id).one()
        social = SocialAccount(
            creator_profile_id=profile.id,
            platform="YouTube",
            handle="@role-isolation-test",
            followers_count=12345,
            is_connected=False,
        )
        db.add(social)
        db.flush()
        post = ContentPost(social_account_id=social.id, title="Role isolation sample post")
        db.add(post)
        db.flush()
        db.add(ContentMetric(
            content_post_id=post.id,
            recorded_on=date.today(),
            views=5000,
            likes=600,
            engagement_rate=12.0,
        ))
        db.commit()

    admin_change = client.patch(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "agency"},
    )
    assert admin_change.status_code == 200, admin_change.text
    summary = client.get(
        "/api/dashboard/summary",
        headers={"Authorization": f"Bearer {account_token}"},
    )
    assert summary.status_code == 200, summary.text
    assert summary.json()["followers"] == 0
    assert summary.json()["views_7d"] == 0
    assert summary.json()["demo_data"] is False
    assert summary.json()["data_status"] == "no_creator_profile_for_role"


def test_cors_preflight_accepts_local_vite_origin_and_custom_headers(client: TestClient):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,x-local-test",
        },
    )
    assert response.status_code == 200, response.text
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
