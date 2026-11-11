from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('creator', 'agency', 'marketing_team', 'administrator')", name="ck_users_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="creator", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    # Optional profile fields shared by every role. They are never used for
    # authentication and are safe to return through the account API.
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    timezone: Mapped[str] = mapped_column(String(60), default="UTC", nullable=False)
    date_format: Mapped[str] = mapped_column(String(20), default="DD/MM/YYYY", nullable=False)
    notification_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Incremented to invalidate every previously issued JWT for this account.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    profile: Mapped[CreatorProfile | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    agency_profile: Mapped[AgencyProfile | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    marketing_profile: Mapped[MarketingTeamProfile | None] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    niche: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    social_links: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    user: Mapped[User] = relationship(back_populates="profile")
    social_accounts: Mapped[list[SocialAccount]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    revenue_records: Mapped[list[RevenueRecord]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    notifications: Mapped[list[Notification]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    reports: Mapped[list[Report]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    report_schedules: Mapped[list[ReportSchedule]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    workspace_access: Mapped[list[WorkspaceAccess]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")


class AgencyProfile(Base):
    """Agency-specific workspace data; kept separate from creator analytics data."""
    __tablename__ = "agency_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    agency_name: Mapped[str] = mapped_column(String(120), nullable=False)
    service_focus: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    business_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    website: Mapped[str | None] = mapped_column(String(300), nullable=True)
    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    user: Mapped[User] = relationship(back_populates="agency_profile")


class MarketingTeamProfile(Base):
    """Marketing-team workspace data; it is not a CreatorProfile."""
    __tablename__ = "marketing_team_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    team_name: Mapped[str] = mapped_column(String(120), nullable=False)
    focus_area: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    user: Mapped[User] = relationship(back_populates="marketing_profile")


class SocialAccount(Base):
    __tablename__ = "social_accounts"
    __table_args__ = (
        UniqueConstraint("platform", "handle", name="uq_platform_handle"),
        CheckConstraint("followers_count >= 0", name="ck_social_accounts_followers_nonnegative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(30), nullable=False)
    handle: Mapped[str] = mapped_column(String(120), nullable=False)
    followers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    profile_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="social_accounts")
    posts: Mapped[list[ContentPost]] = relationship(back_populates="social_account", cascade="all, delete-orphan")
    audience_insights: Mapped[list[AudienceInsight]] = relationship(back_populates="social_account", cascade="all, delete-orphan")


class ContentPost(Base):
    __tablename__ = "content_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    social_account_id: Mapped[int] = mapped_column(ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    external_post_id: Mapped[str | None] = mapped_column(String(160), unique=True, nullable=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    content_type: Mapped[str] = mapped_column(String(40), default="Video", nullable=False)
    post_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    social_account: Mapped[SocialAccount] = relationship(back_populates="posts")
    metrics: Mapped[list[ContentMetric]] = relationship(back_populates="content_post", cascade="all, delete-orphan")


class ContentMetric(Base):
    __tablename__ = "content_metrics"
    __table_args__ = (UniqueConstraint("content_post_id", "recorded_on", name="uq_post_metric_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content_post_id: Mapped[int] = mapped_column(ForeignKey("content_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_on: Mapped[date] = mapped_column(Date, default=date.today, nullable=False, index=True)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shares: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    saves: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    watch_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reach: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    metrics_available: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    content_post: Mapped[ContentPost] = relationship(back_populates="metrics")


class AudienceInsight(Base):
    __tablename__ = "audience_insights"
    __table_args__ = (UniqueConstraint("social_account_id", "recorded_on", name="uq_account_audience_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    social_account_id: Mapped[int] = mapped_column(ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_on: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    age_distribution: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    gender_distribution: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    geographic_distribution: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    device_distribution: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    active_hours: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reach: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics_available: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    social_account: Mapped[SocialAccount] = relationship(back_populates="audience_insights")


class RevenueRecord(Base):
    __tablename__ = "revenue_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    brand: Mapped[str | None] = mapped_column(String(160), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="paid", nullable=False)
    # "manual" means the creator entered the amount. "platform_reported"
    # marks figures imported from a provider and must never be blended with
    # unverified manual entries without a visible distinction in the UI.
    source_type: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    description: Mapped[str | None] = mapped_column(String(250), nullable=True)
    recorded_on: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="revenue_records")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Non-creator roles (agency, administrator) receive account-scoped
    # notifications through this link instead of a CreatorProfile.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(40), default="performance", nullable=False)
    link: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile | None] = relationship(back_populates="notifications")
    user: Mapped[User | None] = relationship()


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int | None] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    agency_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    platform: Mapped[str | None] = mapped_column(String(40), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[str] = mapped_column(String(10), default="PDF", nullable=False)
    # Preserve the selected reporting window so a later download reproduces
    # the report the user requested instead of silently falling back to 30 days.
    days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    # Rows are captured when the report is generated. This keeps downloaded
    # exports reproducible even after the underlying analytics change.
    rows: Mapped[list[dict[str, object]] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile | None] = relationship(back_populates="reports")


class ReportSchedule(Base):
    """A creator-owned recurring report schedule processed by the app scheduler."""

    __tablename__ = "report_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(
        ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    report_type: Mapped[str] = mapped_column(String(50), default="performance", nullable=False)
    format: Mapped[str] = mapped_column(String(10), default="PDF", nullable=False)
    days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    cadence: Mapped[str] = mapped_column(String(12), default="weekly", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="report_schedules")


class WorkspaceAccess(Base):
    """A creator's explicit decision to share workspace summaries with a collaborator."""

    __tablename__ = "workspace_access"
    __table_args__ = (
        UniqueConstraint(
            "creator_profile_id", "collaborator_user_id",
            name="uq_workspace_access_creator_collaborator",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(
        ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    collaborator_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    collaborator_role: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    request_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_permissions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    granted_permissions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="workspace_access")


class OAuthCredential(Base):
    """Encrypted provider tokens for one connected social account."""

    __tablename__ = "oauth_credentials"
    __table_args__ = (
        UniqueConstraint("social_account_id", name="uq_oauth_credential_social_account"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    social_account_id: Mapped[int] = mapped_column(
        ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    encrypted_access_token: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(String(40), default="Bearer", nullable=False)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class OAuthState(Base):
    """One-time OAuth state; the state hash and PKCE code_verifier are stored."""

    __tablename__ = "oauth_states"

    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    code_verifier: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AccountMetric(Base):
    """Daily channel metrics fetched from a provider analytics API."""

    __tablename__ = "account_metrics"
    __table_args__ = (
        UniqueConstraint("social_account_id", "recorded_on", name="uq_account_metric_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    social_account_id: Mapped[int] = mapped_column(
        ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recorded_on: Mapped[date] = mapped_column(Date, default=date.today, nullable=False, index=True)
    followers_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    followers_gained: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    followers_lost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shares: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    watch_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subscribers_gained: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subscribers_lost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics_available: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="provider_api", nullable=False)


class ContentSnapshot(Base):
    """Latest cumulative provider counters, distinct from daily metric deltas."""

    __tablename__ = "content_snapshots"
    __table_args__ = (
        UniqueConstraint("content_post_id", name="uq_content_snapshot_post"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content_post_id: Mapped[int] = mapped_column(
        ForeignKey("content_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latest_views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_comments: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_shares: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_saves: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_reach: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics_available: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="youtube_data_api", nullable=False)


class TrackedCreator(Base):
    """A public YouTube channel tracked independently from an owner-authorized account."""

    __tablename__ = "tracked_creators"
    __table_args__ = (
        UniqueConstraint("user_id", "channel_id", name="uq_tracked_creator_user_channel"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    channel_url: Mapped[str] = mapped_column(String(500), nullable=False)
    custom_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subscriber_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    video_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hidden_subscriber_count: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    uploads_playlist_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    videos_next_page_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    more_videos_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tracked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshots: Mapped[list[TrackedCreatorSnapshot]] = relationship(
        back_populates="creator", cascade="all, delete-orphan"
    )
    videos: Mapped[list[TrackedCreatorVideo]] = relationship(
        back_populates="creator", cascade="all, delete-orphan"
    )


class TrackedCreatorSnapshot(Base):
    """Timestamped cumulative public channel counters; no daily activity is inferred."""

    __tablename__ = "tracked_creator_snapshots"
    __table_args__ = (
        UniqueConstraint("tracked_creator_id", "observed_at", name="uq_tracked_creator_snapshot_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tracked_creator_id: Mapped[int] = mapped_column(
        ForeignKey("tracked_creators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    subscriber_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    video_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    available_metrics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="youtube_data_api_public", nullable=False)
    creator: Mapped[TrackedCreator] = relationship(back_populates="snapshots")


class TrackedCreatorVideo(Base):
    """A public video discovered from a tracked channel's uploads playlist."""

    __tablename__ = "tracked_creator_videos"
    __table_args__ = (
        UniqueConstraint("tracked_creator_id", "video_id", name="uq_tracked_creator_video"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tracked_creator_id: Mapped[int] = mapped_column(
        ForeignKey("tracked_creators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    video_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    video_url: Mapped[str] = mapped_column(String(500), nullable=False)
    channel_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    channel_title: Mapped[str | None] = mapped_column(String(250), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator: Mapped[TrackedCreator] = relationship(back_populates="videos")
    snapshots: Mapped[list[TrackedCreatorVideoSnapshot]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )


class TrackedCreatorVideoSnapshot(Base):
    """Timestamped raw counters for a public video."""

    __tablename__ = "tracked_creator_video_snapshots"
    __table_args__ = (
        UniqueConstraint("tracked_creator_video_id", "observed_at", name="uq_tracked_video_snapshot_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tracked_creator_video_id: Mapped[int] = mapped_column(
        ForeignKey("tracked_creator_videos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    available_metrics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="youtube_data_api_public", nullable=False)
    video: Mapped[TrackedCreatorVideo] = relationship(back_populates="snapshots")


class AuditLog(Base):
    """Immutable record of security-relevant actions.

    No relationship is declared on purpose: audit records must survive the
    deletion of the account that performed the action. The actor email is
    stored as a snapshot for the same reason.
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(30), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    target_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )


class AgencyTeamMember(Base):
    """A person who may operate inside one agency workspace."""

    __tablename__ = "agency_team_members"
    __table_args__ = (
        UniqueConstraint("agency_user_id", "email", name="uq_agency_team_email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(40), default="viewer", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="invited", nullable=False)
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Campaign(Base):
    """An agency-owned campaign. Performance figures are never stored here."""

    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agency_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(160), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    platforms: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    assignments: Mapped[list[CampaignCreator]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignCreator(Base):
    """Assignment of one consenting creator workspace to a campaign."""

    __tablename__ = "campaign_creators"
    __table_args__ = (
        UniqueConstraint("campaign_id", "creator_profile_id", name="uq_campaign_creator"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    creator_profile_id: Mapped[int] = mapped_column(
        ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="assigned", nullable=False)
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    campaign: Mapped[Campaign] = relationship(back_populates="assignments")
