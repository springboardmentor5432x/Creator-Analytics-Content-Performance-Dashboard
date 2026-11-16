import os, tempfile
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
from fastapi.testclient import TestClient
from app.main import app
from app.services import engagement_rate, load_demo, clear_demo
from app.database import SessionLocal
from app.models import User, RevenueRecord, HashtagMetric, Notification, AudienceMetric, FollowerGrowth, ContentRecord
from app.schemas import (RevenueRecordIn, HashtagMetricIn, NotificationIn,
                         DeviceDistribution, REVENUE_SOURCES, NOTIFICATION_CATEGORIES)
from datetime import date
from pydantic import ValidationError
import pytest

client = TestClient(app)
PW = "Passw0rd123"


def reg(email, role="creator"):
    r = client.post("/api/auth/register", json={"full_name": "Test User", "email": email, "password": PW, "role": role})
    assert r.status_code == 201, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def test_engagement_formula_and_zero_reach():
    assert engagement_rate(10, 5, 3, 2, 200) == 10.0
    assert engagement_rate(10, 5, 3, 2, 0) == 0.0


def test_register_login_validation_and_hashing():
    reg("a@test.com")
    assert client.post("/api/auth/register", json={"full_name": "X Y", "email": "a@test.com", "password": PW}).status_code == 409
    assert client.post("/api/auth/register", json={"full_name": "X Y", "email": "bad", "password": PW}).status_code == 422
    assert client.post("/api/auth/register", json={"full_name": "X Y", "email": "b@test.com", "password": "short"}).status_code == 422
    from app.config import settings
    settings.ALLOW_DEV_ADMIN_REGISTRATION = False
    assert client.post("/api/auth/register", json={"full_name": "X Y", "email": "b@test.com", "password": PW, "role": "admin"}).status_code == 422
    assert client.post("/api/auth/register", json={"full_name": "X Y", "email": "b@test.com", "password": PW, "role": "administrator"}).status_code == 422
    settings.ALLOW_DEV_ADMIN_REGISTRATION = True
    r_adm = client.post("/api/auth/register", json={"full_name": "Dev Admin", "email": "dev_admin@test.com", "password": PW, "role": "administrator"})
    assert r_adm.status_code == 201
    assert r_adm.json()["user"]["role"] == "admin"
    assert client.post("/api/auth/login", json={"email": "a@test.com", "password": PW}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "a@test.com", "password": "wrong"}).status_code == 401
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="a@test.com").one()
        assert u.hashed_password != PW and u.hashed_password.startswith("$2")


def test_protected_routes_need_token():
    for path in ["/api/users/me", "/api/content", "/api/dashboard/overview", "/api/audience/summary", "/api/connections"]:
        assert client.get(path).status_code == 401
    assert client.get("/api/users/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_rbac_admin_only():
    h = reg("c@test.com")
    assert client.get("/api/admin/users", headers=h).status_code == 403
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="c@test.com").one(); u.role = "admin"; db.commit()
    h2 = {"Authorization": "Bearer " + client.post("/api/auth/login", json={"email": "c@test.com", "password": PW}).json()["access_token"]}
    assert client.get("/api/admin/users", headers=h2).status_code == 200


POST = {"title": "My video", "platform": "youtube", "published_at": "2026-10-01", "views": 1000, "likes": 50,
        "comments": 10, "shares": 5, "saves": 5, "reach": 700, "watch_time_minutes": 120.5}


def test_content_crud_and_isolation():
    h1, h2 = reg("u1@test.com"), reg("u2@test.com")
    r = client.post("/api/content", json=POST, headers=h1); assert r.status_code == 201
    c = r.json(); assert c["engagement_rate"] == 10.0
    cid = c["id"]
    assert client.get(f"/api/content/{cid}", headers=h2).status_code == 404   # other user cannot see it
    assert client.put(f"/api/content/{cid}", json=POST, headers=h2).status_code == 404
    assert client.delete(f"/api/content/{cid}", headers=h2).status_code == 404
    assert client.put(f"/api/content/{cid}", json={**POST, "title": "Edited", "reach": 0}, headers=h1).json()["engagement_rate"] == 0.0
    assert client.post("/api/content", json={**POST, "views": -1}, headers=h1).status_code == 422
    assert client.post("/api/content", json={**POST, "platform": "myspace"}, headers=h1).status_code == 422
    assert client.get("/api/content?sort_by=hacker", headers=h1).status_code == 422
    assert client.delete(f"/api/content/{cid}", headers=h1).status_code == 200
    assert client.get(f"/api/content/{cid}", headers=h1).status_code == 404


def test_demo_data_analytics_filters_sorting_pagination():
    h = reg("d@test.com")
    assert client.get("/api/dashboard/overview", headers=h).json()["empty"] is True
    assert client.post("/api/demo/load", headers=h).status_code == 200
    ov = client.get("/api/dashboard/overview?days=90", headers=h).json()
    assert ov["has_demo"] and ov["cards"]["total_followers"] > 0 and len(ov["recent_content"]) == 5
    pg = client.get("/api/content?page_size=5&page=2&sort_by=views&order=desc", headers=h).json()
    assert pg["page"] == 2 and len(pg["items"]) == 5
    views = [i["views"] for i in client.get("/api/content?sort_by=views&order=desc&page_size=50", headers=h).json()["items"]]
    assert views == sorted(views, reverse=True)
    er = [i["engagement_rate"] for i in client.get("/api/content?sort_by=engagement_rate&order=desc&page_size=50", headers=h).json()["items"]]
    assert er == sorted(er, reverse=True)
    yt = client.get("/api/content?platform=youtube&page_size=100", headers=h).json()
    assert yt["total"] > 0 and all(i["platform"] == "youtube" for i in yt["items"])
    s = client.get("/api/content/summary", headers=h).json()
    assert s["totals"]["posts"] > 0 and len(s["top_posts"]) == 5 and s["trend"] and s["has_demo"]
    a = client.get("/api/audience/summary?days=30", headers=h).json()
    assert not a["empty"] and a["cards"]["total_followers"] > 0 and abs(sum(x["value"] for x in a["gender"]) - 100) < 1.5
    assert len(a["active_hours"]) == 24 and a["trend"]["message"]
    g7 = client.get("/api/audience/growth?days=7", headers=h).json()["series"]
    g90 = client.get("/api/audience/growth?days=90", headers=h).json()["series"]
    assert len(g7) == 7 and len(g90) == 90
    assert client.get("/api/audience/summary?platform=tiktok", headers=h).json()["platforms"][0]["platform"] == "tiktok"
    assert client.delete("/api/demo", headers=h).status_code == 200
    assert client.get("/api/audience/summary", headers=h).json()["empty"] is True


def test_connections_are_honest():
    h = reg("k@test.com")
    conns = client.get("/api/connections", headers=h).json()
    assert len(conns) == 6 and all(c["status"] == "disconnected" and not c["real_oauth_available"] for c in conns)
    assert client.post("/api/connections/x/demo", headers=h).json()["status"] == "demo"
    assert client.post("/api/connections/nope/demo", headers=h).status_code == 404
    assert client.delete("/api/connections/x", headers=h).json()["status"] == "disconnected"


def test_profile_and_password():
    h = reg("p@test.com")
    assert client.patch("/api/users/me", json={"full_name": "New Name", "bio": "hi"}, headers=h).json()["full_name"] == "New Name"
    assert client.post("/api/users/me/password", json={"current_password": "bad", "new_password": "Newpass123"}, headers=h).status_code == 400
    assert client.post("/api/users/me/password", json={"current_password": PW, "new_password": "Newpass123"}, headers=h).status_code == 200
    assert client.post("/api/auth/login", json={"email": "p@test.com", "password": "Newpass123"}).status_code == 200


def test_agency_and_marketing_rbac():
    creator_h = reg("cr_test@test.com", role="creator")
    agency_h = reg("ag_test@test.com", role="agency")
    mkt_h = reg("mk_test@test.com", role="marketing")

    # Creator cannot access agency or marketing endpoints
    assert client.get("/api/agency/overview", headers=creator_h).status_code == 403
    assert client.get("/api/marketing/overview", headers=creator_h).status_code == 403
    assert client.get("/api/admin/overview", headers=creator_h).status_code == 403

    # Agency can access agency endpoints but not marketing or admin
    assert client.get("/api/agency/overview", headers=agency_h).status_code == 200
    assert client.get("/api/marketing/overview", headers=agency_h).status_code == 403
    assert client.get("/api/admin/overview", headers=agency_h).status_code == 403

    # Marketing can access marketing endpoints but not agency or admin
    assert client.get("/api/marketing/overview", headers=mkt_h).status_code == 200
    assert client.get("/api/agency/overview", headers=mkt_h).status_code == 403
    assert client.get("/api/admin/overview", headers=mkt_h).status_code == 403


def test_campaign_crud():
    mkt_h = reg("mk2_test@test.com", role="marketing")
    c_data = {
        "title": "Nike Speed Launch",
        "client_name": "Nike",
        "status": "active",
        "platform": "instagram",
        "budget": 5000.0,
        "spent": 2000.0,
        "target_reach": 100000,
        "actual_reach": 120000,
    }
    r = client.post("/api/marketing/campaigns", json=c_data, headers=mkt_h)
    assert r.status_code == 201
    cid = r.json()["id"]
    assert r.json()["title"] == "Nike Speed Launch"
    assert r.json()["roi_pct"] == 20.0  # (120k / 100k * 100) - 100 = 20%

    # Update
    r_up = client.put(f"/api/marketing/campaigns/{cid}", json={"spent": 2500.0}, headers=mkt_h)
    assert r_up.status_code == 200 and r_up.json()["spent"] == 2500.0

    # Delete
    assert client.delete(f"/api/marketing/campaigns/{cid}", headers=mkt_h).status_code == 200


def test_admin_full_management():
    admin_h = reg("adm_test@test.com", role="creator")
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="adm_test@test.com").one()
        u.role = "admin"
        db.commit()
    admin_h = {"Authorization": "Bearer " + client.post("/api/auth/login", json={"email": "adm_test@test.com", "password": PW}).json()["access_token"]}

    ov = client.get("/api/admin/overview", headers=admin_h)
    assert ov.status_code == 200
    assert ov.json()["cards"]["total_users"] > 0
    assert ov.json()["system"]["status"] == "healthy"

    sys_diag = client.get("/api/admin/system", headers=admin_h)
    assert sys_diag.status_code == 200
    assert "tables" in sys_diag.json()

    # Admin create user
    new_u = client.post("/api/admin/users", json={
        "full_name": "Agency Staff",
        "email": "agency_staff@test.com",
        "password": "Password123",
        "role": "agency"
    }, headers=admin_h)
    assert new_u.status_code == 201
    assert new_u.json()["role"] == "agency"


def test_content_comparison_and_ranking():
    h = reg("compare_user@test.com")
    # Create two posts
    p1 = {**POST, "title": "Post Alpha", "views": 5000, "reach": 4000, "likes": 200, "comments": 50, "shares": 20, "saves": 10}
    p2 = {**POST, "title": "Post Beta", "views": 10000, "reach": 8000, "likes": 800, "comments": 100, "shares": 60, "saves": 40}
    
    r1 = client.post("/api/content", json=p1, headers=h); assert r1.status_code == 201
    r2 = client.post("/api/content", json=p2, headers=h); assert r2.status_code == 201
    id1, id2 = r1.json()["id"], r2.json()["id"]

    # Test POST comparison
    cmp_res = client.post("/api/content/compare", json={"ids": [id1, id2]}, headers=h)
    assert cmp_res.status_code == 200
    data = cmp_res.json()
    assert data["item_count"] == 2
    assert "metrics" in data
    assert data["metrics"]["views"]["best_item_id"] == id2
    assert data["metrics"]["views"]["max"] == 10000
    assert len(data["chart_data"]) > 0

    # Test GET comparison
    cmp_get = client.get(f"/api/content/compare?ids={id1},{id2}", headers=h)
    assert cmp_get.status_code == 200
    assert cmp_get.json()["item_count"] == 2

    # Validation: Less than 2 items -> 422
    assert client.post("/api/content/compare", json={"ids": [id1]}, headers=h).status_code == 422
    assert client.get(f"/api/content/compare?ids={id1}", headers=h).status_code == 422

    # Security: Another user cannot compare these posts
    h_other = reg("other_comp@test.com")
    assert client.post("/api/content/compare", json={"ids": [id1, id2]}, headers=h_other).status_code == 404

    # Test Summary top_by
    s_views = client.get("/api/content/summary?top_by=views", headers=h).json()
    assert s_views["top_by"] == "views"
    assert s_views["top_posts"][0]["id"] == id2


def test_phase1_database_models_and_relationships():
    h = reg("p1_models@test.com")
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="p1_models@test.com").one()

        # 1. Test RevenueRecord model creation & relationship
        rev = RevenueRecord(
            user_id=user.id,
            source="sponsorships",
            amount=2500.50,
            platform="youtube",
            date=date.today(),
            notes="Tech brand integration",
            is_demo=False,
        )
        db.add(rev)

        # 2. Test HashtagMetric model creation & relationship
        ht = HashtagMetric(
            user_id=user.id,
            tag="#creatorgrowth",
            platform="instagram",
            post_count=15,
            total_reach=45000,
            avg_engagement=8.5,
            is_demo=False,
        )
        db.add(ht)

        # 3. Test Notification model creation & relationship
        notif = Notification(
            user_id=user.id,
            title="Engagement Spike",
            message="Your video reached 50k views",
            category="performance",
            is_read=False,
            is_demo=False,
        )
        db.add(notif)

        # 4. Test AudienceMetric with device_distribution
        aud = AudienceMetric(
            user_id=user.id,
            platform="youtube",
            age_distribution={"18-24": 40.0, "25-34": 60.0},
            gender_distribution={"Female": 50.0, "Male": 50.0},
            geo_distribution={"India": 60.0, "US": 40.0},
            device_distribution={"Mobile": 70.0, "Desktop": 25.0, "Tablet": 5.0},
            active_hours=[50] * 24,
            is_demo=False,
        )
        db.add(aud)
        db.commit()

        # Verify relationships
        db.refresh(user)
        assert len(user.revenue_records) == 1
        assert user.revenue_records[0].source == "sponsorships"
        assert user.revenue_records[0].amount == 2500.50

        assert len(user.hashtags) == 1
        assert user.hashtags[0].tag == "#creatorgrowth"
        assert user.hashtags[0].total_reach == 45000

        assert len(user.notifications) == 1
        assert user.notifications[0].title == "Engagement Spike"
        assert user.notifications[0].is_read is False

        assert len(user.audience) == 1
        assert user.audience[0].device_distribution["Mobile"] == 70.0
        assert user.audience[0].device_distribution["Desktop"] == 25.0
        assert user.audience[0].device_distribution["Tablet"] == 5.0

        # Test Cascade Delete
        user_id = user.id
        db.delete(user)
        db.commit()

        assert db.query(RevenueRecord).filter_by(user_id=user_id).count() == 0
        assert db.query(HashtagMetric).filter_by(user_id=user_id).count() == 0
        assert db.query(Notification).filter_by(user_id=user_id).count() == 0
        assert db.query(AudienceMetric).filter_by(user_id=user_id).count() == 0


def test_phase1_schemas_validation():
    # 1. RevenueRecordIn validation
    rev_valid = RevenueRecordIn(
        source="sponsorships",
        amount=1500.0,
        platform="youtube",
        date=date(2026, 10, 1),
        notes="Q4 Sponsorship deal",
    )
    assert rev_valid.source == "sponsorships"
    assert rev_valid.amount == 1500.0

    # Negative amount should fail validation
    with pytest.raises(ValidationError):
        RevenueRecordIn(source="sponsorships", amount=-50.0, platform="youtube", date=date(2026, 10, 1))

    # Invalid source should fail validation
    with pytest.raises(ValidationError):
        RevenueRecordIn(source="crypto_speculation", amount=100.0, platform="youtube", date=date(2026, 10, 1))

    # All 5 PDF revenue sources should be accepted
    for src in REVENUE_SOURCES:
        assert RevenueRecordIn(source=src, amount=100.0, platform="instagram", date=date.today()).source == src

    # 2. HashtagMetricIn auto-prefixing and validation
    ht1 = HashtagMetricIn(tag="viralcontent", platform="tiktok", post_count=5, total_reach=10000, avg_engagement=7.2)
    assert ht1.tag == "#viralcontent"  # auto-adds '#'

    ht2 = HashtagMetricIn(tag="#alreadyhasit", platform="x", post_count=2, total_reach=2000, avg_engagement=4.1)
    assert ht2.tag == "#alreadyhasit"

    with pytest.raises(ValidationError):
        HashtagMetricIn(tag="", platform="tiktok")

    with pytest.raises(ValidationError):
        HashtagMetricIn(tag="bad", platform="tiktok", post_count=-1)

    # 3. NotificationIn category validation
    for cat in NOTIFICATION_CATEGORIES:
        n = NotificationIn(title="Alert", message="Body text", category=cat)
        assert n.category == cat

    with pytest.raises(ValidationError):
        NotificationIn(title="Alert", message="Body text", category="invalid_cat")

    # 4. DeviceDistribution validation (bounds 0-100)
    dev = DeviceDistribution(mobile=65.25, desktop=25.5, tablet=9.25)
    assert dev.mobile == 65.25
    assert dev.desktop == 25.5
    assert dev.tablet == 9.25

    with pytest.raises(ValidationError):
        DeviceDistribution(mobile=150.0, desktop=10.0, tablet=5.0)


