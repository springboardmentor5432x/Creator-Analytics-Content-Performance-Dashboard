from datetime import date, datetime, timedelta, timezone

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AccountMetric,
    AudienceInsight,
    ContentMetric,
    ContentPost,
    CreatorProfile,
    OAuthCredential,
    OAuthState,
    SocialAccount,
    TrackedCreator,
    TrackedCreatorSnapshot,
    TrackedCreatorVideo,
    TrackedCreatorVideoSnapshot,
    User,
)
from app.oauth_storage import load_oauth_credential, save_oauth_credential
from app.routers.integrations import _consume_state, _new_state
from app.token_security import encrypt_token
from app.youtube_service import rows_as_dicts, sync_youtube_account


def _creator_profile(db: Session) -> CreatorProfile:
    user = db.query(User).filter_by(email="demo@creatoriq.dev").one()
    return db.query(CreatorProfile).filter_by(user_id=user.id).one()


def test_oauth_credential_storage_encrypts_and_decrypts_tokens(test_engine):
    key = Fernet.generate_key().decode("ascii")
    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform="YouTube",
            handle="@m2-storage-test-channel",
            followers_count=10,
            is_connected=False,
        )
        db.add(account)
        db.flush()
        row = save_oauth_credential(
            db,
            social_account_id=account.id,
            access_token="access-secret-value",
            refresh_token="refresh-secret-value",
            provider_account_id="UC-storage-test",
            scopes=["youtube.readonly"],
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            encryption_key=key,
        )
        db.commit()
        assert row.encrypted_access_token != "access-secret-value"
        assert row.encrypted_refresh_token != "refresh-secret-value"
        loaded = load_oauth_credential(db, social_account_id=account.id, encryption_key=key)
        assert loaded is not None
        assert loaded.access_token == "access-secret-value"
        assert loaded.refresh_token == "refresh-secret-value"
        assert loaded.provider_account_id == "UC-storage-test"
        assert loaded.scopes == ("youtube.readonly",)


def test_oauth_storage_rejects_unknown_social_account(test_engine):
    key = Fernet.generate_key().decode("ascii")
    with Session(test_engine) as db:
        with pytest.raises(LookupError):
            save_oauth_credential(
                db,
                social_account_id=999999,
                access_token="test-token",
                encryption_key=key,
            )


def test_oauth_state_is_one_time_and_only_hash_is_stored(test_engine):
    with Session(test_engine) as db:
        user = db.query(User).filter_by(email="demo@creatoriq.dev").one()
        raw = _new_state(db, user.id, "youtube")
        assert len(raw) > 32
        rows = db.query(OAuthState).filter_by(user_id=user.id).all()
        assert rows
        import hashlib
        expected = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        assert rows[-1].state_hash == expected
        assert rows[-1].state_hash != raw
        assert _consume_state(db, raw, "youtube") == user.id
        with pytest.raises(Exception):
            _consume_state(db, raw, "youtube")


def test_rows_as_dicts_maps_headers_to_values():
    report = {
        "columnHeaders": [{"name": "day"}, {"name": "views"}],
        "rows": [["2026-10-20", 123], ["2026-10-21", 456]],
    }
    assert rows_as_dicts(report) == [
        {"day": "2026-10-20", "views": 123},
        {"day": "2026-10-21", "views": 456},
    ]


def test_youtube_public_channel_search_resolution_and_paginated_video_mapping(monkeypatch):
    from app import youtube_service

    channel_ids = ["UC" + "5" * 22, "UC" + "6" * 22]
    requests = []

    def fake_public_data_get(endpoint, params=None):
        requests.append((endpoint, params or {}))
        if endpoint == "search":
            return {"items": [
                {"id": {"channelId": channel_ids[0]}},
                {"id": {"channelId": channel_ids[1]}},
            ]}
        if endpoint == "channels" and "forHandle" in params:
            return {"items": [{
                "id": channel_ids[0],
                "snippet": {"title": "Handle resolved", "customUrl": "@resolved"},
                "statistics": {"viewCount": "100", "videoCount": "4"},
                "contentDetails": {"relatedPlaylists": {"uploads": "UU-upload"}},
            }]}
        if endpoint == "channels":
            channel_items = [
                {
                    "id": channel_ids[0],
                    "snippet": {"title": "First"},
                    "statistics": {"viewCount": "100", "subscriberCount": "25", "videoCount": "4"},
                    "contentDetails": {"relatedPlaylists": {"uploads": "UU-first"}},
                },
                {
                    "id": channel_ids[1],
                    "snippet": {"title": "Second"},
                    "statistics": {"viewCount": "200", "videoCount": "8", "hiddenSubscriberCount": True},
                    "contentDetails": {"relatedPlaylists": {"uploads": "UU-second"}},
                },
            ]
            requested_ids = str(params.get("id", "")).split(",")
            return {
                "items": [
                    item for item in channel_items
                    if item["id"] in requested_ids
                ]
            }
        if endpoint == "playlistItems":
            assert params["pageToken"] == "page-2"
            return {
                "items": [
                    {"contentDetails": {"videoId": "public-video-a"}},
                    {"contentDetails": {"videoId": "public-video-b"}},
                ],
                "nextPageToken": "page-3",
            }
        if endpoint == "videos":
            assert params["id"] == "public-video-a,public-video-b"
            return {"items": [
                {
                    "id": "public-video-a",
                    "snippet": {"title": "Video A", "channelId": channel_ids[0]},
                    "statistics": {"viewCount": "90", "likeCount": "9"},
                    "contentDetails": {"duration": "PT30S"},
                },
                {
                    "id": "public-video-b",
                    "snippet": {"title": "Video B", "channelId": channel_ids[0]},
                    "statistics": {"viewCount": "0", "commentCount": "0"},
                    "contentDetails": {"duration": "PT1M"},
                },
            ]}
        raise AssertionError(f"Unexpected public API request: {endpoint}")

    monkeypatch.setattr(youtube_service, "public_data_get", fake_public_data_get)
    channels = youtube_service.search_public_channels("two channels", 7)
    assert [channel["channel_id"] for channel in channels] == channel_ids
    assert channels[1]["subscriber_count"] is None
    assert channels[1]["hidden_subscriber_count"] is True
    assert youtube_service.resolve_public_channel("@resolved")["channel_id"] == channel_ids[0]
    by_id = youtube_service.resolve_public_channel(channel_ids[1])
    assert by_id["video_count"] == 8
    page = youtube_service.get_public_channel_videos("UU-upload", 50, "page-2")
    assert page["next_page_token"] == "page-3"
    assert [video["video_id"] for video in page["videos"]] == ["public-video-a", "public-video-b"]
    assert page["videos"][0]["like_count"] == 9
    assert page["videos"][1]["like_count"] is None
    assert [endpoint for endpoint, _params in requests].count("videos") == 1


