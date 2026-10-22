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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    user: Mapped[User] = relationship(back_populates="profile")
    social_accounts: Mapped[list[SocialAccount]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    revenue_records: Mapped[list[RevenueRecord]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    notifications: Mapped[list[Notification]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")
    reports: Mapped[list[Report]] = relationship(back_populates="creator_profile", cascade="all, delete-orphan")


class AgencyProfile(Base):
    """Agency-specific workspace data; kept separate from creator analytics data."""
    __tablename__ = "agency_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    agency_name: Mapped[str] = mapped_column(String(120), nullable=False)
    service_focus: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    social_account: Mapped[SocialAccount] = relationship(back_populates="audience_insights")


class RevenueRecord(Base):
    __tablename__ = "revenue_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    description: Mapped[str | None] = mapped_column(String(250), nullable=True)
    recorded_on: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="revenue_records")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(40), default="performance", nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="notifications")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    creator_profile_id: Mapped[int] = mapped_column(ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[str] = mapped_column(String(10), default="PDF", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    creator_profile: Mapped[CreatorProfile] = relationship(back_populates="reports")
