from datetime import datetime, date, timezone
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
    status: Mapped[str] = mapped_column(String(20), default="disconnected")  # disconnected | demo
    account_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
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


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    client_name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
    user: Mapped[User] = relationship(back_populates="campaigns")


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