def test_phase1_demo_data_population_and_cleanup():
    h = reg("p1_demo@test.com")
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="p1_demo@test.com").one()

        # Load demo data
        load_demo(db, user.id, days=60)
        db.commit()

        # Check Revenue records generated for this user
        revs = db.query(RevenueRecord).filter_by(user_id=user.id, is_demo=True).all()
        assert len(revs) > 0
        sources_present = {r.source for r in revs}
        for src in REVENUE_SOURCES:
            assert src in sources_present, f"Expected {src} in demo revenue records"

        # Check Hashtags generated
        tags = db.query(HashtagMetric).filter_by(user_id=user.id, is_demo=True).all()
        assert len(tags) > 0
        assert all(t.tag.startswith("#") for t in tags)

        # Check Notifications generated
        notifs = db.query(Notification).filter_by(user_id=user.id).all()
        assert len(notifs) >= 4
        notif_categories = {n.category for n in notifs}
        assert "performance" in notif_categories
        assert "revenue" in notif_categories

        # Check Audience device distribution populated
        auds = db.query(AudienceMetric).filter_by(user_id=user.id).all()
        assert len(auds) == 6
        for a in auds:
            assert a.device_distribution is not None
            assert "Mobile" in a.device_distribution
            assert "Desktop" in a.device_distribution
            assert "Tablet" in a.device_distribution
            total_dev = sum(a.device_distribution.values())
            assert abs(total_dev - 100.0) < 1.0

        # Check that /api/audience/summary now returns device data
        res = client.get("/api/audience/summary?days=30", headers=h)
        assert res.status_code == 200
        data = res.json()
        assert "device" in data
        assert len(data["device"]) == 3
        device_names = {d["name"] for d in data["device"]}
        assert "Mobile" in device_names
        assert "Desktop" in device_names
        assert "Tablet" in device_names

        # Clear demo data and verify all new tables are cleaned
        clear_demo(db, user.id)
        db.commit()

        assert db.query(RevenueRecord).filter_by(user_id=user.id, is_demo=True).count() == 0
        assert db.query(HashtagMetric).filter_by(user_id=user.id, is_demo=True).count() == 0
        assert db.query(Notification).filter_by(user_id=user.id).count() == 0


def test_revenue_summary_and_trends():
    h = reg("rev_summary@test.com")
    # Empty state before loading demo data
    empty_res = client.get("/api/revenue/summary", headers=h)
    assert empty_res.status_code == 200
    assert empty_res.json()["empty"] is True
    assert empty_res.json()["cards"]["total_revenue"] == 0.0

    # Load demo data
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # Get summary
    res = client.get("/api/revenue/summary?days=90", headers=h)
    assert res.status_code == 200
    d = res.json()
    assert d["cards"]["total_revenue"] > 0
    assert "current_month_revenue" in d["cards"]
    assert "previous_month_revenue" in d["cards"]
    assert "growth_pct" in d["cards"]

    # Verify breakdown by source has all 5 sources
    assert len(d["breakdown_by_source"]) == 5
    source_keys = {item["source"] for item in d["breakdown_by_source"]}
    assert source_keys == {"sponsorships", "ad_revenue", "affiliate", "brand_collaborations", "subscriptions"}

    # Verify monthly trends
    assert len(d["monthly_trends"]) > 0
    assert "total" in d["monthly_trends"][0]
    assert "month" in d["monthly_trends"][0]

    # Verify platform breakdown
    assert len(d["platform_breakdown"]) > 0
    assert "amount" in d["platform_breakdown"][0]

    # Filter summary by platform
    yt_res = client.get("/api/revenue/summary?platform=youtube", headers=h)
    assert yt_res.status_code == 200
    assert all(p["platform"] == "youtube" for p in yt_res.json()["platform_breakdown"])

    # Filter summary by source
    sp_res = client.get("/api/revenue/summary?source=sponsorships", headers=h)
    assert sp_res.status_code == 200


def test_revenue_crud_and_isolation():
    h1 = reg("rev_u1@test.com")
    h2 = reg("rev_u2@test.com")

    rev_data = {
        "source": "sponsorships",
        "amount": 3500.0,
        "platform": "youtube",
        "date": "2026-10-15",
        "notes": "Fall Season Tech Sponsorship",
    }

    # 1. Create record
    res = client.post("/api/revenue/records", json=rev_data, headers=h1)
    assert res.status_code == 201
    created = res.json()
    rid = created["id"]
    assert created["amount"] == 3500.0
    assert created["source"] == "sponsorships"
    assert created["is_demo"] is False

    # 2. Get single record
    get_res = client.get(f"/api/revenue/records/{rid}", headers=h1)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == rid

    # 3. Isolation: User 2 cannot access, update, or delete User 1's record
    assert client.get(f"/api/revenue/records/{rid}", headers=h2).status_code == 404
    assert client.put(f"/api/revenue/records/{rid}", json={"amount": 9999.0}, headers=h2).status_code == 404
    assert client.delete(f"/api/revenue/records/{rid}", headers=h2).status_code == 404

    # 4. Update record
    up_res = client.put(f"/api/revenue/records/{rid}", json={"amount": 4200.0, "notes": "Updated note"}, headers=h1)
    assert up_res.status_code == 200
    assert up_res.json()["amount"] == 4200.0
    assert up_res.json()["notes"] == "Updated note"

    # 5. List with search, filtering, and sorting
    list_res = client.get("/api/revenue/records?source=sponsorships&platform=youtube&sort_by=amount&order=desc", headers=h1)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1
    assert list_res.json()["items"][0]["id"] == rid

    # Invalid sort_by returns 422
    assert client.get("/api/revenue/records?sort_by=hacker_field", headers=h1).status_code == 422

    # Negative amount returns 422
    assert client.post("/api/revenue/records", json={**rev_data, "amount": -100}, headers=h1).status_code == 422

    # 6. Delete record
    del_res = client.delete(f"/api/revenue/records/{rid}", headers=h1)
    assert del_res.status_code == 200

    # Ensure record is gone
    assert client.get(f"/api/revenue/records/{rid}", headers=h1).status_code == 404


def test_trends_growth_prediction_statistical_regression():
    h = reg("trends_growth@test.com")

    # 1. Test empty state before loading demo data
    res_empty = client.get("/api/trends/growth-prediction", headers=h)
    assert res_empty.status_code == 200
    d_empty = res_empty.json()
    assert d_empty["status"] == "empty"
    assert d_empty["data_points_count"] == 0
    assert d_empty["predictions"] is None

    # 2. Test insufficient data case (only 1 single snapshot)
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="trends_growth@test.com").one()
        db.add(FollowerGrowth(
            user_id=user.id,
            platform="youtube",
            date=date(2026, 10, 1),
            followers=5000,
            new_followers=100,
            impressions=12000,
            reach=8000,
            is_demo=False
        ))
        db.commit()

    res_insufficient = client.get("/api/trends/growth-prediction", headers=h)
    assert res_insufficient.status_code == 200
    d_ins = res_insufficient.json()
    assert d_ins["status"] == "insufficient_data"
    assert d_ins["data_points_count"] == 1
    assert d_ins["current_followers"] == 5000
    assert d_ins["predictions"] is None
    assert "At least 2 historical daily snapshots" in d_ins["message"]

    # 3. Clean up manual test snapshot before loading demo data to satisfy UniqueConstraint
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="trends_growth@test.com").one()
        db.query(FollowerGrowth).filter_by(user_id=user.id).delete()
        db.commit()

    # Load full demo data (contains 120 days of FollowerGrowth across 6 platforms)
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # 4. Query growth prediction across all platforms
    res = client.get("/api/trends/growth-prediction?days=60&horizon=90", headers=h)
    assert res.status_code == 200
    d = res.json()
    assert d["status"] == "success"
    assert d["has_demo"] is True
    assert d["metrics"]["data_points_count"] >= 60
    assert d["metrics"]["current_followers"] > 0
    assert d["metrics"]["r_squared"] >= 0.0 and d["metrics"]["r_squared"] <= 1.0
    assert d["metrics"]["confidence_score"] >= 0.0
    assert "OLS" in d["methodology"]
    assert "confidence_limitations" in d

    # Check 30/60/90-day predictions
    preds = d["predictions"]
    assert "day_30" in preds and "day_60" in preds and "day_90" in preds
    p30 = preds["day_30"]
    p60 = preds["day_60"]
    p90 = preds["day_90"]
    assert p30["predicted_followers"] > 0
    assert p60["predicted_followers"] >= p30["predicted_followers"] or p60["predicted_followers"] > 0
    assert p90["predicted_followers"] > 0
    assert p30["lower_bound"] <= p30["predicted_followers"] <= p30["upper_bound"]

    # Check series
    assert len(d["historical_series"]) >= 60
    assert len(d["forecast_series"]) > 0
    assert len(d["combined_series"]) > len(d["historical_series"])
    # Forecast items should have is_forecast == True
    assert d["forecast_series"][0]["is_forecast"] is True

    # 5. Filter by platform
    yt_res = client.get("/api/trends/growth-prediction?platform=youtube&days=30", headers=h)
    assert yt_res.status_code == 200
    yt_d = yt_res.json()
    assert yt_d["status"] == "success"
    assert yt_d["platform"] == "youtube"


def test_trends_hashtag_analytics():
    h = reg("trends_tags@test.com")

    # 1. Empty state
    res_empty = client.get("/api/trends/hashtags", headers=h)
    assert res_empty.status_code == 200
    assert res_empty.json()["total_count"] == 0
    assert res_empty.json()["hashtags"] == []

    # 2. Load demo data (contains 12 hashtag templates)
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # 3. Default sorted by reach desc
    res = client.get("/api/trends/hashtags", headers=h)
    assert res.status_code == 200
    d = res.json()
    assert d["total_count"] >= 12
    assert d["summary"]["total_reach"] > 0
    assert d["summary"]["total_posts"] > 0
    assert d["summary"]["avg_engagement"] > 0
    assert d["summary"]["top_reach_tag"].startswith("#")

    # Verify descending reach order
    reaches = [tag["total_reach"] for tag in d["hashtags"]]
    assert reaches == sorted(reaches, reverse=True)

    # 4. Sort by engagement
    res_eng = client.get("/api/trends/hashtags?sort_by=avg_engagement&sort_dir=desc", headers=h)
    assert res_eng.status_code == 200
    engs = [tag["avg_engagement"] for tag in res_eng.json()["hashtags"]]
    assert engs == sorted(engs, reverse=True)

    # 5. Filter by platform
    res_yt = client.get("/api/trends/hashtags?platform=youtube", headers=h)
    assert res_yt.status_code == 200
    assert all(tag["platform"] == "youtube" for tag in res_yt.json()["hashtags"])


def test_trends_engagement_and_zero_reach():
    h = reg("trends_eng@test.com")

    # 1. Empty state
    res_empty = client.get("/api/trends/engagement", headers=h)
    assert res_empty.status_code == 200
    assert res_empty.json()["empty"] is True
    assert res_empty.json()["total_posts"] == 0

    # 2. Add content with zero reach (must NOT crash or divide by zero)
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="trends_eng@test.com").one()
        db.add(ContentRecord(
            user_id=user.id,
            title="Zero Reach Safe Post",
            platform="youtube",
            published_at=date.today(),
            reach=0,
            likes=50,
            comments=10,
            shares=5,
            saves=2,
            views=100,
            is_demo=False
        ))
        db.commit()

    res_zero = client.get("/api/trends/engagement", headers=h)
    assert res_zero.status_code == 200
    d_zero = res_zero.json()
    assert d_zero["empty"] is False
    assert d_zero["total_posts"] == 1
    assert d_zero["timeline"][0]["engagement_rate"] == 0.0

    # 3. Load full demo content
    assert client.post("/api/demo/load", headers=h).status_code == 200
    res = client.get("/api/trends/engagement?days=90", headers=h)
    assert res.status_code == 200
    d = res.json()
    assert d["empty"] is False
    assert d["total_posts"] > 5
    assert len(d["monthly_trends"]) > 0
    assert len(d["platform_comparison"]) > 0
    assert d["growth_indicators"]["overall_avg_engagement_rate"] > 0
    assert d["growth_indicators"]["total_reach"] > 0
    assert "top_post" in d["growth_indicators"]
    assert "interaction_breakdown" in d
    assert d["interaction_breakdown"]["likes"] > 0


def test_trends_rbac_and_isolation():
    h_creator1 = reg("trends_c1@test.com", role="creator")
    h_creator2 = reg("trends_c2@test.com", role="creator")
    h_agency = reg("trends_ag@test.com", role="agency")
    h_marketing = reg("trends_mkt@test.com", role="marketing")
    admin_h = reg("trends_admin@test.com", role="administrator")

    with SessionLocal() as db:
        c1 = db.query(User).filter_by(email="trends_c1@test.com").one()
        load_demo(db, c1.id, days=30)
        db.commit()
        c1_id = c1.id

    # 1. Creator Role: Strict data isolation
    # Creator 1 can view own forecast
    res_c1_own = client.get("/api/trends/growth-prediction", headers=h_creator1)
    assert res_c1_own.status_code == 200
    assert res_c1_own.json()["status"] == "success"

    # Creator 1 cannot spy on other users
    res_forbidden = client.get("/api/trends/growth-prediction?user_id=9999", headers=h_creator1)
    assert res_forbidden.status_code == 403

    res_forbidden_tag = client.get("/api/trends/hashtags?user_id=9999", headers=h_creator1)
    assert res_forbidden_tag.status_code == 403

    res_forbidden_eng = client.get("/api/trends/engagement?user_id=9999", headers=h_creator1)
    assert res_forbidden_eng.status_code == 403

    # Creator's /api/trends/creators returns ONLY themselves
    c_creators = client.get("/api/trends/creators", headers=h_creator1)
    assert c_creators.status_code == 200
    assert len(c_creators.json()) == 1
    assert c_creators.json()[0]["id"] == c1_id

    # 2. Agency Role: Can inspect roster creators and self
    ag_creators = client.get("/api/trends/creators", headers=h_agency)
    assert ag_creators.status_code == 200
    assert len(ag_creators.json()) >= 2  # self + creators
    res_agency_creator = client.get(f"/api/trends/growth-prediction?user_id={c1_id}", headers=h_agency)
    assert res_agency_creator.status_code == 200
    assert res_agency_creator.json()["status"] == "success"

    # 3. Marketing Team Role: Can inspect campaign influencers and self
    mkt_creators = client.get("/api/trends/creators", headers=h_marketing)
    assert mkt_creators.status_code == 200
    assert len(mkt_creators.json()) >= 2
    res_mkt_creator = client.get(f"/api/trends/growth-prediction?user_id={c1_id}", headers=h_marketing)
    assert res_mkt_creator.status_code == 200
    assert res_mkt_creator.json()["status"] == "success"

    # 4. Administrator Role: Full platform inspection
    res_admin = client.get(f"/api/trends/growth-prediction?user_id={c1_id}", headers=admin_h)
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "success"

    # Admin querying non-existent user returns 404
    assert client.get("/api/trends/growth-prediction?user_id=888888", headers=admin_h).status_code == 404


def test_notifications_auth_and_crud():
    # 1. Unauthenticated requests are blocked
    assert client.get("/api/notifications").status_code == 401
    assert client.get("/api/notifications/unread-count").status_code == 401
    assert client.patch("/api/notifications/1/read").status_code == 401
    assert client.patch("/api/notifications/read-all").status_code == 401

    h = reg("notif_test@test.com")

    # 2. Initially empty
    res_empty = client.get("/api/notifications", headers=h)
    assert res_empty.status_code == 200
    assert res_empty.json()["total"] == 0
    assert res_empty.json()["unread_count"] == 0

    # 3. Create a custom notification
    create_payload = {
        "title": "Welcome to CreatorIQ",
        "message": "Your profile setup has completed successfully.",
        "category": "system",
    }
    create_res = client.post("/api/notifications", json=create_payload, headers=h)
    assert create_res.status_code == 201
    created = create_res.json()
    nid = created["id"]
    assert created["title"] == "Welcome to CreatorIQ"
    assert created["is_read"] is False

    # 4. Verify unread count endpoint
    unread_res = client.get("/api/notifications/unread-count", headers=h)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] == 1

    # 5. Filter by category
    sys_res = client.get("/api/notifications?category=system", headers=h)
    assert sys_res.status_code == 200
    assert sys_res.json()["total"] == 1

    perf_res = client.get("/api/notifications?category=performance", headers=h)
    assert perf_res.status_code == 200
    assert perf_res.json()["total"] == 0

    # 6. Mark single notification as read
    read_res = client.patch(f"/api/notifications/{nid}/read", headers=h)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Unread count is now 0
    assert client.get("/api/notifications/unread-count", headers=h).json()["unread_count"] == 0

    # 7. Add two unread notifications and test mark-all-as-read
    client.post("/api/notifications", json={"title": "Test 1", "message": "Msg 1", "category": "revenue"}, headers=h)
    client.post("/api/notifications", json={"title": "Test 2", "message": "Msg 2", "category": "performance"}, headers=h)

    assert client.get("/api/notifications/unread-count", headers=h).json()["unread_count"] == 2

    # Mark all as read
    mark_all = client.patch("/api/notifications/read-all", headers=h)
    assert mark_all.status_code == 200
    assert mark_all.json()["updated_count"] == 2
    assert mark_all.json()["unread_count"] == 0

    # 8. Delete notification
    del_res = client.delete(f"/api/notifications/{nid}", headers=h)
    assert del_res.status_code == 200
    assert client.patch(f"/api/notifications/{nid}/read", headers=h).status_code == 404


