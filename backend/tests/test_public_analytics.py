from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import (
    TrackedCreator,
    TrackedCreatorSnapshot,
    TrackedCreatorVideo,
    TrackedCreatorVideoSnapshot,
    User,
)


def _seed_public_creator(test_engine):
    now = datetime.now(timezone.utc).replace(microsecond=0)

    with Session(test_engine) as db:
        user = db.query(User).filter_by(email="demo@creatoriq.dev").one()

        for prior in db.query(TrackedCreator).filter_by(
            user_id=user.id,
            title="Public YouTube Test Channel",
        ).all():
            db.delete(prior)

        db.flush()

        channel_id = "UC" + uuid4().hex[:22]
        creator = TrackedCreator(
            user_id=user.id,
            channel_id=channel_id,
            title="Public YouTube Test Channel",
            description="Public creator test #CreatorIQ",
            channel_url=f"https://www.youtube.com/channel/{channel_id}",
            custom_url="@publictest",
            subscriber_count=1500,
            view_count=250000,
            video_count=2,
            hidden_subscriber_count=False,
            uploads_playlist_id="UU-public-test",
            videos_next_page_token=None,
            more_videos_available=False,
            tracked_at=now - timedelta(days=3),
            last_synced_at=now,
        )
        db.add(creator)
        db.flush()

        db.add_all([
            TrackedCreatorSnapshot(
                tracked_creator_id=creator.id,
                observed_at=now - timedelta(days=2),
                subscriber_count=1400,
                view_count=230000,
                video_count=2,
                available_metrics=[
                    "subscriber_count",
                    "view_count",
                    "video_count",
                ],
            ),
            TrackedCreatorSnapshot(
                tracked_creator_id=creator.id,
                observed_at=now,
                subscriber_count=1500,
                view_count=250000,
                video_count=2,
                available_metrics=[
                    "subscriber_count",
                    "view_count",
                    "video_count",
                ],
            ),
        ])

        video_id = "public-video-test-" + uuid4().hex[:12]
        video = TrackedCreatorVideo(
            tracked_creator_id=creator.id,
            video_id=video_id,
            title="Sports Day #CreatorIQ #SportsDay #விளையாட்டு",
            description="Behind the scenes #SportsDay and #TamilCreator",
            video_url=f"https://www.youtube.com/watch?v={video_id}",
            channel_id=creator.channel_id,
            channel_title=creator.title,
            last_seen_at=now,
        )
        db.add(video)
        db.flush()

        db.add_all([
            TrackedCreatorVideoSnapshot(
                tracked_creator_video_id=video.id,
                observed_at=now - timedelta(days=1),
                view_count=9000,
                like_count=700,
                comment_count=180,
                available_metrics=["views", "likes", "comments"],
            ),
            TrackedCreatorVideoSnapshot(
                tracked_creator_video_id=video.id,
                observed_at=now,
                view_count=10000,
                like_count=800,
                comment_count=200,
                available_metrics=["views", "likes", "comments"],
            ),
        ])

        db.commit()
        return creator.id, video_id


def test_public_youtube_is_included_in_content_analytics_and_hashtag_results(
    test_engine,
    client,
    creator_token,
):
    _creator_id, video_id = _seed_public_creator(test_engine)
    headers = {"Authorization": f"Bearer {creator_token}"}

    content = client.get(
        "/api/analytics/content?days=30&mode=live",
        headers=headers,
    )

    assert content.status_code == 200, content.text
    public = content.json()["public_youtube"]
    assert public["creator_count"] >= 1
    assert public["video_count"] >= 1
    assert public["totals"]["views"] >= 10000
    assert public["totals"]["likes"] >= 800
    assert public["totals"]["comments"] >= 200

    target_video = next(
        item for item in public["top_videos"]
        if item["video_id"] == video_id
    )
    assert target_video["engagement_rate"] == 10.0
    assert target_video["metric_availability"]["shares"] is False

    hashtags = client.get(
        "/api/analytics/hashtags?mode=live",
        headers=headers,
    )

    assert hashtags.status_code == 200, hashtags.text
    tag_counts = {
        item["tag"]: item["content_count"]
        for item in hashtags.json()["hashtags"]
    }
    assert tag_counts["creatoriq"] == 1
    assert tag_counts["sportsday"] == 1
    assert tag_counts["tamilcreator"] == 1
    assert tag_counts["விளையாட்டு"] == 1


def test_public_youtube_audience_marks_private_demographics_unavailable(
    test_engine,
    client,
    creator_token,
):
    creator_id, _video_id = _seed_public_creator(test_engine)
    headers = {"Authorization": f"Bearer {creator_token}"}

    response = client.get(
        "/api/analytics/audience?mode=live&platform=YouTube",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    public = response.json()["public_youtube"]
    creator = next(
        item for item in public["creators"]
        if item["id"] == creator_id
    )
    available = creator["available_metrics"]
    assert available["age_distribution"] is False
    assert available["gender_distribution"] is False
    assert available["device_distribution"] is False
    assert "owner-authorized" in public["note"]


def test_public_youtube_growth_returns_timestamped_snapshots_without_daily_data(
    test_engine,
    client,
    creator_token,
):
    creator_id, _video_id = _seed_public_creator(test_engine)
    headers = {"Authorization": f"Bearer {creator_token}"}

    response = client.get(
        "/api/analytics/growth?days=7&mode=live&platform=YouTube",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    public = response.json()["public_youtube"]
    creator = next(
        item for item in public["creators"]
        if item["id"] == creator_id
    )
    assert creator["observation_count"] == 2
    assert creator["has_comparable_growth"] is True
    assert creator["points"][-1]["changes_since_previous_sync"]["views"] == 20000
    assert (
        creator["points"][-1]["changes_since_previous_sync"]["subscribers"]
        == 100
    )
    top_video = creator["top_video_trends"][0]
    assert top_video["observation_count"] == 2
    assert (
        top_video["points"][-1]["changes_since_previous_sync"]["views"]
        == 1000
    )
    assert "no activity is assigned" in public["observation_note"]


def test_public_youtube_is_excluded_from_demo_mode(
    test_engine,
    client,
    creator_token,
):
    _seed_public_creator(test_engine)
    headers = {"Authorization": f"Bearer {creator_token}"}

    response = client.get(
        "/api/analytics/content?mode=demo",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["public_youtube"]["creator_count"] == 0