def test_analytics_endpoints_return_seeded_data(client: TestClient, creator_token: str):
    headers = {"Authorization": f"Bearer {creator_token}"}
    content = client.get("/api/analytics/content?days=30&mode=demo", headers=headers)
    audience = client.get("/api/analytics/audience?mode=demo", headers=headers)
    growth = client.get("/api/analytics/growth?days=7&mode=demo", headers=headers)
    providers = client.get("/api/integrations/providers", headers=headers)
    accounts = client.get("/api/integrations/accounts", headers=headers)

    assert content.status_code == 200, content.text
    assert content.json()["posts"]
    assert "average_engagement_rate" in content.json()["totals"]
    assert audience.status_code == 200, audience.text
    assert audience.json()["accounts"]
    assert growth.status_code == 200, growth.text
    assert len(growth.json()["days"]) == 7
    assert providers.status_code == 200
    assert {p["id"] for p in providers.json()["providers"]} >= {"youtube", "instagram", "facebook", "x", "linkedin"}
    assert "tiktok" not in {p["id"] for p in providers.json()["providers"]}
    assert accounts.status_code == 200
    assert accounts.json()["accounts"]


def test_analytics_endpoints_require_authentication(client: TestClient):
    assert client.get("/api/analytics/content").status_code == 401
    assert client.get("/api/integrations/accounts").status_code == 401


def test_analytics_defaults_to_live_and_demo_data_requires_explicit_mode(client, creator_token):
    headers = {"Authorization": f"Bearer {creator_token}"}
    live = client.get("/api/analytics/content", headers=headers)
    demo = client.get("/api/analytics/content?mode=demo", headers=headers)
    assert live.status_code == 200
    assert live.json()["data_source"] == "none"
    assert live.json()["posts"] == []
    assert demo.status_code == 200
    assert demo.json()["data_source"] == "demo"
    assert demo.json()["posts"]
    assert client.get(
        "/api/analytics/content?mode=all",
        headers=headers,
    ).status_code == 422