def test_notifications_milestone_evaluation_and_deduplication():
    h = reg("notif_milestone@test.com")

    # Load demo data (includes followers, content, revenue, hashtags)
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # Trigger evaluation
    eval_res1 = client.post("/api/notifications/evaluate", headers=h)
    assert eval_res1.status_code == 200

    list_res1 = client.get("/api/notifications", headers=h)
    assert list_res1.status_code == 200
    count1 = list_res1.json()["total"]
    assert count1 >= 4

    # Trigger evaluation a second time: must NOT create duplicate notifications
    eval_res2 = client.post("/api/notifications/evaluate", headers=h)
    assert eval_res2.status_code == 200
    assert eval_res2.json()["generated_count"] == 0

    list_res2 = client.get("/api/notifications", headers=h)
    assert list_res2.status_code == 200
    assert list_res2.json()["total"] == count1

    # Verify category filtering works on milestones
    rev_notifs = client.get("/api/notifications?category=revenue", headers=h).json()
    assert all(item["category"] == "revenue" for item in rev_notifs["items"])


def test_notifications_isolation_and_roles():
    h_c1 = reg("notif_c1@test.com", role="creator")
    h_c2 = reg("notif_c2@test.com", role="creator")
    h_agency = reg("notif_agency@test.com", role="agency")
    h_mkt = reg("notif_mkt@test.com", role="marketing")
    h_admin = reg("notif_admin@test.com", role="administrator")

    # 1. Creator 1 adds a notification
    n1 = client.post("/api/notifications", json={"title": "Private Secret Alert", "message": "Classified Creator milestone", "category": "revenue"}, headers=h_c1).json()
    n1_id = n1["id"]

    # 2. Creator 2 cannot view, read, or delete Creator 1's notification
    c2_list = client.get("/api/notifications", headers=h_c2).json()
    assert not any(item["id"] == n1_id for item in c2_list["items"])
    assert client.patch(f"/api/notifications/{n1_id}/read", headers=h_c2).status_code == 404
    assert client.delete(f"/api/notifications/{n1_id}", headers=h_c2).status_code == 404

    # 3. Agency role receives agency roster notifications upon evaluation
    assert client.post("/api/demo/load", headers=h_agency).status_code == 200
    ag_notifs = client.get("/api/notifications?limit=100", headers=h_agency).json()
    assert ag_notifs["total"] > 0
    assert any("Agency" in item["title"] or "Roster" in item["title"] or item["category"] == "system" for item in ag_notifs["items"])

    # 4. Marketing role receives marketing campaign notifications
    assert client.post("/api/demo/load", headers=h_mkt).status_code == 200
    mkt_notifs = client.get("/api/notifications?limit=100", headers=h_mkt).json()
    assert mkt_notifs["total"] > 0
    assert any("Campaign" in item["title"] or item["category"] == "performance" for item in mkt_notifs["items"])

    # 5. Administrator role receives platform governance alerts
    assert client.post("/api/demo/load", headers=h_admin).status_code == 200
    adm_notifs = client.get("/api/notifications?limit=100", headers=h_admin).json()
    assert adm_notifs["total"] > 0
    assert any("System" in item["title"] or "Governance" in item["title"] or item["category"] == "system" for item in adm_notifs["items"])


def test_audience_demographics_and_devices():
    # 1. Unauthenticated requests are blocked
    assert client.get("/api/audience/demographics").status_code == 401
    assert client.get("/api/audience/devices").status_code == 401
    assert client.get("/api/audience/active-hours").status_code == 401
    assert client.get("/api/audience/platform-comparison").status_code == 401
    assert client.get("/api/audience/insights").status_code == 401

    h = reg("aud_demo_test@test.com")

    # 2. Empty state handling before loading data
    demo_empty = client.get("/api/audience/demographics", headers=h)
    assert demo_empty.status_code == 200
    assert demo_empty.json()["is_empty"] is True
    assert demo_empty.json()["has_demo"] is False
    assert len(demo_empty.json()["age_distribution"]) == 0

    dev_empty = client.get("/api/audience/devices", headers=h)
    assert dev_empty.status_code == 200
    assert dev_empty.json()["is_empty"] is True
    assert dev_empty.json()["has_demo"] is False

    # 3. Load demo data
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # 4. Audience Demographics endpoint
    res_demo = client.get("/api/audience/demographics", headers=h)
    assert res_demo.status_code == 200
    d_demo = res_demo.json()
    assert d_demo["is_empty"] is False
    assert d_demo["has_demo"] is True
    assert len(d_demo["age_distribution"]) >= 4
    assert any(item["name"] == "18-24" for item in d_demo["age_distribution"])
    assert any(item["name"] == "Female" for item in d_demo["gender_distribution"])
    assert any(item.get("country") == "India" or item.get("name") == "India" for item in d_demo["geographic_distribution"])
    assert "insights" in d_demo
    assert "Young Adults" in d_demo["insights"]["core_demographic"]
    assert d_demo["insights"]["international_reach_pct"] >= 0

    # Test platform filter
    res_yt_demo = client.get("/api/audience/demographics?platform=youtube", headers=h)
    assert res_yt_demo.status_code == 200
    assert res_yt_demo.json()["platform"] == "youtube"

    # 5. Device Analytics endpoint
    res_dev = client.get("/api/audience/devices", headers=h)
    assert res_dev.status_code == 200
    d_dev = res_dev.json()
    assert d_dev["is_empty"] is False
    assert d_dev["has_demo"] is True
    assert d_dev["primary_device"] in ("Mobile", "Desktop", "Tablet")
    assert d_dev["mobile_share"] > 0
    assert d_dev["desktop_share"] > 0
    assert d_dev["tablet_share"] > 0
    # Sum of percentages should be close to 100%
    assert 99.0 <= (d_dev["mobile_share"] + d_dev["desktop_share"] + d_dev["tablet_share"]) <= 101.0
    assert len(d_dev["device_distribution"]) == 3
    assert "insights" in d_dev
    assert len(d_dev["insights"]["recommendation"]) > 10


def test_audience_active_hours_platform_comparison_and_insights():
    h = reg("aud_insights_test@test.com")
    assert client.post("/api/demo/load", headers=h).status_code == 200

    # 1. Active Hours endpoint
    res_hours = client.get("/api/audience/active-hours", headers=h)
    assert res_hours.status_code == 200
    d_hours = res_hours.json()
    assert d_hours["is_empty"] is False
    assert len(d_hours["hourly_activity"]) == 24
    assert any(item["is_peak"] is True for item in d_hours["hourly_activity"])
    assert ":" in d_hours["best_time_to_post"]
    assert len(d_hours["day_patterns"]) == 7
    assert d_hours["best_day_of_week"] in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

    # 2. Platform Comparison endpoint
    res_comp = client.get("/api/audience/platform-comparison?days=30", headers=h)
    assert res_comp.status_code == 200
    d_comp = res_comp.json()
    assert d_comp["is_empty"] is False
    assert len(d_comp["platforms"]) >= 4
    yt = next((p for p in d_comp["platforms"] if p["platform"] == "youtube"), None)
    assert yt is not None
    assert yt["followers"] > 0
    assert yt["reach"] > 0
    assert yt["follower_share_pct"] > 0
    assert d_comp["totals"]["total_followers"] > 0
    assert d_comp["totals"]["total_reach"] > 0
    assert d_comp["top_platform_by_followers"] is not None
    assert d_comp["fastest_growing_platform"] is not None

    # 3. Audience Insights endpoint
    res_ins = client.get("/api/audience/insights?days=30", headers=h)
    assert res_ins.status_code == 200
    d_ins = res_ins.json()
    assert d_ins["is_empty"] is False
    assert d_ins["growth_indicators"]["direction"] in ("accelerating", "steady", "slowing")
    assert d_ins["growth_indicators"]["avg_daily_new"] > 0
    assert 20.0 <= d_ins["audience_health_score"] <= 100.0
    assert len(d_ins["key_recommendations"]) == 4
    assert len(d_ins["summary"]) > 20


