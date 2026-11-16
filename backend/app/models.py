from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import (String, Integer, Float, Boolean, Date, DateTime, ForeignKey,
                        JSON, UniqueConstraint, Index)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="creator")  # creator|agency|marketing|admin
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    content: Mapped[list["ContentRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    growth: Mapped[list["FollowerGrowth"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    audience: Mapped[list["AudienceMetric"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    connections: Mapped[list["SocialConnection"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    activities: Mapped[list["Activity"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    revenue_records: Mapped[list["RevenueRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    hashtags: Mapped[list["HashtagMetric"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    oauth_states: Mapped[list["OAuthState"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    brands: Mapped[list["Brand"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sponsorships: Mapped[list["Sponsorship"]] = relationship(foreign_keys="[Sponsorship.creator_id]", back_populates="creator", cascade="all, delete-orphan")
    campaign_assignments: Mapped[list["CampaignCreator"]] = relationship(foreign_keys="[CampaignCreator.creator_id]", back_populates="creator", cascade="all, delete-orphan")


class ContentRecord(Base):
    __tablename__ = "content_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    platform: Mapped[str] = mapped_column(String(20), index=True)
    published_at: Mapped[date] = mapped_column(Date, index=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    saves: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    watch_time_minutes: Mapped[float] = mapped_column(Float, default=0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship(back_populates="content")


class AudienceMetric(Base):
    """Demographic snapshot per platform (one row per user + platform)."""
    __tablename__ = "audience_metrics"
    __table_args__ = (UniqueConstraint("user_id", "platform"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(20))
    age_distribution: Mapped[dict] = mapped_column(JSON)      # {"18-24": 32.0, ...} percentages
    gender_distribution: Mapped[dict] = mapped_column(JSON)   # {"Female": 48.0, ...}
    geo_distribution: Mapped[dict] = mapped_column(JSON)      # {"India": 30.0, ...}
    device_distribution: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"Mobile": 68.0, "Desktop": 24.0, "Tablet": 8.0}
    active_hours: Mapped[list] = mapped_column(JSON)          # 24 values, relative activity 0-100
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    user: Mapped[User] = relationship(back_populates="audience")


class FollowerGrowth(Base):
    """Daily follower / impression / reach history per platform."""
    __tablename__ = "follower_growth"
    __table_args__ = (UniqueConstraint("user_id", "platform", "date"), Index("ix_growth_user_date", "user_id", "date"))
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    platform: Mapped[str] = mapped_column(String(20))
    date: Mapped[date] = mapped_column(Date)
    followers: Mapped[int] = mapped_column(Integer)
    new_followers: Mapped[int] = mapped_column(Integer, default=0)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    user: Mapped[User] = relationship(back_populates="growth")


class SocialConnection(Base):
    __tablename__ = "social_connections"
    __table_args__ = (UniqueConstraint("user_id", "platform"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="disconnected")  # disconnected | demo | connected
    account_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sync_status: Mapped[str | None] = mapped_column(String(30), nullable=True, default="pending")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user: Mapped[User] = relationship(back_populates="connections")


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(40))
    detail: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    user: Mapped[User] = relationship(back_populates="activities")


class Brand(Base):
    """Brand or advertising sponsor collaborating on creator campaigns."""
    __tablename__ = "brands"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_brand_user_name"),
        Index("ix_brand_user_industry", "user_id", "industry"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    industry: Mapped[str] = mapped_column(String(100), index=True, default="General")
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="brands")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="brand", cascade="all, delete-orphan")
    sponsorships: Mapped[list["Sponsorship"]] = relationship(back_populates="brand", cascade="all, delete-orphan")


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    client_name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    objective: Mapped[str | None] = mapped_column(String(150), nullable=True, default="Brand Awareness")
    status: Mapped[str] = mapped_column(String(30), default="active")  # planning | active | completed | paused
    platform: Mapped[str] = mapped_column(String(30), default="all")   # all | youtube | instagram | tiktok | etc.
    budget: Mapped[float] = mapped_column(Float, default=0.0)
    spent: Mapped[float] = mapped_column(Float, default=0.0)
    target_reach: Mapped[int] = mapped_column(Integer, default=0)
    actual_reach: Mapped[int] = mapped_column(Integer, default=0)
    target_engagement: Mapped[int] = mapped_column(Integer, default=0)
    actual_engagement: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=True)

    user: Mapped["User"] = relationship(back_populates="campaigns")
    brand: Mapped[Optional["Brand"]] = relationship(back_populates="campaigns")
    creators: Mapped[list["CampaignCreator"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")
    sponsorships: Mapped[list["Sponsorship"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")
    performances: Mapped[list["CampaignPerformance"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")


class CampaignCreator(Base):
    """Associates a creator/user with a specific brand campaign and tracks assignments and deliverables."""
    __tablename__ = "campaign_creators"
    __table_args__ = (
        UniqueConstraint("campaign_id", "creator_id", name="uq_campaign_creator"),
        Index("ix_campaign_creator_status", "campaign_id", "status"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    agreed_compensation: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="assigned")  # assigned | pending | accepted | declined | completed
    deliverables: Mapped[str | None] = mapped_column(String(500), nullable=True)
    assigned_date: Mapped[date] = mapped_column(Date, default=date.today)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    campaign: Mapped["Campaign"] = relationship(back_populates="creators")
    creator: Mapped["User"] = relationship(foreign_keys=[creator_id], back_populates="campaign_assignments")


class Sponsorship(Base):
    """Tracks financial sponsorships, contracts, and payment milestones between brands, creators, and campaigns."""
    __tablename__ = "sponsorships"
    __table_args__ = (
        Index("ix_sponsorship_creator_payment", "creator_id", "payment_status"),
        Index("ix_sponsorship_brand_status", "brand_id", "contract_status"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | processing | paid | cancelled
    contract_status: Mapped[str] = mapped_column(String(30), default="draft")   # draft | sent | signed | completed | cancelled
    payment_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deliverable_summary: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    brand: Mapped["Brand"] = relationship(back_populates="sponsorships")
    campaign: Mapped[Optional["Campaign"]] = relationship(back_populates="sponsorships")
    creator: Mapped["User"] = relationship(foreign_keys=[creator_id], back_populates="sponsorships")


class CampaignPerformance(Base):
    """Tracks periodic engagement, reach, conversion, and attributable revenue milestones for campaign ROI."""
    __tablename__ = "campaign_performances"
    __table_args__ = (
        UniqueConstraint("campaign_id", "creator_id", "reporting_date", name="uq_campaign_perf_creator_date"),
        Index("ix_campaign_perf_date", "campaign_id", "reporting_date"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    engagements: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    reporting_date: Mapped[date] = mapped_column(Date, index=True)
    data_source: Mapped[str] = mapped_column(String(50), default="manual")  # manual | demo | platform | youtube | instagram
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    campaign: Mapped["Campaign"] = relationship(back_populates="performances")
    creator: Mapped[Optional["User"]] = relationship(foreign_keys=[creator_id])


class AgencyCreator(Base):
    __tablename__ = "agency_creators"
    __table_args__ = (UniqueConstraint("agency_id", "creator_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    agency_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | pending | completed
    contract_type: Mapped[str] = mapped_column(String(50), default="Exclusive")
    commission_pct: Mapped[float] = mapped_column(Float, default=15.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RevenueRecord(Base):
    __tablename__ = "revenue_records"
    __table_args__ = (
        Index("ix_revenue_user_date", "user_id", "date"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(50), index=True)  # sponsorships | ad_revenue | affiliate | brand_collaborations | subscriptions
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    platform: Mapped[str] = mapped_column(String(20), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship(back_populates="revenue_records")


class HashtagMetric(Base):
    __tablename__ = "hashtag_metrics"
    __table_args__ = (
        UniqueConstraint("user_id", "platform", "tag"),
        Index("ix_hashtag_user_platform", "user_id", "platform"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tag: Mapped[str] = mapped_column(String(100), index=True)
    platform: Mapped[str] = mapped_column(String(20), index=True)
    post_count: Mapped[int] = mapped_column(Integer, default=0)
    total_reach: Mapped[int] = mapped_column(Integer, default=0)
    avg_engagement: Mapped[float] = mapped_column(Float, default=0.0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship(back_populates="hashtags")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notification_user_read", "user_id", "is_read"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(30), default="performance")  # performance | engagement | revenue | system
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    user: Mapped[User] = relationship(back_populates="notifications")


class OAuthState(Base):
    """
    Stores generated OAuth CSRF state tokens with atomic one-time consumption for replay attack
    prevention across multiple workers, processes, and server restarts.
    """
    __tablename__ = "oauth_states"
    __table_args__ = (
        Index("ix_oauth_state_nonce", "nonce", unique=True),
        Index("ix_oauth_state_expires", "expires_at"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    state_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nonce: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(30), default="instagram")
    is_consumed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user: Mapped[User] = relationship(back_populates="oauth_states")