def test_public_youtube_creator_search_returns_multiple_real_matches(client, creator_token, monkeypatch):
    from app.routers import creators as creator_router

    channels = [
        {"channel_id": "UC" + "1" * 22, "title": "First channel", "source": "youtube_data_api_public"},
        {"channel_id": "UC" + "2" * 22, "title": "Second channel", "source": "youtube_data_api_public"},
    ]
    monkeypatch.setattr(creator_router, "search_public_channels", lambda query, limit: channels)
    response = client.get(
        "/api/creators/youtube/search?query=creator+name&max_results=5",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["count"] == 2
    assert response.json()["channels"] == channels


def test_public_youtube_creator_tracking_persists_snapshots_paginates_and_is_idempotent(
    test_engine, client, creator_token, monkeypatch
):
    from app import public_creator_service
    from app.routers import creators as creator_router

    channel_id = "UC" + "3" * 22
    channel = {
        "channel_id": channel_id,
        "title": "Tracked public creator",
        "description": "Public channel description",
        "thumbnail_url": "https://example.test/channel.jpg",
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "custom_url": "@tracked",
        "published_at": "2024-01-01T00:00:00Z",
        "subscriber_count": 1200,
        "view_count": 10000,
        "video_count": 2,
        "hidden_subscriber_count": False,
        "uploads_playlist_id": "UU-tracked",
        "source": "youtube_data_api_public",
    }
    counters = {"views": 10000, "subscribers": 1200, "video": 100}
    fixed_time = datetime(2026, 10, 29, 10, 0, tzinfo=timezone.utc)
    current_time = {"value": fixed_time}
    page_calls = []

    def get_channel(_channel_id):
        assert _channel_id == channel_id
        return {
            **channel,
            "view_count": counters["views"],
            "subscriber_count": counters["subscribers"],
        }

    def get_video_page(_playlist_id, _page_size, page_token=None):
        page_calls.append(page_token)
        if page_token is None:
            return {
                "videos": [{
                    "video_id": "public-video-1",
                    "title": "Public video one",
                    "description": "Description one",
                    "thumbnail_url": "https://example.test/video-1.jpg",
                    "channel_id": channel_id,
                    "channel_title": channel["title"],
                    "published_at": "2026-10-01T10:00:00Z",
                    "duration": "PT1M",
                    "view_count": counters["video"],
                    "like_count": 10,
                    "comment_count": 2,
                }],
                "next_page_token": "second-page",
            }
        return {
            "videos": [{
                "video_id": "public-video-2",
                "title": "Public video two",
                "description": "",
                "thumbnail_url": None,
                "channel_id": channel_id,
                "channel_title": channel["title"],
                "published_at": "2026-10-02T10:00:00Z",
                "duration": "PT2M",
                "view_count": 50,
                "like_count": None,
                "comment_count": None,
            }],
            "next_page_token": None,
        }

    monkeypatch.setattr(creator_router, "get_public_channel", get_channel)
    monkeypatch.setattr(public_creator_service, "get_public_channel", get_channel)
    monkeypatch.setattr(public_creator_service, "get_public_channel_videos", get_video_page)
    monkeypatch.setattr(public_creator_service, "utc_now", lambda: current_time["value"])

    headers = {"Authorization": f"Bearer {creator_token}"}
    tracked = client.post(
        "/api/creators/youtube/tracked",
        json={"channel_id": channel_id},
        headers=headers,
    )
    assert tracked.status_code == 201, tracked.text
    payload = tracked.json()
    creator_id = payload["id"]
    assert payload["source"] == "youtube_data_api_public"
    assert payload["analytics_type"] == "public_creator_tracking"
    assert payload["available_metrics"]["watch_time"] is False
    assert payload["available_metrics"]["audience_demographics"] is False
    assert payload["sync"]["videos_seen"] == 2
    assert payload["sync"]["pages_fetched"] == 2
    assert page_calls == [None, "second-page"]
    assert len(payload["channel_snapshots"]) == 1
    videos_by_id = {video["video_id"]: video for video in payload["videos"]}
    assert videos_by_id["public-video-1"]["public_engagement_proxy_rate"] == 12.0
    assert videos_by_id["public-video-2"]["public_engagement_proxy_rate"] is None

    duplicate = client.post(
        "/api/creators/youtube/tracked",
        json={"channel_id": channel_id},
        headers=headers,
    )
    assert duplicate.status_code == 409

    counters.update({"views": 11500, "subscribers": 1250, "video": 175})
    current_time["value"] = datetime(2026, 10, 30, 10, 0, tzinfo=timezone.utc)
    synced = client.post(
        f"/api/creators/youtube/tracked/{creator_id}/sync",
        headers=headers,
    )
    assert synced.status_code == 200, synced.text
    assert len(synced.json()["channel_snapshots"]) == 2
    interval = synced.json()["growth_intervals"][0]
    assert interval["view_count_change"] == 1500
    assert interval["subscriber_count_change"] == 50
    assert "not assigned to a specific day" in interval["interpretation"]

    repeated = client.post(
        f"/api/creators/youtube/tracked/{creator_id}/sync",
        headers=headers,
    )
    assert repeated.status_code == 200, repeated.text
    assert len(repeated.json()["channel_snapshots"]) == 2

    with Session(test_engine) as db:
        assert db.query(TrackedCreator).filter_by(id=creator_id).count() == 1
        assert db.query(TrackedCreatorSnapshot).filter_by(tracked_creator_id=creator_id).count() == 2
        assert db.query(TrackedCreatorVideo).filter_by(tracked_creator_id=creator_id).count() == 2
        assert db.query(TrackedCreatorVideoSnapshot).count() == 4


def test_public_creator_tracking_is_user_isolated_and_untrack_deletes_owned_history(
    test_engine, client, creator_token, admin_token, monkeypatch
):
    from app import public_creator_service
    from app.routers import creators as creator_router

    channel_id = "UC" + "4" * 22
    channel = {
        "channel_id": channel_id,
        "title": "Isolation test",
        "description": "",
        "thumbnail_url": None,
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "custom_url": None,
        "published_at": None,
        "subscriber_count": None,
        "view_count": 1,
        "video_count": 0,
        "hidden_subscriber_count": True,
        "uploads_playlist_id": None,
    }
    monkeypatch.setattr(creator_router, "get_public_channel", lambda _channel_id: channel)
    monkeypatch.setattr(public_creator_service, "get_public_channel", lambda _channel_id: channel)
    tracked = client.post(
        "/api/creators/youtube/tracked",
        json={"channel_id": channel_id},
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert tracked.status_code == 201, tracked.text
    creator_id = tracked.json()["id"]

    foreign_detail = client.get(
        f"/api/creators/youtube/tracked/{creator_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    foreign_list = client.get(
        "/api/creators/youtube/tracked",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert foreign_detail.status_code == 404
    assert foreign_list.json()["creators"] == []

    deleted = client.delete(
        f"/api/creators/youtube/tracked/{creator_id}",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert deleted.status_code == 204
    with Session(test_engine) as db:
        assert db.query(TrackedCreator).filter_by(id=creator_id).first() is None
        assert db.query(TrackedCreatorSnapshot).filter_by(tracked_creator_id=creator_id).count() == 0


def test_public_creator_load_more_continues_saved_uploads_pagination(client, creator_token, monkeypatch):
    from app import public_creator_service
    from app.routers import creators as creator_router

    channel_id = "UC" + "7" * 22
    channel = {
        "channel_id": channel_id,
        "title": "Paginated public creator",
        "description": "",
        "thumbnail_url": None,
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "custom_url": None,
        "published_at": None,
        "subscriber_count": 20,
        "view_count": 200,
        "video_count": 2,
        "hidden_subscriber_count": False,
        "uploads_playlist_id": "UU-pages",
    }
    monkeypatch.setattr(creator_router, "get_public_channel", lambda _channel_id: channel)
    monkeypatch.setattr(public_creator_service, "get_public_channel", lambda _channel_id: channel)
    monkeypatch.setattr(public_creator_service, "MAX_SYNC_VIDEOS", 1)

    def page(_playlist, _page_size, page_token=None):
        if page_token is None:
            return {
                "videos": [{
                    "video_id": "newest-video",
                    "title": "Newest",
                    "view_count": 10,
                    "like_count": 1,
                    "comment_count": 0,
                }],
                "next_page_token": "saved-older-page",
            }
        assert page_token == "saved-older-page"
        return {
            "videos": [{
                "video_id": "older-video",
                "title": "Older",
                "view_count": 5,
                "like_count": 0,
                "comment_count": 0,
            }],
            "next_page_token": None,
        }

    monkeypatch.setattr(public_creator_service, "get_public_channel_videos", page)
    headers = {"Authorization": f"Bearer {creator_token}"}
    tracked = client.post(
        "/api/creators/youtube/tracked",
        json={"channel_id": channel_id},
        headers=headers,
    )
    assert tracked.status_code == 201, tracked.text
    creator_id = tracked.json()["id"]
    assert tracked.json()["more_videos_available"] is True
    assert len(tracked.json()["videos"]) == 1

    loaded = client.post(
        f"/api/creators/youtube/tracked/{creator_id}/load-more",
        headers=headers,
    )
    assert loaded.status_code == 200, loaded.text
    assert loaded.json()["more_videos_available"] is False
    assert {video["video_id"] for video in loaded.json()["videos"]} == {"newest-video", "older-video"}


def test_analytics_platform_filters_work_for_supported_platforms(client: TestClient, creator_token: str):
    headers = {"Authorization": f"Bearer {creator_token}"}
    content = client.get("/api/analytics/content?days=30&platform=YouTube&mode=demo", headers=headers)
    assert content.status_code == 200, content.text
    payload = content.json()
    assert payload["platform"] == "YouTube"
    assert payload["posts"]
    assert all(post["platform"] == "YouTube" for post in payload["posts"])

    audience = client.get("/api/analytics/audience?platform=YouTube&mode=demo", headers=headers)
    assert audience.status_code == 200, audience.text
    audience_payload = audience.json()
    assert audience_payload["accounts"]
    assert all(account["platform"] == "YouTube" for account in audience_payload["accounts"])

    growth = client.get("/api/analytics/growth?days=7&platform=YouTube&mode=demo", headers=headers)
    assert growth.status_code == 200, growth.text
    growth_payload = growth.json()
    assert len(growth_payload["days"]) == 7
    assert all(day["views"] >= 0 for day in growth_payload["days"])


def test_analytics_platform_filter_covers_all_supported_platforms(test_engine, client, creator_token):
    platforms = ["YouTube", "Instagram", "Facebook", "X", "LinkedIn"]
    with Session(test_engine) as db:
        profile = _creator_profile(db)
        for platform in platforms:
            account = db.query(SocialAccount).filter_by(
                creator_profile_id=profile.id,
                platform=platform,
            ).first()
            if account is None:
                account = SocialAccount(
                    creator_profile_id=profile.id,
                    platform=platform,
                    handle=f"@filter-{platform.lower()}",
                    followers_count=10,
                    is_connected=False,
                )
                db.add(account)
                db.flush()
                post = ContentPost(
                    social_account_id=account.id,
                    title=f"{platform} filter test",
                    content_type="Post",
                )
                db.add(post)
                db.flush()
                db.add(ContentMetric(
                    content_post_id=post.id,
                    recorded_on=date.today(),
                    views=1,
                    metrics_available=["views"],
                ))
        db.commit()

    headers = {"Authorization": f"Bearer {creator_token}"}
    for platform in platforms:
        content = client.get(
            f"/api/analytics/content?days=30&platform={platform}&mode=demo",
            headers=headers,
        )
        audience = client.get(
            f"/api/analytics/audience?platform={platform}&mode=demo",
            headers=headers,
        )
        growth = client.get(
            f"/api/analytics/growth?days=7&platform={platform}&mode=demo",
            headers=headers,
        )
        assert content.status_code == 200, content.text
        assert all(post["platform"] == platform for post in content.json()["posts"])
        assert audience.status_code == 200, audience.text
        assert all(account["platform"] == platform for account in audience.json()["accounts"])
        assert growth.status_code == 200, growth.text
        assert len(growth.json()["days"]) == 7


def test_growth_history_marks_unobserved_days_unavailable(test_engine, client, creator_token):
    recorded_on = date.today() - timedelta(days=2)
    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform="LinkedIn",
            handle="@metric-availability-test",
            followers_count=25,
            is_connected=True,
        )
        db.add(account)
        db.flush()
        post = ContentPost(
            social_account_id=account.id,
            external_post_id="metric-availability-test-post",
            title="Observed metrics only",
            content_type="Post",
        )
        db.add(post)
        db.flush()
        db.add(ContentMetric(
            content_post_id=post.id,
            recorded_on=recorded_on,
            views=100,
            likes=10,
            comments=5,
            metrics_available=["views", "likes", "comments"],
        ))
        db.commit()

    headers = {"Authorization": f"Bearer {creator_token}"}
    content = client.get(
        "/api/analytics/content?days=7&platform=LinkedIn",
        headers=headers,
    )
    assert content.status_code == 200, content.text
    tracked_post = next(
        post for post in content.json()["posts"]
        if post["post_url"] is None and post["title"] == "Observed metrics only"
    )
    assert tracked_post["metric_availability"]["views"] is True
    assert tracked_post["metric_availability"]["shares"] is False
    assert tracked_post["metric_availability"]["watch_time_seconds"] is False

    growth = client.get(
        "/api/analytics/growth?days=7&platform=LinkedIn",
        headers=headers,
    )
    assert growth.status_code == 200, growth.text
    daily = growth.json()["days"]
    observed = next(point for point in daily if point["date"] == recorded_on.isoformat())
    assert observed["views"] == 100
    assert observed["engagement_rate"] == 15.0
    assert observed["watch_time_seconds"] is None
    assert any(point["views"] is None for point in daily)
    assert all(point["net_followers"] is None for point in daily)


def test_content_analytics_exposes_required_metric_availability_and_chart_fields(client: TestClient, creator_token: str):
    headers = {"Authorization": f"Bearer {creator_token}"}
    content = client.get(    "/api/analytics/content?days=30&mode=demo", headers=headers)
    assert content.status_code == 200, content.text
    payload = content.json()
    required_metrics = {"views", "likes", "comments", "shares", "saves", "reach", "impressions", "watch_time_seconds"}
    assert required_metrics.issubset(payload["metric_availability"].keys())

    growth = client.get(    "/api/analytics/growth?days=7&mode=demo", headers=headers)
    assert growth.status_code == 200, growth.text
    growth_payload = growth.json()
    assert growth_payload["days"]
    for required_field in ["views", "engagement_rate", "net_followers", "net_subscribers", "watch_time_seconds"]:
        assert required_field in growth_payload["days"][0]


def test_content_analytics_uses_weighted_engagement_rate(client: TestClient, creator_token: str):
    headers = {"Authorization": f"Bearer {creator_token}"}
    response = client.get("/api/analytics/content?days=30&mode=demo", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["posts"]
    total_views = sum(post["views_period"] for post in payload["posts"])
    total_interactions = sum(
        (post["likes_period"] or 0) + (post["comments_period"] or 0) + (post["shares_period"] or 0) + (post["saves_period"] or 0)
        for post in payload["posts"]
    )
    expected = round((total_interactions * 100) / total_views, 2) if total_views else 0.0
    assert payload["totals"]["average_engagement_rate"] == expected


def test_audience_insights_expose_live_metrics_when_available(test_engine, client: TestClient, creator_token: str):
    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = db.query(SocialAccount).filter_by(creator_profile_id=profile.id, platform="YouTube").first()
        if account is None:
            account = SocialAccount(
                creator_profile_id=profile.id,
                platform="YouTube",
                handle="@live-metrics-test",
                followers_count=500,
                is_connected=True,
            )
            db.add(account)
            db.flush()
        account.is_connected = True
        account.last_synced_at = datetime.now(timezone.utc)
        insight = (
            db.query(AudienceInsight)
            .filter_by(social_account_id=account.id, recorded_on=date.today())
            .one_or_none()
        )
        if insight is None:
            insight = AudienceInsight(social_account_id=account.id, recorded_on=date.today())
            db.add(insight)
        insight.age_distribution = {"18-24": 40}
        insight.gender_distribution = {"female": 60}
        insight.geographic_distribution = {"IN": 75}
        insight.device_distribution = {"mobile": 80}
        insight.active_hours = {"18": 42}
        insight.impressions = 3200
        insight.reach = 2800
        insight.metrics_available = [
            "age_distribution", "gender_distribution",
            "geographic_distribution", "device_distribution",
            "active_hours", "reach", "impressions",
        ]
        db.commit()

    response = client.get("/api/analytics/audience", headers={"Authorization": f"Bearer {creator_token}"})
    assert response.status_code == 200, response.text
    payload = response.json()
    target = next(item for item in payload["accounts"] if item["platform"] == "YouTube" and item["available_metrics"]["reach"] is True)
    assert target["available_metrics"]["impressions"] is True
    assert target["available_metrics"]["active_hours"] is True
    assert target["reach"] == 2800
    assert target["impressions"] == 3200


def test_connect_youtube_returns_clear_setup_error_when_credentials_missing(client, creator_token, monkeypatch):
    monkeypatch.setattr(settings, "google_oauth_client_id", "")
    monkeypatch.setattr(settings, "google_oauth_client_secret", "")
    response = client.get(
        "/api/integrations/youtube/connect",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert response.status_code == 503
    assert "GOOGLE_OAUTH_CLIENT_ID" in response.json()["detail"]


def test_youtube_sync_maps_mocked_provider_reports(test_engine, monkeypatch):
    from app import youtube_service

    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform="YouTube",
            handle="@m2-sync-test-channel",
            followers_count=0,
            is_connected=True,
        )
        db.add(account)
        db.flush()
        account._provider_account_id = "UC-sync-test"

        monkeypatch.setattr(youtube_service, "get_channel_by_id", lambda _token, _id: {
            "id": "UC-sync-test",
            "snippet": {"title": "Test Channel", "customUrl": "@m2-sync-test-channel"},
            "statistics": {"subscriberCount": "1250"},
            "contentDetails": {"relatedPlaylists": {"uploads": "uploads-test"}},
        })
        monkeypatch.setattr(youtube_service, "get_recent_videos", lambda *_args, **_kwargs: [{
            "id": "video-m2-test",
            "snippet": {"title": "Testing real analytics", "publishedAt": "2026-10-10T12:00:00Z"},
            "statistics": {"viewCount": "1000", "likeCount": "80", "commentCount": "10"},
        }])

        def fake_analytics(_token, params):
            dimensions = params.get("dimensions")
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            if dimensions == "day,video":
                return {"columnHeaders": [{"name": n} for n in ["day", "video", "views", "likes", "comments", "shares", "estimatedMinutesWatched"]], "rows": [[yesterday, "video-m2-test", 100, 8, 2, 1, 60]]}
            if dimensions == "day":
                return {"columnHeaders": [{"name": n} for n in ["day", "views", "likes", "comments", "shares", "estimatedMinutesWatched", "subscribersGained", "subscribersLost"]], "rows": [[yesterday, 100, 8, 2, 1, 60, 4, 1]]}
            if dimensions == "ageGroup,gender":
                return {"columnHeaders": [{"name": n} for n in ["ageGroup", "gender", "viewerPercentage"]], "rows": [["age18-24", "female", 22.5], ["age18-24", "male", 19.5]]}
            if dimensions == "country":
                return {"columnHeaders": [{"name": n} for n in ["country", "views"]], "rows": [["IN", 75]]}
            if dimensions == "deviceType":
                return {"columnHeaders": [{"name": n} for n in ["deviceType", "views"]], "rows": [["MOBILE", 65]]}
            return {"columnHeaders": [], "rows": []}

        monkeypatch.setattr(youtube_service, "analytics_report", fake_analytics)
        result = sync_youtube_account(db, account, "fake-access-token")
        db.commit()

        post = db.query(ContentPost).filter_by(external_post_id="video-m2-test").one()
        metric = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=date.today() - timedelta(days=1)).one()
        account_metric = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today() - timedelta(days=1)).one()
        assert account.followers_count == 1250
        assert post.title == "Testing real analytics"
        assert metric.views == 100 and metric.likes == 8 and metric.shares == 1
        assert metric.watch_time_seconds == 3600
        assert account_metric.subscribers_gained == 4 and account_metric.subscribers_lost == 1
        assert result["videos_synced"] == 1
        assert result["audience_available"]["age_distribution"] is True
        assert result["audience_available"]["active_hours"] is False


def test_instagram_and_facebook_connectors_are_implemented_but_require_credentials(client, creator_token):
    from app.config import settings

    monkeypatch_values = {
        "meta_oauth_client_id": settings.meta_oauth_client_id,
        "meta_oauth_client_secret": settings.meta_oauth_client_secret,
        "facebook_oauth_config_id": settings.facebook_oauth_config_id,
        "instagram_client_id": settings.instagram_client_id,
        "instagram_client_secret": settings.instagram_client_secret,
        "instagram_config_id": settings.instagram_config_id,
        "linkedin_client_id": settings.linkedin_client_id,
        "linkedin_client_secret": settings.linkedin_client_secret,
        "x_client_id": settings.x_client_id,
        "x_client_secret": settings.x_client_secret,
    }
    try:
        settings.meta_oauth_client_id = ""
        settings.meta_oauth_client_secret = ""
        settings.facebook_oauth_config_id = ""
        settings.instagram_client_id = ""
        settings.instagram_client_secret = ""
        settings.instagram_config_id = ""
        settings.linkedin_client_id = ""
        settings.linkedin_client_secret = ""
        # Clear X credentials too so this assertion is independent of the
        # developer's local backend/.env configuration.
        settings.x_client_id = ""
        settings.x_client_secret = ""
        headers = {"Authorization": f"Bearer {creator_token}"}
        assert client.get("/api/integrations/instagram/connect", headers=headers).status_code == 503
        assert client.get("/api/integrations/facebook/connect", headers=headers).status_code == 503
        providers = client.get("/api/integrations/providers", headers=headers).json()["providers"]
        by_id = {item["id"]: item for item in providers}
        assert "tiktok" not in by_id
        assert by_id["instagram"]["implementation"] == "available"
        assert by_id["facebook"]["implementation"] == "available"
        assert by_id["x"]["implementation"] == "available"
        assert by_id["linkedin"]["implementation"] == "available"
        assert not by_id["instagram"]["configured"]
        assert not by_id["facebook"]["configured"]
        assert not by_id["x"]["configured"]
        assert not by_id["linkedin"]["configured"]
    finally:
        settings.meta_oauth_client_id = monkeypatch_values["meta_oauth_client_id"]
        settings.meta_oauth_client_secret = monkeypatch_values["meta_oauth_client_secret"]
        settings.facebook_oauth_config_id = monkeypatch_values["facebook_oauth_config_id"]
        settings.instagram_client_id = monkeypatch_values["instagram_client_id"]
        settings.instagram_client_secret = monkeypatch_values["instagram_client_secret"]
        settings.instagram_config_id = monkeypatch_values["instagram_config_id"]
        settings.linkedin_client_id = monkeypatch_values["linkedin_client_id"]
        settings.linkedin_client_secret = monkeypatch_values["linkedin_client_secret"]
        settings.x_client_id = monkeypatch_values["x_client_id"]
        settings.x_client_secret = monkeypatch_values["x_client_secret"]


def test_removed_tiktok_provider_is_not_exposed_or_included_in_workspace_data(test_engine, client, creator_token):
    headers = {"Authorization": f"Bearer {creator_token}"}
    with Session(test_engine) as db:
        profile = _creator_profile(db)
        db.add(SocialAccount(
            creator_profile_id=profile.id,
            platform="TikTok",
            handle="@legacy-account",
            followers_count=125,
            is_connected=False,
        ))
        db.flush()
        account = db.query(SocialAccount).filter_by(
            creator_profile_id=profile.id,
            platform="TikTok",
        ).one()
        post = ContentPost(
            social_account_id=account.id,
            title="Legacy provider content",
            content_type="Video",
        )
        db.add(post)
        db.flush()
        db.add(ContentMetric(
            content_post_id=post.id,
            recorded_on=date.today(),
            views=987654,
            metrics_available=["views"],
        ))
        db.commit()

    providers = client.get("/api/integrations/providers", headers=headers)
    accounts = client.get("/api/integrations/accounts", headers=headers)
    content = client.get("/api/analytics/content?mode=demo", headers=headers)
    audience = client.get("/api/analytics/audience?mode=demo", headers=headers)
    dashboard = client.get("/api/dashboard/platforms", headers=headers)
    top_content = client.get("/api/dashboard/top-content", headers=headers)

    assert providers.status_code == 200
    assert "tiktok" not in {provider["id"] for provider in providers.json()["providers"]}
    assert all(account["platform"] != "TikTok" for account in accounts.json()["accounts"])
    assert all(post["platform"] != "TikTok" for post in content.json()["posts"])
    assert all(account["platform"] != "TikTok" for account in audience.json()["accounts"])
    assert all(platform["platform"] != "TikTok" for platform in dashboard.json()["platforms"])
    assert all(post["platform"] != "TikTok" for post in top_content.json()["posts"])
    assert client.get("/api/integrations/tiktok/connect", headers=headers).status_code == 404
    assert client.get("/api/integrations/tiktok/callback", headers=headers).status_code == 404
    assert client.post("/api/integrations/tiktok/sync/1", headers=headers).status_code == 404


def test_instagram_sync_maps_mocked_media_and_follower_deltas(test_engine, monkeypatch):
    from app import instagram_service

    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform="Instagram",
            handle="@m2-instagram-sync",
            followers_count=100,
            is_connected=True,
            last_synced_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(account)
        db.flush()
        monkeypatch.setattr(instagram_service, "get_profile", lambda _token: {
            "user_id": "ig-user-m2-test", "username": "m2_instagram_sync", "followers_count": 125,
        })

        def fake_graph_get(path, _token, params=None):
            if path == "me/media":
                return {"data": [{
                    "id": "ig-media-m2-test", "caption": "Milestone two reel",
                    "media_type": "VIDEO", "media_product_type": "REELS",
                    "permalink": "https://www.instagram.com/reel/test", "timestamp": "2026-10-27T12:00:00+0000",
                    "like_count": 80, "comments_count": 10,
                }]}
            if path == "ig-media-m2-test/insights":
                return {"data": [
                    {"name": "reach", "total_value": {"value": 900}},
                    {"name": "saved", "total_value": {"value": 12}},
                    {"name": "shares", "total_value": {"value": 9}},
                    {"name": "views", "total_value": {"value": 1500}},
                ]}
            raise AssertionError(f"Unexpected Instagram API path: {path}")

        monkeypatch.setattr(instagram_service, "graph_get", fake_graph_get)
        result = instagram_service.sync_instagram_account(db, account, "mock-access-token")
        db.commit()
        post = db.query(ContentPost).filter_by(external_post_id="ig-media-m2-test").one()
        snapshot = db.query(__import__("app.models", fromlist=["ContentSnapshot"]).ContentSnapshot).filter_by(content_post_id=post.id).one()
        metric = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=date.today()).one()
        today_account_metric = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one()
        assert result["posts_synced"] == 1
        assert account.followers_count == 125
        assert metric.views == 0  # first sync is only a cumulative baseline, not fake daily activity
        assert snapshot.latest_views == 1500
        assert snapshot.latest_saves == 12
        assert {"views", "shares", "saves", "reach"}.issubset(set(snapshot.metrics_available))
        assert today_account_metric.followers_gained == 25
        assert "audience_active_hours" in result["unavailable_content_metrics"]


def test_facebook_sync_maps_mocked_page_posts_and_follower_deltas(test_engine, monkeypatch):
    from app import facebook_service
    from app.models import ContentSnapshot

    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform="Facebook",
            handle="CreatorIQ Test Page",
            followers_count=100,
            is_connected=True,
            last_synced_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(account)
        db.flush()
        account._provider_account_id = "fb-page-m2-test"

        def fake_graph_get(path, _token, params=None):
            if path == "fb-page-m2-test":
                return {
                    "id": "fb-page-m2-test", "name": "CreatorIQ Test Page",
                    "fan_count": 125, "link": "https://facebook.com/creatoriq-test",
                }
            if path == "fb-page-m2-test/posts":
                return {"data": [{
                    "id": "fb-post-m2-test", "message": "Milestone two test post",
                    "permalink_url": "https://facebook.com/post/test",
                    "created_time": "2026-10-27T12:00:00+0000",
                    "likes": {"summary": {"total_count": 30}},
                    "comments": {"summary": {"total_count": 6}},
                    "shares": {"count": 4},
                }]}
            if path == "fb-post-m2-test/insights":
                return {"data": [
                    {"name": "post_impressions", "values": [{"value": 1200}]},
                    {"name": "post_impressions_unique", "values": [{"value": 900}]},
                    {"name": "post_engaged_users", "values": [{"value": 180}]},
                ]}
            raise AssertionError(f"Unexpected Facebook API path: {path}")

        monkeypatch.setattr(facebook_service, "graph_get", fake_graph_get)
        result = facebook_service.sync_facebook_page(db, account, "mock-page-access-token")
        db.commit()

        post = db.query(ContentPost).filter_by(external_post_id="fb-post-m2-test").one()
        snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one()
        metric = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=date.today()).one()
        account_metric = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one()
        assert result["posts_synced"] == 1
        assert account.followers_count == 125
        assert post.title == "Milestone two test post"
        assert snapshot.latest_views == 1200
        assert snapshot.latest_reach == 900
        assert snapshot.latest_likes == 30
        assert metric.views == 0  # first sync records a cumulative baseline
        assert account_metric.followers_gained == 25
        assert {"views", "impressions", "reach", "likes", "comments", "shares"}.issubset(set(snapshot.metrics_available))