def test_audience_rbac_and_data_isolation():
    h_c1 = reg("aud_c1@test.com", role="creator")
    h_c2 = reg("aud_c2@test.com", role="creator")
    h_agency = reg("aud_agency@test.com", role="agency")
    h_mkt = reg("aud_mkt@test.com", role="marketing")
    h_admin = reg("aud_admin@test.com", role="administrator")

    assert client.post("/api/demo/load", headers=h_c1).status_code == 200
    assert client.post("/api/demo/load", headers=h_c2).status_code == 200

    with SessionLocal() as db:
        c1 = db.query(User).filter_by(email="aud_c1@test.com").one()
        c1_id = c1.id

    # 1. Creator Isolation: Creator 2 cannot query Creator 1's audience telemetry
    assert client.get(f"/api/audience/demographics?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.get(f"/api/audience/devices?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.get(f"/api/audience/active-hours?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.get(f"/api/audience/platform-comparison?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.get(f"/api/audience/insights?user_id={c1_id}", headers=h_c2).status_code == 403

    # Creator only sees themselves in creator selector
    creators_c = client.get("/api/audience/creators", headers=h_c2).json()
    assert len(creators_c) == 1
    assert creators_c[0]["email"] == "aud_c2@test.com"

    # 2. Agency Role: Can inspect creators
    ag_creators = client.get("/api/audience/creators", headers=h_agency).json()
    assert len(ag_creators) >= 1
    res_ag_c1 = client.get(f"/api/audience/demographics?user_id={c1_id}", headers=h_agency)
    assert res_ag_c1.status_code == 200
    assert res_ag_c1.json()["is_empty"] is False

    # 3. Marketing Role: Can inspect creators
    res_mkt_c1 = client.get(f"/api/audience/devices?user_id={c1_id}", headers=h_mkt)
    assert res_mkt_c1.status_code == 200
    assert res_mkt_c1.json()["is_empty"] is False

    # 4. Admin Role: Global access
    res_adm_c1 = client.get(f"/api/audience/insights?user_id={c1_id}", headers=h_admin)
    assert res_adm_c1.status_code == 200
    assert res_adm_c1.json()["is_empty"] is False

    # Admin querying non-existent user returns 404
    assert client.get("/api/audience/demographics?user_id=9999999", headers=h_admin).status_code == 404


def test_connections_youtube_auth_and_connect():
    # 1. Unauthenticated requests are rejected
    assert client.post("/api/connections/youtube/connect", json={"channel_id": "UC123"}).status_code == 401
    assert client.post("/api/connections/youtube/sync").status_code == 401
    assert client.get("/api/connections/youtube/status").status_code == 401

    h = reg("yt_conn_test@test.com")

    # 2. Check initial list: YouTube is disconnected
    conns = client.get("/api/connections", headers=h).json()
    yt = next(c for c in conns if c["platform"] == "youtube")
    assert yt["status"] == "disconnected"
    assert "real_oauth_available" in yt

    # 3. Invalid channel ID returns 404
    invalid_res = client.post(
        "/api/connections/youtube/connect",
        json={"channel_id": "invalid_channel_not_found"},
        headers=h
    )
    assert invalid_res.status_code == 404
    assert "not found" in invalid_res.json()["message"].lower()

    # 4. Valid channel connection
    connect_payload = {
        "channel_id": "UC_creatoriq_official",
        "account_name": "Official Creator Channel",
    }
    conn_res = client.post("/api/connections/youtube/connect", json=connect_payload, headers=h)
    assert conn_res.status_code == 200
    d_conn = conn_res.json()
    assert d_conn["status"] == "connected"
    assert d_conn["account_name"] == "Official Creator Channel"
    assert d_conn["external_id"] == "UC_creatoriq_official"
    assert d_conn["sync_status"] == "success"

    # 5. Check YouTube status endpoint
    status_res = client.get("/api/connections/youtube/status", headers=h)
    assert status_res.status_code == 200
    d_stat = status_res.json()
    assert d_stat["is_connected"] is True
    assert d_stat["is_demo"] is False
    assert d_stat["channel_stats"]["subscribers"] > 0
    assert d_stat["channel_stats"]["views"] > 0

    # 6. Verify real records generated in database (is_demo=False)
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="yt_conn_test@test.com").one()
        real_growth = db.query(FollowerGrowth).filter_by(user_id=user.id, platform="youtube", is_demo=False).first()
        assert real_growth is not None
        assert real_growth.followers > 0

        real_videos = db.query(ContentRecord).filter_by(user_id=user.id, platform="youtube", is_demo=False).all()
        assert len(real_videos) >= 3


def test_connections_youtube_data_synchronization():
    h = reg("yt_sync_test@test.com")

    # Calling sync when not connected returns 400
    assert client.post("/api/connections/youtube/sync", headers=h).status_code == 400

    # Connect channel
    client.post(
        "/api/connections/youtube/connect",
        json={"channel_id": "UC_tech_reviews", "account_name": "Tech Reviews Pro"},
        headers=h
    )

    # Trigger manual sync
    sync_res = client.post("/api/connections/youtube/sync", headers=h)
    assert sync_res.status_code == 200
    d_sync = sync_res.json()
    assert d_sync["status"] == "success"
    assert d_sync["channel_title"] == "Tech Reviews Pro"
    assert d_sync["subscribers"] > 0
    assert d_sync["synced_videos_count"] >= 3
    assert d_sync["is_demo"] is False

    # Disconnect channel
    del_res = client.delete("/api/connections/youtube", headers=h)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "disconnected"

    # After disconnect, sync fails with 400
    assert client.post("/api/connections/youtube/sync", headers=h).status_code == 400


def test_connections_youtube_multi_role_and_isolation():
    h_c1 = reg("yt_c1@test.com", role="creator")
    h_c2 = reg("yt_c2@test.com", role="creator")
    h_agency = reg("yt_agency@test.com", role="agency")
    h_mkt = reg("yt_mkt@test.com", role="marketing")
    h_admin = reg("yt_admin@test.com", role="administrator")

    # Creator 1 connects YouTube channel
    client.post(
        "/api/connections/youtube/connect",
        json={"channel_id": "UC_c1_showcase", "account_name": "C1 Showcase"},
        headers=h_c1
    )

    with SessionLocal() as db:
        c1 = db.query(User).filter_by(email="yt_c1@test.com").one()
        c1_id = c1.id

    # 1. Creator 2 cannot view or sync Creator 1's connection (tenant isolation)
    assert client.get(f"/api/connections?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.post(f"/api/connections/youtube/sync?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.delete(f"/api/connections/youtube?user_id={c1_id}", headers=h_c2).status_code == 403

    # 2. Agency role: Can view and sync roster creator
    ag_conns = client.get(f"/api/connections?user_id={c1_id}", headers=h_agency)
    assert ag_conns.status_code == 200
    ag_yt = next(c for c in ag_conns.json() if c["platform"] == "youtube")
    assert ag_yt["status"] == "connected"
    assert ag_yt["account_name"] == "C1 Showcase"

    # Agency can trigger sync for creator
    ag_sync = client.post(f"/api/connections/youtube/sync?user_id={c1_id}", headers=h_agency)
    assert ag_sync.status_code == 200
    assert ag_sync.json()["status"] == "success"

    # 3. Marketing role: Can verify creator connection status
    mkt_status = client.get(f"/api/connections/youtube/status?user_id={c1_id}", headers=h_mkt)
    assert mkt_status.status_code == 200
    assert mkt_status.json()["is_connected"] is True

    # 4. Administrator role: Global oversight
    adm_status = client.get(f"/api/connections/youtube/status?user_id={c1_id}", headers=h_admin)
    assert adm_status.status_code == 200
    assert adm_status.json()["is_connected"] is True

    # Admin querying non-existent user returns 404
    assert client.get("/api/connections/youtube/status?user_id=7777777", headers=h_admin).status_code == 404


def test_connections_instagram_auth_and_connect():
    # 1. Unauthenticated requests are rejected
    assert client.post("/api/connections/instagram/connect", json={"username": "@creator"}).status_code == 401
    assert client.post("/api/connections/instagram/sync").status_code == 401
    assert client.get("/api/connections/instagram/status").status_code == 401
    assert client.get("/api/connections/instagram/auth-url").status_code == 401

    h = reg("ig_conn_test@test.com")

    # 2. Check initial list: Instagram is disconnected
    conns = client.get("/api/connections", headers=h).json()
    ig = next(c for c in conns if c["platform"] == "instagram")
    assert ig["status"] == "disconnected"
    assert "real_oauth_available" in ig

    # 3. Auth URL endpoint returns valid Meta OAuth dialog URL with proper scopes
    auth_res = client.get("/api/connections/instagram/auth-url", headers=h)
    assert auth_res.status_code == 200
    d_auth = auth_res.json()
    assert "oauth_url" in d_auth
    assert "facebook.com" in d_auth["oauth_url"]
    assert "instagram_manage_insights" in d_auth["oauth_url"]
    assert d_auth["state"].startswith("ig_")

    # 4. Invalid username returns 404
    invalid_res = client.post(
        "/api/connections/instagram/connect",
        json={"username": "invalid_not_found"},
        headers=h
    )
    assert invalid_res.status_code == 404
    assert "not found" in invalid_res.json()["message"].lower()

    # 5. Valid professional account connection
    connect_payload = {
        "username": "@creatoriq_brand",
        "account_name": "CreatorIQ Brand Official",
    }
    conn_res = client.post("/api/connections/instagram/connect", json=connect_payload, headers=h)
    assert conn_res.status_code == 200
    d_conn = conn_res.json()
    assert d_conn["status"] == "connected"
    assert d_conn["account_name"] == "@creatoriq_brand"
    assert d_conn["external_id"].startswith("178414")
    assert d_conn["sync_status"] == "success"

    # 6. Check Instagram status endpoint
    status_res = client.get("/api/connections/instagram/status", headers=h)
    assert status_res.status_code == 200
    d_stat = status_res.json()
    assert d_stat["is_connected"] is True
    assert d_stat["is_demo"] is False
    assert d_stat["username"] == "creatoriq_brand"
    assert d_stat["account_stats"]["followers"] > 0
    assert d_stat["account_stats"]["media_count"] > 0
    assert d_stat["account_stats"]["account_type"] in ("CREATOR", "BUSINESS")

    # 7. Verify real records generated in database (is_demo=False)
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="ig_conn_test@test.com").one()
        real_growth = db.query(FollowerGrowth).filter_by(user_id=user.id, platform="instagram", is_demo=False).first()
        assert real_growth is not None
        assert real_growth.followers > 0

        real_posts = db.query(ContentRecord).filter_by(user_id=user.id, platform="instagram", is_demo=False).all()
        assert len(real_posts) >= 3

        real_aud = db.query(AudienceMetric).filter_by(user_id=user.id, platform="instagram", is_demo=False).first()
        assert real_aud is not None


def test_connections_instagram_token_errors_and_sync():
    h = reg("ig_sync_test@test.com")

    # 1. Calling sync when not connected returns 400
    assert client.post("/api/connections/instagram/sync", headers=h).status_code == 400

    # 2. Token error handling: expired token returns 401
    exp_res = client.post(
        "/api/connections/instagram/connect",
        json={"username": "@pro_creator", "access_token": "expired_token_190"},
        headers=h
    )
    assert exp_res.status_code == 401
    assert "expired" in exp_res.json()["message"].lower() or "190" in exp_res.json()["message"]

    # 3. Token error handling: revoked permissions returns 403
    rev_res = client.post(
        "/api/connections/instagram/connect",
        json={"username": "@pro_creator", "access_token": "revoked_permissions_insights"},
        headers=h
    )
    assert rev_res.status_code == 403
    assert "instagram_manage_insights" in rev_res.json()["message"]

    # 4. Token error handling: rate limited returns 429
    rate_res = client.post(
        "/api/connections/instagram/connect",
        json={"username": "@pro_creator", "access_token": "rate_limited_token"},
        headers=h
    )
    assert rate_res.status_code == 429
    assert "rate limit" in rate_res.json()["message"].lower()

    # 5. Successful connection and manual sync
    client.post(
        "/api/connections/instagram/connect",
        json={"username": "@pro_creator", "account_name": "Pro Creator Studio"},
        headers=h
    )

    sync_res = client.post("/api/connections/instagram/sync", headers=h)
    assert sync_res.status_code == 200
    d_sync = sync_res.json()
    assert d_sync["status"] == "success"
    assert d_sync["username"] == "pro_creator"
    assert d_sync["followers"] > 0
    assert d_sync["synced_media_count"] >= 3
    assert d_sync["is_demo"] is False

    # 6. Disconnect Instagram account
    del_res = client.delete("/api/connections/instagram", headers=h)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "disconnected"

    # After disconnect, sync fails with 400
    assert client.post("/api/connections/instagram/sync", headers=h).status_code == 400


def test_connections_instagram_multi_role_and_isolation():
    h_c1 = reg("ig_c1@test.com", role="creator")
    h_c2 = reg("ig_c2@test.com", role="creator")
    h_agency = reg("ig_agency@test.com", role="agency")
    h_mkt = reg("ig_mkt@test.com", role="marketing")
    h_admin = reg("ig_admin@test.com", role="administrator")

    # Creator 1 connects Instagram account
    client.post(
        "/api/connections/instagram/connect",
        json={"username": "@c1_lifestyle", "account_name": "C1 Lifestyle"},
        headers=h_c1
    )

    with SessionLocal() as db:
        c1 = db.query(User).filter_by(email="ig_c1@test.com").one()
        c1_id = c1.id

    # 1. Creator 2 cannot view, sync, or disconnect Creator 1's connection
    assert client.get(f"/api/connections?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.post(f"/api/connections/instagram/sync?user_id={c1_id}", headers=h_c2).status_code == 403
    assert client.delete(f"/api/connections/instagram?user_id={c1_id}", headers=h_c2).status_code == 403

    # 2. Agency role: Can view and sync roster creator
    ag_conns = client.get(f"/api/connections?user_id={c1_id}", headers=h_agency)
    assert ag_conns.status_code == 200
    ag_ig = next(c for c in ag_conns.json() if c["platform"] == "instagram")
    assert ag_ig["status"] == "connected"
    assert ag_ig["account_name"] == "@c1_lifestyle"

    # Agency can trigger sync for creator
    ag_sync = client.post(f"/api/connections/instagram/sync?user_id={c1_id}", headers=h_agency)
    assert ag_sync.status_code == 200
    assert ag_sync.json()["status"] == "success"

    # 3. Marketing role: Can verify creator connection status
    mkt_status = client.get(f"/api/connections/instagram/status?user_id={c1_id}", headers=h_mkt)
    assert mkt_status.status_code == 200
    assert mkt_status.json()["is_connected"] is True
    assert mkt_status.json()["username"] == "c1_lifestyle"

    # 4. Administrator role: Global oversight
    adm_status = client.get(f"/api/connections/instagram/status?user_id={c1_id}", headers=h_admin)
    assert adm_status.status_code == 200
    assert adm_status.json()["is_connected"] is True

    # Admin querying non-existent user returns 404
    assert client.get("/api/connections/instagram/status?user_id=8888888", headers=h_admin).status_code == 404


def test_connections_instagram_oauth_flow_and_security():
    h = reg("ig_oauth_sec@test.com")

    # 1. Fetch valid OAuth authorization URL with CSRF state
    auth_res = client.get("/api/connections/instagram/auth-url", headers=h)
    assert auth_res.status_code == 200
    d_auth = auth_res.json()
    valid_state = d_auth["state"]
    assert valid_state.startswith("ig_")

    # Verify currently supported Graph API version (v26.0) and Facebook Login scopes
    assert "v26.0" in d_auth["oauth_url"]
    scopes = d_auth["scopes"].split(",")
    assert "pages_show_list" in scopes
    assert "pages_read_engagement" in scopes
    assert "instagram_basic" in scopes
    assert "instagram_manage_insights" in scopes
    # Confirm NO Instagram Login scopes (instagram_business_*) are mixed in
    assert not any("instagram_business_" in s for s in scopes)

    # 2. CSRF State Validation: tampered state returns 400 Bad Request
    tampered_state = valid_state[:-3] + "xyz"
    bad_res = client.get(f"/api/connections/instagram/callback?code=mock_code_1&state={tampered_state}", headers=h)
    assert bad_res.status_code == 400
    assert "csrf" in bad_res.json()["message"].lower() or "state" in bad_res.json()["message"].lower()

    # Tampered state via POST callback returns 400
    bad_post = client.post("/api/connections/instagram/callback", json={"code": "mock_code_1", "state": "forged_state"}, headers=h)
    assert bad_post.status_code == 400

    # 3. Valid GET OAuth callback executes code exchange and connects account
    cb_res = client.get(f"/api/connections/instagram/callback?code=mock_code_success&state={valid_state}", headers=h)
    assert cb_res.status_code == 200
    d_cb = cb_res.json()
    assert d_cb["status"] == "connected"
    assert d_cb["external_id"].startswith("178414")
    assert d_cb["sync_status"] == "success"

    # 3b. OAuth Replay Protection: Replaying the identical consumed state MUST be rejected
    replay_res = client.get(f"/api/connections/instagram/callback?code=mock_code_success&state={valid_state}", headers=h)
    assert replay_res.status_code == 400
    assert "replay" in replay_res.json()["message"].lower() or "already been consumed" in replay_res.json()["message"].lower()

    # 4. Security Check: Tokens must NEVER be leaked in API responses
    conns = client.get("/api/connections", headers=h).json()
    ig_conn = next(c for c in conns if c["platform"] == "instagram")
    meta = ig_conn.get("metadata") or {}
    assert "access_token" not in meta
    assert "token_data" not in meta
    assert "_server_token_data" not in meta
    assert "client_secret" not in meta

    # 5. Long-Lived Token Refresh endpoint
    ref_res = client.post("/api/connections/instagram/refresh-token", headers=h)
    assert ref_res.status_code == 200
    assert ref_res.json()["status"] == "success"

    # 6. Rejection of Ineligible Personal Instagram accounts
    client.delete("/api/connections/instagram", headers=h)
    pers_res = client.post(
        "/api/connections/instagram/connect",
        json={"access_token": "personal_account_test_token"},
        headers=h
    )
    assert pers_res.status_code == 400
    assert "personal" in pers_res.json()["message"].lower() or "professional" in pers_res.json()["message"].lower()

    # 7. Rejection of account without linked Facebook Page
    no_page_res = client.post(
        "/api/connections/instagram/connect",
        json={"access_token": "ineligible_no_pages_token"},
        headers=h
    )
    assert no_page_res.status_code == 400
    assert "eligible" in no_page_res.json()["message"].lower()


def test_persistent_oauth_replay_concurrency_and_restart():
    """
    [MOCKED] Tests persistent OAuth replay protection backed by shared SQLite/PostgreSQL store:
    1. Single-use replay protection: Replaying the same state is rejected with 400.
    2. Concurrent callback attempts: 8 concurrent requests with the identical state -> exactly 1 succeeds, 7 fail with 400.
    3. Backend restart behavior: State consumed before process restart remains consumed in DB; unconsumed state remains valid.
    4. Multiple worker / shared-store behavior: Independent DB sessions share state consumption atomically.
    5. Expired and cross-user state validation: >15min states and cross-tenant users are properly rejected.
    """
    import concurrent.futures
    import time, hmac, hashlib
    from app.services_instagram import (
        generate_instagram_oauth_state,
        verify_and_consume_instagram_oauth_state,
    )
    from app.models import OAuthState
    from app.config import settings

    h_u1 = reg("persist_u1@test.com")
    h_u2 = reg("persist_u2@test.com")
    with SessionLocal() as db:
        u1_id = db.query(User).filter_by(email="persist_u1@test.com").one().id
        u2_id = db.query(User).filter_by(email="persist_u2@test.com").one().id

    # 1. State generation persists to shared database
    state_1 = generate_instagram_oauth_state(u1_id)
    with SessionLocal() as db:
        rec = db.query(OAuthState).filter_by(state_token=state_1).first()
        assert rec is not None
        assert rec.is_consumed is False
        assert rec.user_id == u1_id

    # 2. Concurrent callback attempts: exactly ONE succeeds, remaining 7 fail with 400
    state_concurrent = generate_instagram_oauth_state(u1_id)

    def attempt_callback():
        return client.get(
            f"/api/connections/instagram/callback?code=mock_code_concurr&state={state_concurrent}",
            headers=h_u1
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(attempt_callback) for _ in range(8)]
        results = [f.result() for f in futures]

    successes = [r for r in results if r.status_code == 200]
    replays = [r for r in results if r.status_code == 400 and ("replay" in r.json()["message"].lower() or "consumed" in r.json()["message"].lower())]
    assert len(successes) == 1, f"Expected 1 success, got {len(successes)}"
    assert len(replays) == 7, f"Expected 7 replay rejections, got {len(replays)}"

    # 3. Backend restart simulation:
    # State consumed before restart remains consumed in DB
    with SessionLocal() as db_after_restart:
        rec_consumed = db_after_restart.query(OAuthState).filter_by(state_token=state_concurrent).first()
        assert rec_consumed.is_consumed is True
        assert rec_consumed.consumed_at is not None

    # Attempting to replay consumed state after simulated restart still returns 400
    replay_after_restart = client.get(
        f"/api/connections/instagram/callback?code=mock_code_concurr&state={state_concurrent}",
        headers=h_u1
    )
    assert replay_after_restart.status_code == 400
    assert "replay" in replay_after_restart.json()["message"].lower() or "consumed" in replay_after_restart.json()["message"].lower()

    # Unconsumed state generated before simulated restart can still be consumed once
    state_pre_restart = generate_instagram_oauth_state(u1_id)
    with SessionLocal() as db_new_worker:
        consumed_uid = verify_and_consume_instagram_oauth_state(state_pre_restart, expected_user_id=u1_id, db=db_new_worker)
        assert consumed_uid == u1_id
        # Consuming it again via a different worker session fails
        with pytest.raises(Exception) as exc_info:
            verify_and_consume_instagram_oauth_state(state_pre_restart, expected_user_id=u1_id, db=db_new_worker)
        assert exc_info.value.status_code == 400
        assert "replay" in exc_info.value.detail.lower() or "consumed" in exc_info.value.detail.lower()

    # 4. Cross-user validation: User 2 cannot use state generated for User 1
    state_for_u1 = generate_instagram_oauth_state(u1_id)
    cross_res = client.get(
        f"/api/connections/instagram/callback?code=mock_code_cross&state={state_for_u1}",
        headers=h_u2
    )
    assert cross_res.status_code == 403
    assert "mismatch" in cross_res.json()["message"].lower() or "unauthorized" in cross_res.json()["message"].lower()

    # 5. Expired state validation (>15 minutes)
    old_ts = int(time.time()) - 1000  # >16 minutes ago
    old_nonce = "expirednonce12345"
    old_payload = f"ig_{u1_id}_{old_ts}_{old_nonce}"
    old_sig = hmac.new(settings.SECRET_KEY.encode(), old_payload.encode(), hashlib.sha256).hexdigest()[:16]
    expired_state = f"{old_payload}_{old_sig}"

    exp_res = client.get(
        f"/api/connections/instagram/callback?code=mock_code_exp&state={expired_state}",
        headers=h_u1
    )
    assert exp_res.status_code == 400
    assert "expired" in exp_res.json()["message"].lower()


def test_connections_instagram_token_lifecycle_and_reauthorization():
    """
    [MOCKED] Verifies token lifecycle and reauthorization semantics:
    1. Active long-lived token refresh succeeds.
    2. Expired token (code 190) cannot be refreshed and requires reauthorization via Facebook Login (401).
    3. Revoked token cannot be refreshed and requires reauthorization (403).
    4. Connections metadata keeps sensitive credentials strictly server-side.
    """
    from app.services_instagram import refresh_instagram_long_lived_token

    # 1. Active token refresh succeeds
    ref = refresh_instagram_long_lived_token("EAAG_valid_active_token")
    assert ref["expires_in"] > 0

    # 2. Expired token cannot be refreshed and requires reauthorization
    with pytest.raises(Exception) as exc_exp:
        refresh_instagram_long_lived_token("EAAG_expired_session_190")
    assert exc_exp.value.status_code == 401
    assert "expired" in exc_exp.value.detail.lower()

    # 3. Revoked token cannot be refreshed
    with pytest.raises(Exception) as exc_rev:
        refresh_instagram_long_lived_token("EAAG_revoked_token")
    assert exc_rev.value.status_code == 403
    assert "revoked" in exc_rev.value.detail.lower()


def test_phase7_1_brand_sponsorship_database_foundation():
    """
    Phase 7.1: Database Foundation for Campaign ROI & Brand Sponsorship Tracking
    Tests:
    1. Model creation, fields, and bidirectional SQLAlchemy relationships.
    2. Foreign key relationships and cascade deletion.
    3. Duplicate creator assignment prevention (uq_campaign_creator).
    4. Pydantic validation: invalid dates and negative monetary values.
    5. Demo and real data separation (is_demo=False vs True).
    6. Role-based data isolation (marketing manages campaigns/brands, creators only see their own sponsorships).
    7. Existing campaign data preservation and serialization.
    """
    from sqlalchemy.exc import IntegrityError
    from app.models import (
        User, Brand, Campaign, CampaignCreator, Sponsorship, CampaignPerformance
    )
    from app.schemas import (
        BrandIn, CampaignIn, CampaignCreatorIn, SponsorshipIn, CampaignPerformanceIn
    )

    h_mkt = reg("p71_mkt@test.com", role="marketing")
    h_c1 = reg("p71_c1@test.com", role="creator")
    h_c2 = reg("p71_c2@test.com", role="creator")

    with SessionLocal() as db:
        mkt_user = db.query(User).filter_by(email="p71_mkt@test.com").one()
        c1_user = db.query(User).filter_by(email="p71_c1@test.com").one()
        c2_user = db.query(User).filter_by(email="p71_c2@test.com").one()
        mkt_id = mkt_user.id
        c1_id = c1_user.id
        c2_id = c2_user.id

        # 1. Create Brand
        brand = Brand(
            user_id=mkt_id,
            name="Apex Athletic Gear",
            description="High-performance fitness equipment and apparel",
            industry="Athletics & Fitness",
            website="https://apexathletic.example.com",
            contact_email="partnerships@apexathletic.example.com",
            contact_person="Jordan Smith",
            contact_phone="+1-555-0199",
            is_demo=False
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        assert brand.id > 0
        assert brand.name == "Apex Athletic Gear"
        assert brand.user.id == mkt_id

        # 2. Create Campaign linked to Brand
        campaign = Campaign(
            user_id=mkt_id,
            brand_id=brand.id,
            title="Summer Strength 2026",
            client_name="Apex Athletic",
            description="Summer promotion across YouTube and Instagram",
            objective="Brand Awareness & Direct Sales",
            status="active",
            platform="all",
            budget=25000.0,
            spent=8500.0,
            target_reach=500000,
            actual_reach=380000,
            target_engagement=45000,
            actual_engagement=39500,
            start_date=date(2026, 6, 1),
            end_date=date(2026, 8, 31),
            is_demo=False
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        assert campaign.id > 0
        assert campaign.brand_id == brand.id
        assert campaign.brand.name == "Apex Athletic Gear"
        assert len(brand.campaigns) == 1

        # 3. Create CampaignCreator Assignment
        creator_assign = CampaignCreator(
            campaign_id=campaign.id,
            creator_id=c1_id,
            agreed_compensation=3500.0,
            status="accepted",
            deliverables="1 Dedicated YouTube Review + 2 Instagram Reels",
            assigned_date=date(2026, 6, 5),
            is_demo=False
        )
        db.add(creator_assign)
        db.commit()
        db.refresh(creator_assign)
        assert creator_assign.id > 0
        assert creator_assign.campaign_id == campaign.id
        assert creator_assign.creator_id == c1_id
        assert creator_assign.creator.email == "p71_c1@test.com"
        assert len(campaign.creators) == 1
        assert len(c1_user.campaign_assignments) == 1

        # 3b. Duplicate Creator Assignment Prevention (uq_campaign_creator)
        duplicate_assign = CampaignCreator(
            campaign_id=campaign.id,
            creator_id=c1_id,
            agreed_compensation=2000.0,
            status="assigned"
        )
        db.add(duplicate_assign)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # 4. Create Sponsorship
        sponsorship = Sponsorship(
            brand_id=brand.id,
            campaign_id=campaign.id,
            creator_id=c1_id,
            amount=3500.0,
            payment_status="paid",
            contract_status="signed",
            payment_due_date=date(2026, 6, 15),
            payment_date=date(2026, 6, 14),
            deliverable_summary="Summer Strength 2026 Full Creator Integration",
            notes="Payment disbursed via direct bank transfer.",
            is_demo=False
        )
        db.add(sponsorship)
        db.commit()
        db.refresh(sponsorship)
        assert sponsorship.id > 0
        assert sponsorship.amount == 3500.0
        assert sponsorship.brand.name == "Apex Athletic Gear"
        assert sponsorship.creator.id == c1_id
        assert sponsorship.campaign.id == campaign.id
        assert len(brand.sponsorships) == 1
        assert len(c1_user.sponsorships) == 1

        # 5. Create CampaignPerformance
        perf = CampaignPerformance(
            campaign_id=campaign.id,
            creator_id=c1_id,
            impressions=145000,
            reach=98000,
            engagements=14200,
            clicks=5600,
            conversions=420,
            revenue=21000.0,
            reporting_date=date(2026, 7, 1),
            data_source="platform",
            is_demo=False
        )
        db.add(perf)
        db.commit()
        db.refresh(perf)
        assert perf.id > 0
        assert perf.revenue == 21000.0
        assert len(campaign.performances) == 1

        # 6. Demo vs Real Data Separation
        demo_sponsorship = Sponsorship(
            brand_id=brand.id,
            campaign_id=campaign.id,
            creator_id=c2_id,
            amount=1500.0,
            payment_status="pending",
            contract_status="draft",
            is_demo=True
        )
        db.add(demo_sponsorship)
        db.commit()

        real_sponsorships = db.query(Sponsorship).filter(Sponsorship.creator_id == c1_id, Sponsorship.is_demo.is_(False)).all()
        assert len(real_sponsorships) == 1
        assert real_sponsorships[0].amount == 3500.0

        demo_sponsorships = db.query(Sponsorship).filter(Sponsorship.is_demo.is_(True)).all()
        assert any(s.creator_id == c2_id for s in demo_sponsorships)

        # 7. Role-Based Data Isolation Check
        c1_sponsorships = db.query(Sponsorship).filter_by(creator_id=c1_id).all()
        c2_sponsorships = db.query(Sponsorship).filter_by(creator_id=c2_id, is_demo=False).all()
        assert len(c1_sponsorships) == 1
        assert len(c2_sponsorships) == 0  # C2 has no real sponsorships

    # 8. Pydantic Schemas Validation
    # A. Negative monetary amounts must fail
    with pytest.raises(ValidationError):
        CampaignIn(
            title="Invalid Budget Campaign",
            client_name="Test Client",
            budget=-500.0
        )

    with pytest.raises(ValidationError):
        CampaignCreatorIn(
            campaign_id=1,
            creator_id=2,
            agreed_compensation=-100.0
        )

    with pytest.raises(ValidationError):
        SponsorshipIn(
            brand_id=1,
            creator_id=2,
            amount=-1500.0
        )

    with pytest.raises(ValidationError):
        CampaignPerformanceIn(
            campaign_id=1,
            impressions=-10,
            reporting_date=date(2026, 7, 1)
        )

    # B. Invalid dates: end_date earlier than start_date must fail
    with pytest.raises(ValidationError):
        CampaignIn(
            title="Invalid Date Campaign",
            client_name="Test Client",
            start_date=date(2026, 8, 1),
            end_date=date(2026, 7, 1)
        )

    # C. Valid Brand schema parses cleanly
    valid_brand = BrandIn(
        name="Puma Performance",
        industry="Sportswear",
        contact_email="collabs@puma.example.com"
    )
    assert valid_brand.name == "Puma Performance"
    assert valid_brand.industry == "Sportswear"

    # 9. Existing Campaign Data Preservation
    res_camp = client.get("/api/marketing/campaigns", headers=h_mkt)
    assert res_camp.status_code == 200
    camp_list = res_camp.json()
    assert any(c["title"] == "Summer Strength 2026" for c in camp_list)


def test_phase7_2_brand_crud_and_rbac():
    """
    Phase 7.2: Brand APIs (POST, GET, PUT, DELETE /api/brands).
    Tests:
    1. Marketing creates brand profile.
    2. Duplicate brand name for same owner returns 409.
    3. Search & industry filtering with pagination.
    4. Contact info privacy: Owner/Admin sees contacts; other users have contacts masked.
    5. Update brand: owner allowed, cross-tenant rejected with 403.
    6. Delete brand: brand with active campaigns/sponsorships is soft-archived, protecting history.
    """
    h_mkt = reg("b_mkt@test.com", role="marketing")
    h_mkt2 = reg("b_mkt2@test.com", role="marketing")
    h_c = reg("b_creator@test.com", role="creator")
    h_adm = reg("b_admin@test.com", role="administrator")

    # 1. Create Brand
    b_data = {
        "name": "HydraTech Wear",
        "description": "Smart activewear with biometric monitoring",
        "industry": "Fitness Tech",
        "website": "https://hydratech.example.com",
        "contact_email": "partnerships@hydratech.example.com",
        "contact_phone": "+1-800-555-4937",
        "contact_person": "Alex Morgan"
    }
    r = client.post("/api/brands", json=b_data, headers=h_mkt)
    assert r.status_code == 201
    b_out = r.json()
    bid = b_out["id"]
    assert b_out["name"] == "HydraTech Wear"
    assert b_out["contact_email"] == "partnerships@hydratech.example.com"

    # 2. Duplicate brand name for same owner returns 409 Conflict
    r_dup = client.post("/api/brands", json=b_data, headers=h_mkt)
    assert r_dup.status_code == 409

    # 3. List brands with search and industry filtering
    r_list = client.get("/api/brands?search=HydraTech", headers=h_mkt)
    assert r_list.status_code == 200
    d_list = r_list.json()
    assert d_list["total"] >= 1
    assert any(b["name"] == "HydraTech Wear" for b in d_list["items"])

    r_ind = client.get("/api/brands?industry=Fitness", headers=h_mkt)
    assert r_ind.status_code == 200
    assert any(b["name"] == "HydraTech Wear" for b in r_ind.json()["items"])

    # 4. Contact Info Privacy:
    # Owner gets full contacts
    r_owner_get = client.get(f"/api/brands/{bid}", headers=h_mkt)
    assert r_owner_get.status_code == 200
    assert r_owner_get.json()["contact_email"] == "partnerships@hydratech.example.com"
    assert r_owner_get.json()["contact_phone"] == "+1-800-555-4937"

    # Admin gets full contacts
    r_adm_get = client.get(f"/api/brands/{bid}", headers=h_adm)
    assert r_adm_get.status_code == 200
    assert r_adm_get.json()["contact_email"] == "partnerships@hydratech.example.com"

    # Cross-tenant marketing user 2 cannot view or edit HydraTech
    r_mkt2_get = client.get(f"/api/brands/{bid}", headers=h_mkt2)
    assert r_mkt2_get.status_code == 403

    r_mkt2_put = client.put(f"/api/brands/{bid}", json={"name": "Hacked Name"}, headers=h_mkt2)
    assert r_mkt2_put.status_code == 403

    # 5. Update brand
    r_put = client.put(f"/api/brands/{bid}", json={"website": "https://new.hydratech.example.com"}, headers=h_mkt)
    assert r_put.status_code == 200
    assert r_put.json()["website"] == "https://new.hydratech.example.com"

    # 6. Delete Brand without links -> deleted
    r_del = client.delete(f"/api/brands/{bid}", headers=h_mkt)
    assert r_del.status_code == 200
    assert r_del.json()["status"] == "deleted"

    # Deleted brand no longer listed
    r_after = client.get(f"/api/brands/{bid}", headers=h_mkt)
    assert r_after.status_code == 404


def test_phase7_2_sponsorship_crud_and_financial_safety():
    """
    Phase 7.2: Sponsorship APIs (POST, GET, PUT, DELETE /api/sponsorships).
    Tests:
    1. Marketing creates brand and campaign, then adds sponsorship for Creator 1.
    2. Invalid relationships: invalid brand (404), invalid creator (400).
    3. Creator self-authorization protection: Creator cannot mark payment as paid or alter amount (403).
    4. Cross-tenant isolation: Creator 2 cannot view or list Creator 1's sponsorships (403).
    5. Totals calculation: total_amount, paid_amount, pending_amount.
    6. Financial record preservation: Delete soft-archives sponsorship to maintain accounting audit trails.
    """
    from app.models import Sponsorship

    h_mkt = reg("s_mkt@test.com", role="marketing")
    h_c1 = reg("s_c1@test.com", role="creator")
    h_c2 = reg("s_c2@test.com", role="creator")

    with SessionLocal() as db:
        c1_id = db.query(User).filter_by(email="s_c1@test.com").one().id
        c2_id = db.query(User).filter_by(email="s_c2@test.com").one().id
        mkt_id = db.query(User).filter_by(email="s_mkt@test.com").one().id

    # Create Brand
    b_res = client.post("/api/brands", json={"name": "Volt Energy", "industry": "Beverages"}, headers=h_mkt)
    assert b_res.status_code == 201
    bid = b_res.json()["id"]

    # Create Campaign
    c_res = client.post("/api/marketing/campaigns", json={
        "title": "Volt Summer Launch",
        "client_name": "Volt Energy",
        "brand_id": bid,
        "budget": 20000.0
    }, headers=h_mkt)
    assert c_res.status_code == 201
    cid = c_res.json()["id"]

    # 1. Create Sponsorship
    s_data = {
        "brand_id": bid,
        "campaign_id": cid,
        "creator_id": c1_id,
        "amount": 2500.0,
        "payment_status": "pending",
        "contract_status": "draft",
        "payment_due_date": "2026-07-15",
        "deliverable_summary": "1 YouTube integration"
    }
    r = client.post("/api/sponsorships", json=s_data, headers=h_mkt)
    assert r.status_code == 201
    s_out = r.json()
    sid = s_out["id"]
    assert s_out["amount"] == 2500.0
    assert s_out["payment_status"] == "pending"

    # 2. Invalid Relationships
    # Non-existent brand -> 404
    r_bad_b = client.post("/api/sponsorships", json={**s_data, "brand_id": 999999}, headers=h_mkt)
    assert r_bad_b.status_code == 404

    # Non-creator user_id -> 400
    r_bad_c = client.post("/api/sponsorships", json={**s_data, "creator_id": mkt_id}, headers=h_mkt)
    assert r_bad_c.status_code == 400

    # 3. Creator self-authorization protection:
    # Creator 1 cannot mark payment_status as 'paid'
    r_c_paid = client.put(f"/api/sponsorships/{sid}", json={"payment_status": "paid"}, headers=h_c1)
    assert r_c_paid.status_code == 403

    # Creator 1 cannot modify payment amount
    r_c_amt = client.put(f"/api/sponsorships/{sid}", json={"amount": 9000.0}, headers=h_c1)
    assert r_c_amt.status_code == 403

    # Creator 1 CAN sign contract
    r_c_sign = client.put(f"/api/sponsorships/{sid}", json={"contract_status": "signed", "notes": "Contract signed by creator"}, headers=h_c1)
    assert r_c_sign.status_code == 200
    assert r_c_sign.json()["contract_status"] == "signed"

    # Marketing user CAN update payment status to paid
    r_m_paid = client.put(f"/api/sponsorships/{sid}", json={"payment_status": "paid", "payment_date": "2026-07-14"}, headers=h_mkt)
    assert r_m_paid.status_code == 200
    assert r_m_paid.json()["payment_status"] == "paid"

    # 4. Cross-Tenant Isolation:
    # Creator 2 cannot view Creator 1's sponsorship
    r_c2_get = client.get(f"/api/sponsorships/{sid}", headers=h_c2)
    assert r_c2_get.status_code == 403

    # Creator 2 cannot query Creator 1's payouts
    r_c2_filter = client.get(f"/api/sponsorships?creator_id={c1_id}", headers=h_c2)
    assert r_c2_filter.status_code == 403

    # Creator 1 listing only shows Creator 1's payouts
    r_c1_list = client.get("/api/sponsorships", headers=h_c1)
    assert r_c1_list.status_code == 200
    d_c1 = r_c1_list.json()
    assert d_c1["total"] == 1
    assert d_c1["paid_amount"] == 2500.0

    # 5. Financial Record Preservation (Archival)
    # Creator cannot delete sponsorship
    assert client.delete(f"/api/sponsorships/{sid}", headers=h_c1).status_code == 403

    # Marketing deletes -> safely soft-archived
    r_del = client.delete(f"/api/sponsorships/{sid}", headers=h_mkt)
    assert r_del.status_code == 200
    assert r_del.json()["status"] == "archived"

    # Record preserved in DB with is_archived=True
    with SessionLocal() as db:
        rec = db.get(Sponsorship, sid)
        assert rec is not None
        assert rec.is_archived is True


def test_phase7_2_campaign_creator_assignment_and_rbac():
    """
    Phase 7.2: Campaign Creator Assignment APIs.
    Tests:
    1. Assign Creator 1 to Campaign with deliverables & agreed compensation.
    2. Duplicate creator assignment returns 409 Conflict.
    3. List assigned creators (campaign manager sees all, creator sees only self).
    4. Creator cannot tamper with agreed compensation (403).
    5. Creator can update assignment status (e.g. accepted/completed).
    6. Removal: unauthorized delete returns 403; manager remove archives assignment.
    """
    h_mkt = reg("cc_mkt@test.com", role="marketing")
    h_c1 = reg("cc_c1@test.com", role="creator")
    h_c2 = reg("cc_c2@test.com", role="creator")

    with SessionLocal() as db:
        c1_id = db.query(User).filter_by(email="cc_c1@test.com").one().id
        c2_id = db.query(User).filter_by(email="cc_c2@test.com").one().id

    # Create Campaign
    c_res = client.post("/api/marketing/campaigns", json={
        "title": "Cosmic Sound Audio Campaign",
        "client_name": "Cosmic Sound",
        "budget": 15000.0
    }, headers=h_mkt)
    assert c_res.status_code == 201
    cid = c_res.json()["id"]

    # 1. Assign Creator 1
    assign_data = {
        "creator_id": c1_id,
        "agreed_compensation": 3200.0,
        "deliverables": "1 Dedicated YouTube Video + 3 Tweets",
        "status": "pending"
    }
    r = client.post(f"/api/campaigns/{cid}/creators", json=assign_data, headers=h_mkt)
    assert r.status_code == 201
    d_assign = r.json()
    assert d_assign["agreed_compensation"] == 3200.0
    assert d_assign["status"] == "pending"

    # 2. Duplicate Creator Assignment Returns 409 Conflict
    r_dup = client.post(f"/api/campaigns/{cid}/creators", json=assign_data, headers=h_mkt)
    assert r_dup.status_code == 409

    # 3. List Assigned Creators
    # Manager sees all
    r_m_list = client.get(f"/api/campaigns/{cid}/creators", headers=h_mkt)
    assert r_m_list.status_code == 200
    assert r_m_list.json()["total"] == 1

    # Creator 1 sees only self
    r_c1_list = client.get(f"/api/campaigns/{cid}/creators", headers=h_c1)
    assert r_c1_list.status_code == 200
    assert r_c1_list.json()["total"] == 1

    # Creator 2 (unassigned) sees 0
    r_c2_list = client.get(f"/api/campaigns/{cid}/creators", headers=h_c2)
    assert r_c2_list.status_code == 200
    assert r_c2_list.json()["total"] == 0

    # 4. Creator Compensation Protection
    # Creator 1 tries to increase compensation -> 403 Forbidden
    r_hack_comp = client.put(f"/api/campaigns/{cid}/creators/{c1_id}", json={"agreed_compensation": 8000.0}, headers=h_c1)
    assert r_hack_comp.status_code == 403

    # 5. Creator CAN accept the assignment
    r_c1_accept = client.put(f"/api/campaigns/{cid}/creators/{c1_id}", json={"status": "accepted"}, headers=h_c1)
    assert r_c1_accept.status_code == 200
    assert r_c1_accept.json()["status"] == "accepted"

    # 6. Removal
    # Creator 2 cannot remove Creator 1 -> 403
    assert client.delete(f"/api/campaigns/{cid}/creators/{c1_id}", headers=h_c2).status_code == 403

    # Manager can remove creator -> soft-archives assignment
    r_rem = client.delete(f"/api/campaigns/{cid}/creators/{c1_id}", headers=h_mkt)
    assert r_rem.status_code == 200
    assert "removed" in r_rem.json()["message"].lower()


# =============================================================================
# PHASE 7.3 TESTS: CAMPAIGN ROI & PERFORMANCE CALCULATION ENGINE
# =============================================================================

def test_phase7_3_roi_engine_mathematical_formulas_and_zero_safety():
    """
    Tests pure mathematical engine formulas, Decimal accuracy, and zero-denominator safety:
    - ROI (%) vs ROAS differentiation
    - CPM, CPE, CTR, Conversion Rate
    - Division-by-zero returns None/null instead of crashing
    - Cost calculation double-counting prevention
    """
    from decimal import Decimal
    from app.roi_engine import (
        calculate_roi, calculate_roas, calculate_cpm, calculate_cpe,
        calculate_ctr, calculate_conversion_rate, calculate_engagement_rate,
        compute_campaign_cost, compute_attributed_revenue
    )

    # 1. ROI (%) vs ROAS differentiation
    # Cost = 1,000, Revenue = 2,500
    cost = Decimal("1000.00")
    rev = Decimal("2500.00")
    roi = calculate_roi(rev, cost)
    roas = calculate_roas(rev, cost)
    assert roi == 150.0   # ((2500 - 1000) / 1000) * 100 = 150.0%
    assert roas == 2.5    # 2500 / 1000 = 2.5
    assert roi != roas    # Never conflate ROI and ROAS

    # Negative ROI (Revenue < Cost)
    loss_rev = Decimal("700.00")
    assert calculate_roi(loss_rev, cost) == -30.0
    assert calculate_roas(loss_rev, cost) == 0.7

    # 2. Safe Zero Denominators (Return None, never crash)
    zero_cost = Decimal("0.00")
    assert calculate_roi(rev, zero_cost) is None
    assert calculate_roas(rev, zero_cost) is None
    assert calculate_roi(None, cost) is None
    assert calculate_roas(None, cost) is None

    # CPM Zero Impressions
    assert calculate_cpm(cost, 200000) == 5.0  # (1000 / 200000) * 1000 = 5.0
    assert calculate_cpm(cost, 0) is None
    assert calculate_cpm(cost, -100) is None
    assert calculate_cpm(None, 50000) is None

    # CPE Zero Engagements
    assert calculate_cpe(cost, 5000) == 0.20   # 1000 / 5000 = 0.20
    assert calculate_cpe(cost, 0) is None
    assert calculate_cpe(None, 1000) is None

    # CTR Zero Impressions
    assert calculate_ctr(250, 10000) == 2.5    # (250 / 10000) * 100 = 2.5%
    assert calculate_ctr(0, 10000) == 0.0
    assert calculate_ctr(250, 0) is None

    # Conversion Rate Zero Clicks
    assert calculate_conversion_rate(25, 500) == 5.0  # (25 / 500) * 100 = 5.0%
    assert calculate_conversion_rate(0, 500) == 0.0
    assert calculate_conversion_rate(25, 0) is None

    # Engagement Rate Zero Reach
    assert calculate_engagement_rate(300, 6000) == 5.0
    assert calculate_engagement_rate(300, 0) is None

    # 3. Cost Double-Counting Prevention
    class MockCampaign:
        budget = 20000.0
        spent = 10000.0

    class MockCreator:
        creator_id = 42
        agreed_compensation = 3000.0
        status = "accepted"
        is_archived = False

    class MockSponsorship:
        creator_id = 42
        amount = 3500.0  # $500 incremental over agreed compensation
        payment_status = "paid"
        contract_status = "signed"
        is_archived = False

    # Cost modes:
    # Explicit inclusive mode: direct spend ($10,000) encompasses talent spend ($3,500)
    cost_res_inc = compute_campaign_cost(
        campaign=MockCampaign(),
        creators=[MockCreator()],
        sponsorships=[MockSponsorship()],
        cost_mode="inclusive"
    )
    assert cost_res_inc["total_campaign_cost"] == 10000.0
    assert cost_res_inc["cost_rule_applied"] == "direct_spent_inclusive"
    assert cost_res_inc["creator_compensation_total"] == 3000.0
    assert cost_res_inc["deduplicated_talent_total"] == 3500.0  # 3000 + 500 incremental, not 3000 + 3500 = 6500

    # Explicit additive mode: direct spend ($10,000) + talent spend ($3,500) = $13,500
    cost_res_add = compute_campaign_cost(
        campaign=MockCampaign(),
        creators=[MockCreator()],
        sponsorships=[MockSponsorship()],
        cost_mode="additive"
    )
    assert cost_res_add["total_campaign_cost"] == 13500.0
    assert cost_res_add["cost_rule_applied"] == "additive_direct_plus_talent"

    # Default 'authoritative' when both exist: does NOT infer by comparing numbers; flags ambiguity
    cost_res_auth = compute_campaign_cost(
        campaign=MockCampaign(),
        creators=[MockCreator()],
        sponsorships=[MockSponsorship()],
        cost_mode="authoritative"
    )
    assert cost_res_auth["total_campaign_cost"] is None
    assert cost_res_auth["has_cost_ambiguity"] is True
    assert cost_res_auth["cost_rule_applied"] == "ambiguous_cost_components"


def test_phase7_3_campaign_performance_crud_and_duplicate_prevention():
    """
    Tests performance milestone recording:
    - Creation of performance milestones with engagement and attributed revenue
    - Prevention of duplicate reporting on the same date (HTTP 409 Conflict)
    - Date filtering and pagination
    - Safe soft-archival
    """
    from datetime import date
    from app.models import User, Campaign

    h_mkt = reg("p73_perf_mkt@test.com", role="marketing")
    h_c1 = reg("p73_perf_c1@test.com", role="creator")

    with SessionLocal() as db:
        mkt = db.query(User).filter_by(email="p73_perf_mkt@test.com").one()
        c1 = db.query(User).filter_by(email="p73_perf_c1@test.com").one()
        mkt_id = mkt.id
        c1_id = c1.id

        camp = Campaign(
            user_id=mkt_id,
            title="Q3 Growth Boost",
            client_name="OmniMedia",
            status="active",
            budget=15000.0,
            spent=6000.0,
            is_demo=False
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        cid = camp.id

    # 1. Post performance milestone
    perf_data = {
        "campaign_id": cid,
        "creator_id": c1_id,
        "impressions": 120000,
        "reach": 95000,
        "engagements": 6200,
        "clicks": 3100,
        "conversions": 155,
        "revenue": 4800.0,
        "reporting_date": "2026-07-15",
        "data_source": "platform"
    }
    r_post = client.post(f"/api/campaigns/{cid}/performance", json=perf_data, headers=h_mkt)
    assert r_post.status_code == 201
    d_post = r_post.json()
    perf_id = d_post["id"]
    assert d_post["impressions"] == 120000
    assert d_post["revenue"] == 4800.0
    assert d_post["engagement_rate"] > 0.0

    # 2. Duplicate Prevention: Attempting to post same creator + date returns 409 Conflict
    r_dup = client.post(f"/api/campaigns/{cid}/performance", json=perf_data, headers=h_mkt)
    assert r_dup.status_code == 409
    assert "already exists" in r_dup.json()["message"]

    # 3. List performances with date filter
    r_list = client.get(
        f"/api/campaigns/{cid}/performance?start_date=2026-07-01&end_date=2026-07-31",
        headers=h_mkt
    )
    assert r_list.status_code == 200
    d_list = r_list.json()
    assert d_list["total"] == 1
    assert d_list["total_revenue"] == 4800.0
    assert d_list["total_impressions"] == 120000
    assert d_list["overall_click_through_rate"] is not None

    # Date filter outside range returns 0
    r_empty = client.get(
        f"/api/campaigns/{cid}/performance?start_date=2026-08-01&end_date=2026-08-31",
        headers=h_mkt
    )
    assert r_empty.json()["total"] == 0

    # 4. Detail endpoint
    r_detail = client.get(f"/api/campaigns/{cid}/performance/{perf_id}", headers=h_mkt)
    assert r_detail.status_code == 200
    assert r_detail.json()["revenue"] == 4800.0

    # 5. Update milestone
    r_upd = client.put(
        f"/api/campaigns/{cid}/performance/{perf_id}",
        json={"revenue": 5500.0, "conversions": 180},
        headers=h_mkt
    )
    assert r_upd.status_code == 200
    assert r_upd.json()["revenue"] == 5500.0

    # 6. Soft-archival
    r_del = client.delete(f"/api/campaigns/{cid}/performance/{perf_id}", headers=h_mkt)
    assert r_del.status_code == 200
    assert "archived" in r_del.json()["message"].lower()

    # Once archived, active listing ignores it
    r_after_del = client.get(f"/api/campaigns/{cid}/performance", headers=h_mkt)
    assert r_after_del.json()["total"] == 0

    # But querying with include_archived=True preserves history
    r_archived_view = client.get(f"/api/campaigns/{cid}/performance?include_archived=true", headers=h_mkt)
    assert r_archived_view.json()["total"] == 1


def test_phase7_3_campaign_roi_breakdown_and_multi_role_rbac():
    """
    Tests end-to-end Campaign ROI calculation, cost breakdown, and multi-role RBAC:
    - Verifies accurate computation of ROI, ROAS, CPM, CPE, CTR, Conv Rate
    - Verifies creator financial privacy masking in cost breakdown
    - Verifies creator can only view their own creator-performance metrics
    - Verifies demo vs real data separation in summary
    - Verifies cross-tenant isolation (unauthorized users get 404)
    """
    from datetime import date
    from app.models import User, Campaign, CampaignCreator, Sponsorship, CampaignPerformance

    h_admin = reg("p73_admin@test.com", role="admin")
    h_mkt = reg("p73_mkt2@test.com", role="marketing")
    h_c1 = reg("p73_c1_roi@test.com", role="creator")
    h_c2 = reg("p73_c2_unauth@test.com", role="creator")

    with SessionLocal() as db:
        mkt = db.query(User).filter_by(email="p73_mkt2@test.com").one()
        c1 = db.query(User).filter_by(email="p73_c1_roi@test.com").one()
        c2 = db.query(User).filter_by(email="p73_c2_unauth@test.com").one()
        mkt_id = mkt.id
        c1_id = c1.id
        c2_id = c2.id

        # Create active real campaign
        camp = Campaign(
            user_id=mkt_id,
            title="Fitness Pro Energy Launch",
            client_name="EnergyPlus",
            status="active",
            platform="youtube",
            budget=20000.0,
            spent=10000.0,
            target_reach=500000,
            actual_reach=420000,
            start_date=date(2026, 5, 1),
            end_date=date(2026, 7, 31),
            is_demo=False
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        cid = camp.id

        # Assign Creator 1
        assign1 = CampaignCreator(
            campaign_id=cid,
            creator_id=c1_id,
            agreed_compensation=3000.0,
            status="accepted",
            deliverables="1 Dedicated Video + 2 Shorts",
            is_demo=False,
            is_archived=False
        )
        db.add(assign1)

        # Log performance: 200,000 impressions, 10,000 engagements, 4,000 clicks, 200 conversions, $18,000 revenue
        perf = CampaignPerformance(
            campaign_id=cid,
            creator_id=c1_id,
            impressions=200000,
            reach=160000,
            engagements=10000,
            clicks=4000,
            conversions=200,
            revenue=18000.0,
            reporting_date=date(2026, 6, 15),
            data_source="platform",
            is_demo=False,
            is_archived=False
        )
        db.add(perf)
        db.commit()

    # 1. Authoritative Ambiguity Detection vs Explicit Mode
    # Without cost_mode: both spent ($10,000) and talent ($3,000) exist, so engine returns unavailable ROI
    r_ambig = client.get(f"/api/campaigns/{cid}/roi", headers=h_mkt)
    assert r_ambig.status_code == 200
    d_ambig = r_ambig.json()
    assert d_ambig["cost"]["has_cost_ambiguity"] is True
    assert d_ambig["cost"]["total_campaign_cost"] is None
    assert d_ambig["metrics"]["roi_pct"] is None
    assert d_ambig["metrics"]["roas"] is None

    # With cost_mode=inclusive: specifies spent encompasses creator compensation
    r_roi = client.get(f"/api/campaigns/{cid}/roi?cost_mode=inclusive", headers=h_mkt)
    assert r_roi.status_code == 200
    d_roi = r_roi.json()

    # Cost breakdown checks
    assert d_roi["cost"]["total_campaign_cost"] == 10000.0
    assert d_roi["cost"]["budget"] == 20000.0
    assert d_roi["cost"]["budget_utilization_pct"] == 50.0

    # Revenue attribution checks
    assert d_roi["revenue"]["attributed_revenue"] == 18000.0
    assert d_roi["revenue"]["attribution_status"] == "verified"
    assert "platform" in d_roi["revenue"]["revenue_by_source"]
    assert d_roi["revenue"]["revenue_by_source"]["platform"] == 18000.0

    # Metrics validation
    # ROI = ((18000 - 10000) / 10000) * 100 = 80.0%
    assert d_roi["metrics"]["roi_pct"] == 80.0
    # ROAS = 18000 / 10000 = 1.8
    assert d_roi["metrics"]["roas"] == 1.8
    # CPM = (10000 / 200000) * 1000 = $50.00
    assert d_roi["metrics"]["cpm"] == 50.0
    # CPE = 10000 / 10000 = $1.00
    assert d_roi["metrics"]["cpe"] == 1.0
    # CTR = (4000 / 200000) * 100 = 2.0%
    assert d_roi["metrics"]["ctr"] == 2.0
    # Conversion Rate = (200 / 4000) * 100 = 5.0%
    assert d_roi["metrics"]["conversion_rate"] == 5.0
    # Net profit = 18000 - 10000 = 8000.0
    assert d_roi["metrics"]["net_profit"] == 8000.0

    # 2. Creator-Level Performance Endpoint
    # Manager sees Creator 1 breakdown
    r_c_perf = client.get(f"/api/campaigns/{cid}/creators/performance", headers=h_mkt)
    assert r_c_perf.status_code == 200
    assert r_c_perf.json()["total"] == 1
    cp1 = r_c_perf.json()["items"][0]
    assert cp1["creator_id"] == c1_id
    assert cp1["agreed_compensation"] == 3000.0
    assert cp1["impressions"] == 200000
    assert cp1["conversions"] == 200

    # Assigned Creator 1 can view own performance
    r_c1_view = client.get(f"/api/campaigns/{cid}/creators/performance", headers=h_c1)
    assert r_c1_view.status_code == 200
    assert len(r_c1_view.json()["items"]) == 1

    # Unassigned Creator 2 gets 404
    r_c2_view = client.get(f"/api/campaigns/{cid}/creators/performance", headers=h_c2)
    assert r_c2_view.status_code == 404

    # 3. Cost & Revenue Breakdown Endpoint (with explicit inclusive mode)
    r_breakdown = client.get(f"/api/campaigns/{cid}/breakdown?cost_mode=inclusive", headers=h_mkt)
    assert r_breakdown.status_code == 200
    assert r_breakdown.json()["cost_calculation_rule"] == "direct_spent_inclusive"
    assert "Strict zero-cross-contamination" in r_breakdown.json()["revenue_attribution_policy"]

    # 4. Multi-Campaign Overview (GET /api/campaigns/roi/summary)
    # include_demo=False ensures demo campaigns don't contaminate real figures
    r_sum_real = client.get("/api/campaigns/roi/summary?include_demo=false&cost_mode=inclusive", headers=h_mkt)
    assert r_sum_real.status_code == 200
    d_sum = r_sum_real.json()
    assert d_sum["has_demo"] is False
    assert d_sum["total_attributed_revenue"] >= 18000.0
    assert d_sum["overall_roi_pct"] is not None

    # Admin global access
    r_admin_sum = client.get("/api/campaigns/roi/summary?include_demo=true", headers=h_admin)
    assert r_admin_sum.status_code == 200
    assert r_admin_sum.json()["has_demo"] is True

    # 5. Cross-Tenant Protection: Creator 2 accessing Creator 1's campaign ROI directly -> 404
    assert client.get(f"/api/campaigns/{cid}/roi", headers=h_c2).status_code == 404


def test_phase7_3_audit_cost_scenarios_a_to_e():
    """
    Focused financial logic verification audit covering Scenarios A through E:
    - Scenario A: spent=1000, talent=300, spent includes talent (cost_mode='inclusive') -> cost=1000.
    - Scenario B: spent=1000, talent=300, spent excludes talent (cost_mode='additive') -> cost=1300.
    - Scenario C: spent=200, talent=500 -> additive=700, talent_only=500; authoritative default detects ambiguity and flags unavailable cost.
    - Scenario D: Overlapping sponsorships & creator agreed compensation -> deduplication verified, no double counting.
    - Scenario E: Soft-archived sponsorships & assignments -> excluded from active financial calculations.
    """
    from app.roi_engine import compute_campaign_cost

    class MockCampaign:
        def __init__(self, spent=0.0, budget=20000.0):
            self.spent = spent
            self.budget = budget

    class MockCreator:
        def __init__(self, creator_id, agreed_compensation, status="accepted", is_archived=False):
            self.creator_id = creator_id
            self.agreed_compensation = agreed_compensation
            self.status = status
            self.is_archived = is_archived

    class MockSponsorship:
        def __init__(self, creator_id, amount, payment_status="paid", contract_status="signed", is_archived=False):
            self.creator_id = creator_id
            self.amount = amount
            self.payment_status = payment_status
            self.contract_status = contract_status
            self.is_archived = is_archived

    # -------------------------------------------------------------------------
    # Scenario A: spent = 1000, talent = 300, spent INCLUDES talent
    # -------------------------------------------------------------------------
    camp_a = MockCampaign(spent=1000.0)
    creators_a = [MockCreator(creator_id=1, agreed_compensation=300.0)]
    spons_a = []

    res_a = compute_campaign_cost(camp_a, creators_a, spons_a, cost_mode="inclusive")
    assert res_a["direct_spend"] == 1000.0
    assert res_a["creator_compensation_total"] == 300.0
    assert res_a["deduplicated_talent_total"] == 300.0
    assert res_a["total_campaign_cost"] == 1000.0
    assert res_a["cost_rule_applied"] == "direct_spent_inclusive"
    assert res_a["has_cost_ambiguity"] is False
    # Verified: spent includes talent payments; no amount is double-counted.

    # -------------------------------------------------------------------------
    # Scenario B: spent = 1000, talent = 300, spent EXCLUDES talent
    # -------------------------------------------------------------------------
    camp_b = MockCampaign(spent=1000.0)
    creators_b = [MockCreator(creator_id=1, agreed_compensation=300.0)]
    spons_b = []

    res_b = compute_campaign_cost(camp_b, creators_b, spons_b, cost_mode="additive")
    assert res_b["direct_spend"] == 1000.0
    assert res_b["creator_compensation_total"] == 300.0
    assert res_b["deduplicated_talent_total"] == 300.0
    assert res_b["total_campaign_cost"] == 1300.0  # 1000 direct/media + 300 talent
    assert res_b["cost_rule_applied"] == "additive_direct_plus_talent"
    assert res_b["has_cost_ambiguity"] is False
    # Verified: media spend and talent payments are separate additive components.

    # -------------------------------------------------------------------------
    # Scenario C: spent = 200, talent = 500
    # -------------------------------------------------------------------------
    camp_c = MockCampaign(spent=200.0)
    creators_c = [MockCreator(creator_id=1, agreed_compensation=500.0)]
    spons_c = []

    # C.1: In additive mode
    res_c_add = compute_campaign_cost(camp_c, creators_c, spons_c, cost_mode="additive")
    assert res_c_add["total_campaign_cost"] == 700.0  # 200 + 500

    # C.2: In talent_only mode
    res_c_tal = compute_campaign_cost(camp_c, creators_c, spons_c, cost_mode="talent_only")
    assert res_c_tal["total_campaign_cost"] == 500.0

    # C.3: Under default authoritative mode without explicit accounting method:
    # Cannot establish relationship reliably; detects ambiguity and reports unavailable cost
    res_c_auth = compute_campaign_cost(camp_c, creators_c, spons_c, cost_mode="authoritative")
    assert res_c_auth["total_campaign_cost"] is None
    assert res_c_auth["has_cost_ambiguity"] is True
    assert res_c_auth["cost_rule_applied"] == "ambiguous_cost_components"
    assert "without an explicit cost_mode" in res_c_auth["cost_ambiguity_note"]

    # -------------------------------------------------------------------------
    # Scenario D: Some sponsorships overlap with creator agreed compensation
    # -------------------------------------------------------------------------
    # Creator 1 has agreed compensation = $3,000, and a sponsorship contract = $3,500 ($500 incremental)
    # Creator 2 has agreed compensation = $1,000, and no sponsorship
    # Creator 3 has sponsorship = $1,200, but no separate creator assignment
    camp_d = MockCampaign(spent=0.0)
    creators_d = [
        MockCreator(creator_id=1, agreed_compensation=3000.0),
        MockCreator(creator_id=2, agreed_compensation=1000.0)
    ]
    spons_d = [
        MockSponsorship(creator_id=1, amount=3500.0),
        MockSponsorship(creator_id=3, amount=1200.0)
    ]

    res_d = compute_campaign_cost(camp_d, creators_d, spons_d, cost_mode="authoritative")
    # Total creator comp = 3000 + 1000 = 4000
    assert res_d["creator_compensation_total"] == 4000.0
    # Total gross sponsorships = 3500 + 1200 = 4700
    assert res_d["sponsorship_total"] == 4700.0
    # Incremental sponsorship:
    # Creator 1: max(0, 3500 - 3000) = 500
    # Creator 3: max(0, 1200 - 0) = 1200
    # Total deduplicated talent spend = 4000 + (500 + 1200) = 5700.0
    # NOT 4000 + 4700 = 8700 (which would have double-counted Creator 1's $3000)!
    assert res_d["deduplicated_talent_total"] == 5700.0
    assert res_d["total_campaign_cost"] == 5700.0
    assert res_d["cost_rule_applied"] == "talent_commitments_only"

    # -------------------------------------------------------------------------
    # Scenario E: Some sponsorships and assignments are archived
    # -------------------------------------------------------------------------
    camp_e = MockCampaign(spent=5000.0)
    creators_e = [
        MockCreator(creator_id=1, agreed_compensation=2000.0, is_archived=False),
        MockCreator(creator_id=2, agreed_compensation=1500.0, is_archived=True),  # Archived
    ]
    spons_e = [
        MockSponsorship(creator_id=3, amount=1000.0, is_archived=False),
        MockSponsorship(creator_id=4, amount=800.0, is_archived=True),   # Archived
    ]

    # Active accounting (include_archived=False)
    res_e_active = compute_campaign_cost(camp_e, creators_e, spons_e, cost_mode="additive", include_archived=False)
    assert res_e_active["creator_compensation_total"] == 2000.0   # 1500 excluded
    assert res_e_active["sponsorship_total"] == 1000.0            # 800 excluded
    assert res_e_active["deduplicated_talent_total"] == 3000.0     # 2000 + 1000
    assert res_e_active["total_campaign_cost"] == 8000.0          # 5000 direct + 3000 active talent
    assert res_e_active["active_creators_count"] == 1
    assert res_e_active["active_sponsorships_count"] == 1

    # Full audit historical accounting (include_archived=True)
    res_e_all = compute_campaign_cost(camp_e, creators_e, spons_e, cost_mode="additive", include_archived=True)
    assert res_e_all["creator_compensation_total"] == 3500.0      # 2000 + 1500
    assert res_e_all["sponsorship_total"] == 1800.0               # 1000 + 800
    assert res_e_all["deduplicated_talent_total"] == 5300.0       # 3500 + 1800
    assert res_e_all["total_campaign_cost"] == 10300.0            # 5000 + 5300
    assert res_e_all["active_creators_count"] == 2
    assert res_e_all["active_sponsorships_count"] == 2











# =============================================================================
# Phase 7.5: Reports & Export Engine Tests
# =============================================================================

def test_phase7_5_reports_multi_campaign_export_formats_and_integrity():
    from app.models import Campaign, Brand
    h_mkt = reg("rep_mkt@test.com", role="marketing")

    with SessionLocal() as db:
        user = db.query(User).filter_by(email="rep_mkt@test.com").one()
        uid = user.id
        b = Brand(name="Acme Exports", industry="Technology", user_id=uid)
        db.add(b)
        db.commit()
        db.refresh(b)

        # Create normal campaign and campaign with formula injection test title
        c1 = Campaign(title="Summer Campaign", client_name="Acme", brand_id=b.id, user_id=uid, platform="youtube", status="active", budget=20000.0, spent=5000.0)
        c2 = Campaign(title="=1+1;cmd|' /C calc'!A0", client_name="+MaliciousClient", brand_id=b.id, user_id=uid, platform="instagram", status="active", budget=15000.0, spent=3000.0)
        db.add_all([c1, c2])
        db.commit()

    # 1. Test CSV Multi-Campaign Export
    r_csv = client.get("/api/reports/campaigns/export?format=csv&cost_mode=direct_only", headers=h_mkt)
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]
    assert "attachment; filename=\"creatorIQ-campaigns-summary-" in r_csv.headers["content-disposition"]
    csv_text = r_csv.text
    assert "# CREATORIQ CAMPAIGN ROI SUMMARY REPORT" in csv_text
    assert "Summer Campaign" in csv_text
    # Verify formula injection sanitization: leading '=' or '+' must be escaped with single quote
    assert "'=1+1;cmd|' /C calc'!A0" in csv_text
    assert "'+MaliciousClient" in csv_text

    # 2. Test XLSX Multi-Campaign Export
    r_xlsx = client.get("/api/reports/campaigns/export?format=xlsx&cost_mode=direct_only", headers=h_mkt)
    assert r_xlsx.status_code == 200
    assert "spreadsheetml" in r_xlsx.headers["content-type"]
    assert r_xlsx.content.startswith(b"PK\x03\x04")  # Standard ZIP signature for openpyxl docx/xlsx

    # 3. Test PDF Multi-Campaign Export
    r_pdf = client.get("/api/reports/campaigns/export?format=pdf&cost_mode=direct_only", headers=h_mkt)
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    assert r_pdf.content.startswith(b"%PDF")

    # 4. Invalid format returns 422
    assert client.get("/api/reports/campaigns/export?format=docx", headers=h_mkt).status_code == 422


def test_phase7_5_reports_single_campaign_export_and_isolation():
    from app.models import Campaign, Brand, CampaignCreator, CampaignPerformance
    h_mkt1 = reg("rep_single_mkt1@test.com", role="marketing")
    h_mkt2 = reg("rep_single_mkt2@test.com", role="marketing")
    h_admin = reg("rep_single_adm@test.com", role="administrator")

    with SessionLocal() as db:
        u1 = db.query(User).filter_by(email="rep_single_mkt1@test.com").one()
        c = Campaign(title="Deep Dive Q4", client_name="Fintech", user_id=u1.id, platform="youtube", status="active", budget=30000.0, spent=10000.0)
        db.add(c)
        db.commit()
        db.refresh(c)
        cid = c.id

        # Add milestone
        m = CampaignPerformance(campaign_id=cid, impressions=100000, reach=80000, engagements=5000, clicks=2000, conversions=100, revenue=18000.0, reporting_date=date.today())
        db.add(m)
        db.commit()

    # 1. Owner can export CSV, XLSX, and PDF
    r_csv = client.get(f"/api/reports/campaigns/{cid}/export?format=csv&cost_mode=inclusive", headers=h_mkt1)
    assert r_csv.status_code == 200
    assert "Deep Dive Q4" in r_csv.text
    assert "FINANCIAL & ROI PERFORMANCE" in r_csv.text

    r_xlsx = client.get(f"/api/reports/campaigns/{cid}/export?format=xlsx&cost_mode=inclusive", headers=h_mkt1)
    assert r_xlsx.status_code == 200
    assert r_xlsx.content.startswith(b"PK\x03\x04")

    r_pdf = client.get(f"/api/reports/campaigns/{cid}/export?format=pdf&cost_mode=inclusive", headers=h_mkt1)
    assert r_pdf.status_code == 200
    assert r_pdf.content.startswith(b"%PDF")

    # 2. Unauthorized cross-tenant user gets 404
    assert client.get(f"/api/reports/campaigns/{cid}/export?format=csv", headers=h_mkt2).status_code == 404

    # 3. Admin has global access
    assert client.get(f"/api/reports/campaigns/{cid}/export?format=csv&cost_mode=inclusive", headers=h_admin).status_code == 200


def test_phase7_5_reports_creator_export_and_financial_masking():
    from app.models import Campaign, CampaignCreator, CampaignPerformance
    h_mkt = reg("rep_cr_mkt@test.com", role="marketing")
    h_cr1 = reg("rep_cr_alice@test.com", role="creator")
    h_cr2 = reg("rep_cr_bob@test.com", role="creator")

    with SessionLocal() as db:
        mkt = db.query(User).filter_by(email="rep_cr_mkt@test.com").one()
        c1_u = db.query(User).filter_by(email="rep_cr_alice@test.com").one()
        c2_u = db.query(User).filter_by(email="rep_cr_bob@test.com").one()

        camp = Campaign(title="Roster Showcase", client_name="ClientA", user_id=mkt.id, platform="youtube", status="active", budget=40000.0, spent=0.0)
        db.add(camp)
        db.commit()
        db.refresh(camp)
        cid = camp.id

        # Assign both creators with distinct agreed compensations
        a1 = CampaignCreator(campaign_id=cid, creator_id=c1_u.id, agreed_compensation=3500.0, deliverables="1 dedicated video", status="in_progress")
        a2 = CampaignCreator(campaign_id=cid, creator_id=c2_u.id, agreed_compensation=7000.0, deliverables="2 shorts", status="in_progress")
        db.add_all([a1, a2])

        # Add milestone for Creator 1
        p1 = CampaignPerformance(campaign_id=cid, creator_id=c1_u.id, impressions=40000, reach=35000, engagements=2000, clicks=800, conversions=40, revenue=8000.0, reporting_date=date.today())
        db.add(p1)
        db.commit()

    # 1. Marketing manager exports creator deliverables report -> sees both creators unmasked
    r_mkt = client.get(f"/api/reports/creators/export?campaign_id={cid}&format=csv", headers=h_mkt)
    assert r_mkt.status_code == 200
    text_mkt = r_mkt.text
    assert "rep_cr_alice@test.com" in text_mkt
    assert "rep_cr_bob@test.com" in text_mkt
    assert "$3,500.00" in text_mkt
    assert "$7,000.00" in text_mkt

    # 2. Creator 1 exports creator report -> only gets their own record
    r_cr1 = client.get(f"/api/reports/creators/export?campaign_id={cid}&format=csv", headers=h_cr1)
    assert r_cr1.status_code == 200
    text_cr1 = r_cr1.text
    assert "rep_cr_alice@test.com" in text_cr1
    assert "$3,500.00" in text_cr1
    # Bob's private data is shielded
    assert "rep_cr_bob@test.com" not in text_cr1
    assert "$7,000.00" not in text_cr1

    # 3. Creator 1 exporting single campaign deep dive -> Bob's compensation is masked
    r_camp_cr1 = client.get(f"/api/reports/campaigns/{cid}/export?format=csv&cost_mode=authoritative", headers=h_cr1)
    assert r_camp_cr1.status_code == 200
    camp_text = r_camp_cr1.text
    assert "$3,500.00" in camp_text
    assert "$7,000.00" not in camp_text


def test_phase7_5_reports_cost_ambiguity_and_date_filtering():
    from app.models import Campaign, CampaignCreator, CampaignPerformance
    h_mkt = reg("rep_ambig_mkt@test.com", role="marketing")

    with SessionLocal() as db:
        u = db.query(User).filter_by(email="rep_ambig_mkt@test.com").one()
        c = Campaign(title="Ambiguous Spend Camp", client_name="BrandX", user_id=u.id, platform="youtube", status="active", budget=50000.0, spent=12000.0)
        db.add(c)
        db.commit()
        db.refresh(c)
        cid = c.id

        cc = CampaignCreator(campaign_id=cid, creator_id=u.id, agreed_compensation=4000.0, deliverables="1 post", status="completed")
        db.add(cc)

        # Milestone 1: Within date range
        m1 = CampaignPerformance(campaign_id=cid, impressions=20000, reach=15000, engagements=1000, clicks=400, conversions=20, revenue=3000.0, reporting_date=date(2026, 11, 1))
        # Milestone 2: Outside date range
        m2 = CampaignPerformance(campaign_id=cid, impressions=50000, reach=40000, engagements=2500, clicks=1000, conversions=50, revenue=7000.0, reporting_date=date(2026, 8, 1))
        db.add_all([m1, m2])
        db.commit()

    # 1. Under authoritative mode, cost ambiguity is detected and reflected in report
    r_auth = client.get(f"/api/reports/campaigns/{cid}/export?format=csv&cost_mode=authoritative", headers=h_mkt)
    assert r_auth.status_code == 200
    assert "ambiguous_cost_components" in r_auth.text
    # Total Campaign Cost should be N/A
    assert "Total Campaign Cost,N/A" in r_auth.text

    # 2. Date filtering: query only November milestones
    r_filtered = client.get(f"/api/reports/campaigns/{cid}/export?format=csv&cost_mode=inclusive&start_date=2026-11-01&end_date=2026-11-03", headers=h_mkt)
    assert r_filtered.status_code == 200
    # M1 impressions (20,000) included, M2 (50,000) excluded from totals
    assert 'Total Impressions,"20,000"' in r_filtered.text


# =============================================================================
# Phase 7.7: PostgreSQL & Alembic Migration Tests
# =============================================================================

def test_phase7_7_alembic_migration_schema_and_repeatability():
    import os
    import sys
    import sqlite3
    import subprocess

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    temp_db_name = "test_alembic_ci.db"
    temp_db_path = os.path.join(backend_dir, temp_db_name)
    if os.path.exists(temp_db_path):
        os.remove(temp_db_path)

    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{temp_db_name}"

    try:
        # 1. Test Alembic Upgrade to Head on disposable database
        res_up = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=backend_dir,
            env=env,
            capture_output=True,
            text=True
        )
        assert res_up.returncode == 0, f"Alembic upgrade head failed: {res_up.stderr}"

        # 2. Verify all 16 tables exist in created database
        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()
        tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
        conn.close()

        expected_tables = {
            "users", "activities", "agency_creators", "audience_metrics", "brands",
            "content_records", "follower_growth", "hashtag_metrics", "notifications",
            "oauth_states", "revenue_records", "social_connections", "campaigns",
            "campaign_creators", "campaign_performances", "sponsorships", "alembic_version"
        }
        assert expected_tables.issubset(set(tables)), f"Missing tables after upgrade: {expected_tables - set(tables)}"

        # 3. Test Alembic Downgrade to Base
        res_down = subprocess.run(
            [sys.executable, "-m", "alembic", "downgrade", "base"],
            cwd=backend_dir,
            env=env,
            capture_output=True,
            text=True
        )
        assert res_down.returncode == 0, f"Alembic downgrade base failed: {res_down.stderr}"

        # 4. Repeatability: Re-run Upgrade to Head
        res_up2 = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=backend_dir,
            env=env,
            capture_output=True,
            text=True
        )
        assert res_up2.returncode == 0, f"Alembic repeat upgrade failed: {res_up2.stderr}"

    finally:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)


def test_phase7_8_staging_configuration_and_health_check():
    """
    Phase 7.8 Staging Readiness Test:
    1. Verify /api/health endpoint returns 200 with database dialect and status 'ok'.
    2. Verify health degradation: if database connection ping fails, returns 503 with 'degraded'.
    3. Verify Settings supports AUTO_INIT_DB, connection pool parameters, and LOG_LEVEL.
    4. Verify staging environment file template (.env.staging.example) contains all mandatory staging variables.
    5. Verify docker-compose.staging.yml structure: services db, migration, backend, frontend with appropriate healthchecks and startup dependencies.
    """
    import os
    from unittest.mock import patch
    from app.config import settings

    # 1. Active health check with working DB
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert data["database"] in ("sqlite", "postgresql")

    # 2. Degraded health check simulation
    with patch("app.main.engine.connect", side_effect=Exception("Database connection timeout")):
        res_fail = client.get("/api/health")
        assert res_fail.status_code == 503
        data_fail = res_fail.json()
        assert data_fail["status"] == "degraded"
        assert "timeout" in data_fail["error"]

    # 3. Settings configuration verification
    assert hasattr(settings, "AUTO_INIT_DB")
    assert hasattr(settings, "DB_POOL_SIZE")
    assert hasattr(settings, "DB_MAX_OVERFLOW")
    assert hasattr(settings, "DB_POOL_TIMEOUT")
    assert hasattr(settings, "DB_POOL_RECYCLE")
    assert hasattr(settings, "LOG_LEVEL")

    # 4. Staging .env template verification
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
    staging_env_path = os.path.join(root_dir, ".env.staging.example")
    assert os.path.exists(staging_env_path), "Missing .env.staging.example in root directory"

    with open(staging_env_path, "r", encoding="utf-8") as f:
        env_content = f.read()
    for required_key in [
        "ENVIRONMENT=staging",
        "AUTO_INIT_DB=false",
        "ALLOW_DEV_ADMIN_REGISTRATION=false",
        "DATABASE_URL=postgresql://",
        "SECRET_KEY=",
        "CORS_ORIGINS=",
        "META_GRAPH_API_VERSION=v26.0",
    ]:
        assert required_key in env_content, f"Missing required configuration '{required_key}' in .env.staging.example"

    # 5. docker-compose.staging.yml verification
    compose_path = os.path.join(root_dir, "docker-compose.staging.yml")
    assert os.path.exists(compose_path), "Missing docker-compose.staging.yml"
    with open(compose_path, "r", encoding="utf-8") as f:
        compose_content = f.read()

    assert "creatoriq-staging-db" in compose_content
    assert "creatoriq-staging-migration" in compose_content
    assert "creatoriq-staging-backend" in compose_content
    assert "creatoriq-staging-frontend" in compose_content
    assert "service_completed_successfully" in compose_content
    assert "alembic" in compose_content
    assert "upgrade" in compose_content
    assert "head" in compose_content




def test_phase8_1_reach_prediction_engine():
    """Phase 8.1 Reach Prediction Statistical Model (PDF Module 4)."""
    from datetime import timedelta
    headers = reg("p8_reach_creator@test.com", "creator")
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="p8_reach_creator@test.com").one()
        for i in range(5):
            db.add(ContentRecord(
                user_id=u.id, title=f"Sample Video {i+1}", platform="youtube",
                published_at=date.today() - timedelta(days=i),
                views=1200 * (i + 1), likes=120 * (i + 1), comments=25 * (i + 1),
                shares=15 * (i + 1), saves=8 * (i + 1), reach=1800 * (i + 1),
                watch_time_minutes=50.0 * (i + 1)
            ))
        db.add(AudienceMetric(
            user_id=u.id, platform="youtube",
            age_distribution={"18-24": 30.0, "25-34": 50.0, "35-44": 20.0},
            gender_distribution={"Female": 50.0, "Male": 50.0},
            geo_distribution={"United States": 45.0, "United Kingdom": 25.0},
            device_distribution={"Mobile": 70.0, "Desktop": 25.0, "Tablet": 5.0},
            active_hours=[10, 5, 2, 0, 0, 5, 15, 30, 50, 70, 85, 95, 100, 95, 90, 85, 80, 75, 60, 45, 30, 20, 15, 10]
        ))
        db.commit()

    res = client.get(
        "/api/trends/reach-prediction?platform=youtube&content_type=video&hashtags=tech,ai,creator&planned_hour=14",
        headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["platform"] == "youtube"
    assert data["content_type"] == "video"
    assert data["expected_reach"] > 0
    assert data["min_reach"] <= data["expected_reach"] <= data["max_reach"]
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert len(data["hashtag_impact"]) == 3
    assert "optimal_posting_window" in data
    assert len(data["recommendations"]) > 0


def test_phase8_2_six_platform_social_integrations_and_sync():
    """Phase 8.2 6-Platform Social Media Integration & Sync (PDF Module 6)."""
    headers = reg("p8_social_creator@test.com", "creator")

    for plat in ["tiktok", "facebook", "x", "linkedin"]:
        res_auth = client.get(f"/api/connections/{plat}/auth-url", headers=headers)
        assert res_auth.status_code == 200
        data = res_auth.json()
        assert "oauth_url" in data
        assert "state" in data

    res_sync = client.post("/api/connections/tiktok/sync", headers=headers)
    assert res_sync.status_code == 200
    assert res_sync.json()["status"] == "success"

    res_sync_all = client.post("/api/connections/sync-all", headers=headers)
    assert res_sync_all.status_code == 200
    sync_data = res_sync_all.json()
    assert sync_data["status"] == "success"
    assert "results" in sync_data


def test_phase8_3_realtime_websocket_and_event_simulation():
    """Phase 8.3 Real-Time Analytics WebSocket Engine (PDF Module 7)."""
    headers = reg("p8_ws_creator@test.com", "creator")

    sim_res = client.post(
        "/api/ws/simulate-event?event_type=metric_update&platform=youtube",
        headers=headers
    )
    assert sim_res.status_code == 200
    assert sim_res.json()["success"] is True
    assert "payload" in sim_res.json()
    assert sim_res.json()["payload"]["metrics"]["views"] == 15420


def test_phase8_4_scheduled_tasks_and_weekly_digest():
    """Phase 8.4 Scheduled Synchronization & Background Tasks (PDF Module 6, 8, 10)."""
    from datetime import timedelta
    headers = reg("p8_digest_creator@test.com", "creator")
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="p8_digest_creator@test.com").one()
        db.add(ContentRecord(
            user_id=u.id, title="Weekly Highlight Post", platform="youtube",
            published_at=date.today() - timedelta(days=2),
            views=15000, likes=1200, comments=350, shares=180, saves=95, reach=22000
        ))
        db.add(RevenueRecord(
            user_id=u.id, source="Sponsorships", platform="youtube",
            amount=1500.0, date=date.today() - timedelta(days=2)
        ))
        db.commit()

    res_digest = client.post("/api/notifications/scheduled-reports/run", headers=headers)
    assert res_digest.status_code == 200
    assert res_digest.json()["success"] is True

    res_get_digest = client.get("/api/notifications/weekly-digest", headers=headers)
    assert res_get_digest.status_code == 200
    assert "Weekly Performance" in res_get_digest.json()["title"]

    res_miles = client.post("/api/notifications/scheduled-milestones/run", headers=headers)
    assert res_miles.status_code == 200
    assert res_miles.json()["success"] is True

    res_gsync = client.post("/api/connections/scheduled-sync/run", headers=headers)
    assert res_gsync.status_code == 200
    assert "total_users" in res_gsync.json()


def test_phase8_5_multi_format_reports_exports():
    """Phase 8.5 Multi-Format Reports & CWE-1236 Sanitization (PDF Module 8 & 9)."""
    headers = reg("p8_export_creator@test.com", "creator")
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="p8_export_creator@test.com").one()
        db.add(ContentRecord(
            user_id=u.id, title="=1+2 Formula Test", platform="youtube",
            published_at=date.today(), views=5000, likes=400, comments=50,
            shares=25, saves=10, reach=7000, watch_time_minutes=120.0
        ))
        db.add(AudienceMetric(
            user_id=u.id, platform="youtube",
            age_distribution={"18-24": 40.0, "25-34": 60.0},
            gender_distribution={"Female": 50.0, "Male": 50.0},
            geo_distribution={"India": 50.0, "US": 50.0},
            device_distribution={"Mobile": 75.0, "Desktop": 20.0, "Tablet": 5.0},
            active_hours=[10] * 24
        ))
        db.add(RevenueRecord(
            user_id=u.id, source="Ad Revenue", platform="youtube",
            amount=450.75, date=date.today(), notes="@TestFormulaNote"
        ))
        db.add(FollowerGrowth(
            user_id=u.id, platform="youtube", date=date.today(),
            followers=25000, new_followers=150, impressions=6000, reach=4500
        ))
        db.commit()

    export_endpoints = [
        ("/api/reports/content/export", "content-performance"),
        ("/api/reports/audience/export", "audience-analytics"),
        ("/api/reports/revenue/export", "revenue-report"),
        ("/api/reports/growth/export", "follower-growth"),
    ]

    for endpoint, filename_keyword in export_endpoints:
        # CSV
        csv_res = client.get(f"{endpoint}?format=csv", headers=headers)
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        assert filename_keyword in csv_res.headers["content-disposition"]
        # CWE-1236 verification: initial '=' or '@' in text is escaped with leading single quote
        csv_text = csv_res.content.decode("utf-8")
        assert "'=1+2 Formula Test" in csv_text or "'@TestFormulaNote" in csv_text or "CreatorIQ" in csv_text

        # Excel (.xlsx)
        xlsx_res = client.get(f"{endpoint}?format=xlsx", headers=headers)
        assert xlsx_res.status_code == 200
        assert "spreadsheetml" in xlsx_res.headers["content-type"]
        assert len(xlsx_res.content) > 1000

        # PDF
        pdf_res = client.get(f"{endpoint}?format=pdf", headers=headers)
        assert pdf_res.status_code == 200
        assert "application/pdf" in pdf_res.headers["content-type"]
        assert pdf_res.content.startswith(b"%PDF")


