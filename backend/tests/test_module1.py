"""Module 1 test cases (the list from the mentor's guideline email)."""
from .conftest import auth, login, register


# ---------- registration ----------
def test_valid_registration(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["role"] == "creator" and body["role_label"] == "Creator"
    assert "password" not in body and "password_hash" not in body


def test_registration_creates_matching_profile(client):
    register(client, email="c1@example.com", role="creator")
    register(client, email="a1@example.com", role="agency", name="Agency One")
    assert client.get("/api/creators/me", headers=auth(client, "c1@example.com", "Pass1234")).status_code == 200
    assert client.get("/api/agencies/me", headers=auth(client, "a1@example.com", "Pass1234")).status_code == 200


def test_duplicate_registration(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409
    assert register(client, email="NEW@Example.com").status_code == 409  # email is case-insensitive


def test_registration_invalid_or_missing_fields(client):
    assert client.post("/api/auth/register", json={"email": "x@y.com"}).status_code == 422
    assert register(client, email="not-an-email").status_code == 422
    assert register(client, password="short1").status_code == 422
    assert register(client, password="onlyletters").status_code == 422
    assert register(client, password="12345678").status_code == 422
    assert register(client, name=" ").status_code == 422
    assert register(client, role="nonsense").status_code == 422


def test_cannot_register_as_admin_or_marketing(client):
    assert register(client, role="admin").status_code == 422
    assert register(client, role="marketing_team").status_code == 422


# ---------- login ----------
def test_valid_login_returns_token_and_role(client):
    r = login(client, "creator@creatoriq.com")
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    assert body["user"]["role"] == "creator"


def test_login_is_case_insensitive_on_email(client):
    assert login(client, "Creator@CreatorIQ.com").status_code == 200


def test_invalid_login_credentials(client):
    wrong_pw = login(client, "creator@creatoriq.com", "WrongPass1")
    unknown = login(client, "nobody@example.com", "Pass1234")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["detail"] == unknown.json()["detail"]  # same message, cannot probe emails


def test_login_missing_fields(client):
    assert client.post("/api/auth/login", data={"username": "a@b.com"}).status_code == 422


# ---------- protected endpoints / authentication ----------
def test_protected_endpoint_without_token(client):
    for path in ["/api/auth/me", "/api/creators/me", "/api/agencies/me", "/api/admin/users"]:
        assert client.get(path).status_code == 401, path


def test_invalid_or_tampered_token(client, h):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    token = h["creator"]["Authorization"].split()[1]
    tampered = token[:-3] + ("aaa" if not token.endswith("aaa") else "bbb")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_me_returns_current_user(client, h):
    r = client.get("/api/auth/me", headers=h["agency"])
    assert r.status_code == 200 and r.json()["email"] == "agency@creatoriq.com"


# ---------- role-based access (authorization) ----------
def test_wrong_role_gets_403(client, h):
    assert client.get("/api/admin/users", headers=h["creator"]).status_code == 403
    assert client.get("/api/admin/users", headers=h["agency"]).status_code == 403
    assert client.get("/api/admin/users", headers=h["marketing"]).status_code == 403
    assert client.get("/api/agencies/me", headers=h["creator"]).status_code == 403
    assert client.get("/api/creators/me", headers=h["agency"]).status_code == 403
    assert client.get("/api/creators/me", headers=h["marketing"]).status_code == 403


def test_admin_can_list_users(client, h):
    r = client.get("/api/admin/users", headers=h["admin"])
    assert r.status_code == 200 and len(r.json()) == 4


def test_authenticated_is_not_the_same_as_admin(client, h):
    uid = client.get("/api/auth/me", headers=h["creator"]).json()["user_id"]
    r = client.patch(f"/api/admin/users/{uid}", json={"role": "admin"}, headers=h["creator"])
    assert r.status_code == 403  # a creator cannot promote themselves


def test_admin_changes_role_and_status(client, h):
    register(client, email="x@example.com")
    users = client.get("/api/admin/users", headers=h["admin"]).json()
    uid = next(u["user_id"] for u in users if u["email"] == "x@example.com")
    r = client.patch(f"/api/admin/users/{uid}", json={"role": "marketing_team"}, headers=h["admin"])
    assert r.status_code == 200 and r.json()["role"] == "marketing_team"
    r = client.patch(f"/api/admin/users/{uid}", json={"is_active": False}, headers=h["admin"])
    assert r.json()["is_active"] is False
    assert login(client, "x@example.com", "Pass1234").status_code == 403  # disabled account


def test_admin_cannot_edit_self_or_set_invalid_role(client, h):
    me = client.get("/api/auth/me", headers=h["admin"]).json()["user_id"]
    assert client.patch(f"/api/admin/users/{me}", json={"role": "creator"}, headers=h["admin"]).status_code == 400
    other = client.get("/api/auth/me", headers=h["creator"]).json()["user_id"]
    assert client.patch(f"/api/admin/users/{other}", json={"role": "god"}, headers=h["admin"]).status_code == 422
    assert client.patch("/api/admin/users/9999", json={"is_active": True}, headers=h["admin"]).status_code == 404


# ---------- creator profile ----------
def test_creator_updates_own_profile(client, h):
    r = client.put(
        "/api/creators/me",
        json={"creator_name": "Kunal", "bio": "I make tech videos", "website": "https://example.com", "location": "Bhopal"},
        headers=h["creator"],
    )
    assert r.status_code == 200
    assert r.json()["creator_name"] == "Kunal"
    # partial update leaves the other fields alone
    r = client.put("/api/creators/me", json={"bio": "New bio"}, headers=h["creator"])
    assert r.json()["bio"] == "New bio" and r.json()["creator_name"] == "Kunal"
    assert client.get("/api/creators/me", headers=h["creator"]).json()["location"] == "Bhopal"


def test_profile_validation(client, h):
    assert client.put("/api/creators/me", json={"website": "not a url"}, headers=h["creator"]).status_code == 422
    assert client.put("/api/creators/me", json={"bio": "x" * 1001}, headers=h["creator"]).status_code == 422
    assert client.put("/api/creators/me", json={"website": "javascript:alert(1)"}, headers=h["creator"]).status_code == 422


def test_creator_cannot_access_or_edit_another_creator(client, h):
    register(client, email="other@example.com", name="Other Creator")
    other_h = auth(client, "other@example.com", "Pass1234")
    other_id = client.get("/api/creators/me", headers=other_h).json()["creator_id"]
    my_id = client.get("/api/creators/me", headers=h["creator"]).json()["creator_id"]
    assert other_id != my_id
    assert client.get(f"/api/creators/{other_id}", headers=h["creator"]).status_code == 403
    assert client.put(f"/api/creators/{other_id}", json={"bio": "hacked"}, headers=h["creator"]).status_code == 403
    assert client.get(f"/api/creators/{my_id}", headers=h["creator"]).status_code == 200  # own profile by id is fine
    assert client.get("/api/creators/9999", headers=h["admin"]).status_code == 404


def test_agency_and_marketing_access_to_creator_profiles(client, h):
    my_id = client.get("/api/creators/me", headers=h["creator"]).json()["creator_id"]
    # demo agency is linked to the demo creator -> allowed
    assert client.get(f"/api/creators/{my_id}", headers=h["agency"]).status_code == 200
    # marketing team has no access, admin does
    assert client.get(f"/api/creators/{my_id}", headers=h["marketing"]).status_code == 403
    assert client.get(f"/api/creators/{my_id}", headers=h["admin"]).status_code == 200
    # agency can read but not edit
    assert client.put(f"/api/creators/{my_id}", json={"bio": "x"}, headers=h["agency"]).status_code == 403
    assert client.put(f"/api/creators/{my_id}", json={"bio": "by admin"}, headers=h["admin"]).status_code == 200


def test_unlinked_agency_cannot_see_creator(client, h):
    register(client, email="a2@example.com", role="agency", name="Other Agency")
    a2 = auth(client, "a2@example.com", "Pass1234")
    my_id = client.get("/api/creators/me", headers=h["creator"]).json()["creator_id"]
    assert client.get(f"/api/creators/{my_id}", headers=a2).status_code == 403


# ---------- agency profile ----------
def test_agency_updates_own_profile(client, h):
    r = client.put(
        "/api/agencies/me",
        json={"agency_name": "Bright Media", "description": "We manage creators", "website": "https://bright.example"},
        headers=h["agency"],
    )
    assert r.status_code == 200 and r.json()["agency_name"] == "Bright Media"


def test_agency_cannot_access_another_agency(client, h):
    register(client, email="a3@example.com", role="agency", name="Third Agency")
    a3 = auth(client, "a3@example.com", "Pass1234")
    other_id = client.get("/api/agencies/me", headers=a3).json()["agency_id"]
    assert client.get(f"/api/agencies/{other_id}", headers=h["agency"]).status_code == 403
    assert client.put(f"/api/agencies/{other_id}", json={"agency_name": "x"}, headers=h["agency"]).status_code == 403
    assert client.get(f"/api/agencies/{other_id}", headers=h["admin"]).status_code == 200


def test_agency_manages_its_creators(client, h):
    assert len(client.get("/api/agencies/me/creators", headers=h["agency"]).json()) == 1
    register(client, email="c9@example.com", name="Nine")
    cid = client.get("/api/creators/me", headers=auth(client, "c9@example.com", "Pass1234")).json()["creator_id"]
    assert client.post("/api/agencies/me/creators", json={"creator_id": cid}, headers=h["agency"]).status_code == 201
    assert client.post("/api/agencies/me/creators", json={"creator_id": cid}, headers=h["agency"]).status_code == 409
    assert client.post("/api/agencies/me/creators", json={"creator_id": 9999}, headers=h["agency"]).status_code == 404
    assert client.delete(f"/api/agencies/me/creators/{cid}", headers=h["agency"]).status_code == 204
    assert client.delete(f"/api/agencies/me/creators/{cid}", headers=h["agency"]).status_code == 404
    assert client.post("/api/agencies/me/creators", json={"creator_id": cid}, headers=h["creator"]).status_code == 403


# ---------- account settings ----------
def test_update_own_name(client, h):
    r = client.patch("/api/account/me", json={"name": "New Name"}, headers=h["creator"])
    assert r.status_code == 200 and r.json()["name"] == "New Name"
    assert client.patch("/api/account/me", json={"name": "A"}, headers=h["creator"]).status_code == 422
    assert client.patch("/api/account/me", json={"name": "New Name"}).status_code == 401


def test_change_password(client, h):
    body = {"current_password": "Demo@1234", "new_password": "Better5678"}
    assert client.post("/api/account/change-password", json={**body, "current_password": "wrong"}, headers=h["creator"]).status_code == 400
    assert client.post("/api/account/change-password", json={**body, "new_password": "weak"}, headers=h["creator"]).status_code == 422
    assert client.post("/api/account/change-password", json={**body, "new_password": "Demo@1234"}, headers=h["creator"]).status_code == 400
    assert client.post("/api/account/change-password", json=body, headers=h["creator"]).status_code == 204
    assert login(client, "creator@creatoriq.com", "Demo@1234").status_code == 401
    assert login(client, "creator@creatoriq.com", "Better5678").status_code == 200


def test_deactivate_account(client, h):
    assert client.post("/api/account/deactivate", json={"password": "wrong"}, headers=h["creator"]).status_code == 400
    assert client.post("/api/account/deactivate", json={"password": "Demo@1234"}, headers=h["creator"]).status_code == 204
    assert client.get("/api/auth/me", headers=h["creator"]).status_code == 401  # old token stops working
    assert login(client, "creator@creatoriq.com").status_code == 403
    assert client.post("/api/account/deactivate", json={"password": "Demo@1234"}, headers=h["admin"]).status_code == 400