def test_x_sync_maps_mocked_tweets_and_follower_deltas(test_engine, monkeypatch):
    from app import x_service
    from app.models import ContentSnapshot

    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id, platform="X", handle="@m2_x_sync",
            followers_count=100, is_connected=True,
            last_synced_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(account)
        db.flush()
        monkeypatch.setattr(x_service, "get_profile", lambda _token: {
            "id": "x-member-m2-test", "username": "m2_x_sync", "url": "https://x.com/m2_x_sync",
            "public_metrics": {"followers_count": 125},
        })
        monkeypatch.setattr(x_service, "list_recent_posts", lambda *_args: [{
            "id": "x-post-m2-test", "text": "Milestone two X post",
            "created_at": "2026-10-27T12:00:00Z",
            "public_metrics": {"like_count": 20, "reply_count": 3, "retweet_count": 4, "quote_count": 1, "bookmark_count": 2},
            "non_public_metrics": {"impression_count": 500},
        }])
        result = x_service.sync_x_account(db, account, "mock-x-token", "x-member-m2-test")
        db.commit()
        post = db.query(ContentPost).filter_by(external_post_id="x-post-m2-test").one()
        snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one()
        metric = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=date.today()).one()
        account_metric = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one()
        assert result["posts_synced"] == 1
        assert post.title == "Milestone two X post"
        assert snapshot.latest_views == 500
        assert snapshot.latest_shares == 5
        assert snapshot.latest_saves == 2
        assert metric.views == 0  # first sync stores cumulative baseline only
        assert account.followers_count == 125
        assert account_metric.followers_gained == 25