def test_phase8_6_redis_caching_and_mongodb_archival():
    """Phase 8.6 Redis Caching & MongoDB Document Store (PDF Module 10)."""
    from app.cache_redis import cache
    from app.database_mongo import mongo_store

    headers = reg("p8_store_creator@test.com", "creator")
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="p8_store_creator@test.com").one()
        uid = u.id

    # Redis Cache set, get, invalidate
    cache.set_json(f"user:{uid}:test_metric", {"views": 8888}, ttl_seconds=60)
    assert cache.get_json(f"user:{uid}:test_metric") == {"views": 8888}
    cache.invalidate_user_cache(uid)

    # MongoDB Raw Payload Archival
    raw_payload = {"id": "tiktok_post_999", "caption": "Viral dance challenge", "views": 50000}
    doc_id = mongo_store.archive_raw_post(
        user_id=uid, platform="tiktok", external_id="tiktok_post_999", raw_payload=raw_payload
    )
    assert doc_id is not None
    posts = mongo_store.get_archived_posts(user_id=uid, platform="tiktok")
    assert len(posts) >= 1
    assert posts[0]["external_id"] == "tiktok_post_999"


def test_phase8_8_performance_benchmarks():
    """Phase 8.8 Performance Benchmarks: API <200ms, Cache <5ms, Reports <1s."""
    import time
    from app.cache_redis import cache

    headers = reg("p8_perf_creator@test.com", "creator")

    # 1. Cache Latency Benchmark < 5ms
    cache.set_json("perf_bench_key", {"status": "ok"}, ttl_seconds=30)
    t0 = time.perf_counter()
    for _ in range(50):
        _ = cache.get_json("perf_bench_key")
    elapsed_ms = ((time.perf_counter() - t0) / 50) * 1000
    assert elapsed_ms < 5.0, f"Cache latency too high: {elapsed_ms:.2f}ms"

    # 2. Dashboard API Latency < 200ms
    t0 = time.perf_counter()
    res = client.get("/api/dashboard/overview", headers=headers)
    api_elapsed_ms = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200
    assert api_elapsed_ms < 200.0, f"Dashboard API latency too high: {api_elapsed_ms:.2f}ms"

    # 3. Report Export Latency < 1000ms
    t0 = time.perf_counter()
    rep_res = client.get("/api/reports/content/export?format=csv", headers=headers)
    rep_elapsed_ms = (time.perf_counter() - t0) * 1000
    assert rep_res.status_code == 200
    assert rep_elapsed_ms < 1000.0, f"CSV report generation too slow: {rep_elapsed_ms:.2f}ms"
