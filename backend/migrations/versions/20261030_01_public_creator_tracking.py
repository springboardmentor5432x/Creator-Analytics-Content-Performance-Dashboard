"""Add user-owned public YouTube creator tracking and timestamped snapshots."""

from alembic import op
import sqlalchemy as sa

revision = "20261030_01"
down_revision = None
branch_labels = None
depends_on = None


def _create_table_if_missing(name: str, *columns, **kwargs) -> None:
    if name not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(name, *columns, **kwargs)


def _create_index_if_missing(name: str, table: str, columns: list[str]) -> None:
    indexes = {
        index["name"]
        for index in sa.inspect(op.get_bind()).get_indexes(table)
    }
    if name not in indexes:
        op.create_index(name, table, columns)


def upgrade() -> None:
    _create_table_if_missing(
        "tracked_creators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel_id", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=250), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=1000), nullable=True),
        sa.Column("channel_url", sa.String(length=500), nullable=False),
        sa.Column("custom_url", sa.String(length=255), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("subscriber_count", sa.Integer(), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=True),
        sa.Column("video_count", sa.Integer(), nullable=True),
        sa.Column("hidden_subscriber_count", sa.Boolean(), nullable=False),
        sa.Column("uploads_playlist_id", sa.String(length=120), nullable=True),
        sa.Column("videos_next_page_token", sa.String(length=500), nullable=True),
        sa.Column("more_videos_available", sa.Boolean(), nullable=False),
        sa.Column("tracked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_error", sa.Text(), nullable=True),
        sa.UniqueConstraint("user_id", "channel_id", name="uq_tracked_creator_user_channel"),
    )
    _create_table_if_missing(
        "tracked_creator_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tracked_creator_id", sa.Integer(), sa.ForeignKey("tracked_creators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("subscriber_count", sa.Integer(), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=True),
        sa.Column("video_count", sa.Integer(), nullable=True),
        sa.Column("available_metrics", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.UniqueConstraint("tracked_creator_id", "observed_at", name="uq_tracked_creator_snapshot_time"),
    )
    _create_table_if_missing(
        "tracked_creator_videos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tracked_creator_id", sa.Integer(), sa.ForeignKey("tracked_creators.id", ondelete="CASCADE"), nullable=False),
        sa.Column("video_id", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=1000), nullable=True),
        sa.Column("video_url", sa.String(length=500), nullable=False),
        sa.Column("channel_id", sa.String(length=80), nullable=True),
        sa.Column("channel_title", sa.String(length=250), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration", sa.String(length=40), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tracked_creator_id", "video_id", name="uq_tracked_creator_video"),
    )
    _create_table_if_missing(
        "tracked_creator_video_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tracked_creator_video_id", sa.Integer(), sa.ForeignKey("tracked_creator_videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=True),
        sa.Column("comment_count", sa.Integer(), nullable=True),
        sa.Column("available_metrics", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.UniqueConstraint("tracked_creator_video_id", "observed_at", name="uq_tracked_video_snapshot_time"),
    )

    for name, table, columns in (
        ("ix_tracked_creators_id", "tracked_creators", ["id"]),
        ("ix_tracked_creators_user_id", "tracked_creators", ["user_id"]),
        ("ix_tracked_creators_channel_id", "tracked_creators", ["channel_id"]),
        ("ix_tracked_creator_snapshots_id", "tracked_creator_snapshots", ["id"]),
        ("ix_tracked_creator_snapshots_tracked_creator_id", "tracked_creator_snapshots", ["tracked_creator_id"]),
        ("ix_tracked_creator_snapshots_observed_at", "tracked_creator_snapshots", ["observed_at"]),
        ("ix_tracked_creator_videos_id", "tracked_creator_videos", ["id"]),
        ("ix_tracked_creator_videos_tracked_creator_id", "tracked_creator_videos", ["tracked_creator_id"]),
        ("ix_tracked_creator_videos_video_id", "tracked_creator_videos", ["video_id"]),
        ("ix_tracked_creator_video_snapshots_id", "tracked_creator_video_snapshots", ["id"]),
        ("ix_tracked_creator_video_snapshots_tracked_creator_video_id", "tracked_creator_video_snapshots", ["tracked_creator_video_id"]),
        ("ix_tracked_creator_video_snapshots_observed_at", "tracked_creator_video_snapshots", ["observed_at"]),
    ):
        _create_index_if_missing(name, table, columns)


def downgrade() -> None:
    for name, table in (
        ("ix_tracked_creator_video_snapshots_observed_at", "tracked_creator_video_snapshots"),
        ("ix_tracked_creator_video_snapshots_tracked_creator_video_id", "tracked_creator_video_snapshots"),
        ("ix_tracked_creator_video_snapshots_id", "tracked_creator_video_snapshots"),
        ("ix_tracked_creator_videos_video_id", "tracked_creator_videos"),
        ("ix_tracked_creator_videos_tracked_creator_id", "tracked_creator_videos"),
        ("ix_tracked_creator_videos_id", "tracked_creator_videos"),
        ("ix_tracked_creator_snapshots_observed_at", "tracked_creator_snapshots"),
        ("ix_tracked_creator_snapshots_tracked_creator_id", "tracked_creator_snapshots"),
        ("ix_tracked_creator_snapshots_id", "tracked_creator_snapshots"),
        ("ix_tracked_creators_channel_id", "tracked_creators"),
        ("ix_tracked_creators_user_id", "tracked_creators"),
        ("ix_tracked_creators_id", "tracked_creators"),
    ):
        if table in sa.inspect(op.get_bind()).get_table_names():
            op.drop_index(name, table_name=table)
    for table in (
        "tracked_creator_video_snapshots",
        "tracked_creator_videos",
        "tracked_creator_snapshots",
        "tracked_creators",
    ):
        if table in sa.inspect(op.get_bind()).get_table_names():
            op.drop_table(table)