def test_linkedin_sync_maps_mocked_post_analytics_and_follower_deltas(test_engine, monkeypatch):
    from app import linkedin_service
    from app.models import ContentSnapshot

    with Session(test_engine) as db:
        profile = _creator_profile(db)
        account = SocialAccount(
            creator_profile_id=profile.id, platform="LinkedIn", handle="M2 LinkedIn Test",
            followers_count=100, is_connected=True,
            last_synced_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(account)
        db.flush()
        monkeypatch.setattr(linkedin_service, "get_profile", lambda _token: {
            "sub": "li-member-m2-test", "name": "M2 LinkedIn Test", "picture": "https://example.com/p.png",
        })
        monkeypatch.setattr(linkedin_service, "get_follower_count", lambda _token: 125)
        monkeypatch.setattr(linkedin_service, "list_recent_posts", lambda *_args: [{
            "id": "urn:li:share:li-post-m2-test", "commentary": "Milestone two LinkedIn post",
            "createdAt": 1793102400000,
        }])
        metrics = {"IMPRESSION": 200, "MEMBERS_REACHED": 150, "REACTION": 20, "COMMENT": 3, "RESHARE": 4}
        monkeypatch.setattr(linkedin_service, "get_post_metric", lambda _token, _urn, name: metrics[name])
        result = linkedin_service.sync_linkedin_account(db, account, "mock-linkedin-token", "li-member-m2-test")
        db.commit()
        post = db.query(ContentPost).filter_by(external_post_id="urn:li:share:li-post-m2-test").one()
        snapshot = db.query(ContentSnapshot).filter_by(content_post_id=post.id).one()
        metric = db.query(ContentMetric).filter_by(content_post_id=post.id, recorded_on=date.today()).one()
        account_metric = db.query(AccountMetric).filter_by(social_account_id=account.id, recorded_on=date.today()).one()
        assert result["posts_synced"] == 1
        assert snapshot.latest_views == 200
        assert snapshot.latest_reach == 150
        assert snapshot.latest_likes == 20
        assert snapshot.latest_comments == 3
        assert snapshot.latest_shares == 4
        assert metric.views == 0  # first sync stores cumulative baseline only
        assert account.followers_count == 125
        assert account_metric.followers_gained == 25


def test_connect_x_and_linkedin_return_setup_error_when_credentials_missing(client, creator_token, monkeypatch):
    monkeypatch.setattr(settings, "x_client_id", "")
    monkeypatch.setattr(settings, "x_client_secret", "")
    monkeypatch.setattr(settings, "linkedin_client_id", "")
    monkeypatch.setattr(settings, "linkedin_client_secret", "")
    headers = {"Authorization": f"Bearer {creator_token}"}
    x = client.get("/api/integrations/x/connect", headers=headers)
    linkedin = client.get("/api/integrations/linkedin/connect", headers=headers)
    assert x.status_code == 503 and "X_CLIENT_ID" in x.json()["detail"]
    assert linkedin.status_code == 503 and "LINKEDIN_CLIENT_ID" in linkedin.json()["detail"]
