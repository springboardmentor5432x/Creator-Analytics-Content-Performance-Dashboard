"""Module 1 tables. Names and columns follow database/schema.sql.

users 1--1 creators      users 1--1 agencies      agencies M--N creators (agency_creators)
"""
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('creator', 'agency', 'marketing_team', 'admin')", name="ck_users_role"),
    )

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    creator: Mapped["Creator | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    agency: Mapped["Agency | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class Creator(Base):
    __tablename__ = "creators"

    creator_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    creator_name: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    profile_image: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="creator")
    social_accounts: Mapped[list["SocialAccount"]] = relationship(
        back_populates="creator", cascade="all, delete-orphan"
    )


class Agency(Base):
    __tablename__ = "agencies"

    agency_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    agency_name: Mapped[str | None] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)
    logo: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="agency")


class AgencyCreator(Base):
    __tablename__ = "agency_creators"

    agency_id: Mapped[int] = mapped_column(
        ForeignKey("agencies.agency_id", ondelete="CASCADE"), primary_key=True
    )
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creators.creator_id", ondelete="CASCADE"), primary_key=True
    )
    added_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


class SocialAccount(Base):
    __tablename__ = "social_accounts"
    __table_args__ = (
        UniqueConstraint("platform", "platform_user_id", name="uq_social_platform_user"),
    )

    account_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creators.creator_id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)  # youtube, instagram, etc.
    username: Mapped[str | None] = mapped_column(String(100))
    platform_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    followers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    access_token: Mapped[str | None] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    connected_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    creator: Mapped[Creator] = relationship(back_populates="social_accounts")
    posts: Mapped[list["Post"]] = relationship(
        back_populates="social_account", cascade="all, delete-orphan"
    )
    audience_records: Mapped[list["AudienceAnalytics"]] = relationship(
        back_populates="social_account", cascade="all, delete-orphan"
    )


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        UniqueConstraint("account_id", "platform_post_id", name="uq_account_platform_post"),
    )

    post_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("social_accounts.account_id", ondelete="CASCADE"), nullable=False
    )
    platform_post_id: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(50))  # video, reel, short
    caption: Mapped[str | None] = mapped_column(Text)
    hashtags: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(String(255))
    post_url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    social_account: Mapped[SocialAccount] = relationship(back_populates="posts")
    analytics: Mapped["PostAnalytics | None"] = relationship(
        back_populates="post", uselist=False, cascade="all, delete-orphan"
    )


class PostAnalytics(Base):
    __tablename__ = "post_analytics"

    analytics_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.post_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    views: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    likes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shares: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    saves: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[int | None] = mapped_column(BigInteger)
    impressions: Mapped[int | None] = mapped_column(BigInteger)
    watch_time: Mapped[float | None] = mapped_column(Float)
    engagement_rate: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    post: Mapped[Post] = relationship(back_populates="analytics")


class AudienceAnalytics(Base):
    __tablename__ = "audience_analytics"
    __table_args__ = (
        UniqueConstraint("account_id", "date", name="uq_account_audience_date"),
    )

    audience_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("social_accounts.account_id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    followers: Mapped[int | None] = mapped_column(Integer)
    following: Mapped[int | None] = mapped_column(Integer)
    impressions: Mapped[int | None] = mapped_column(BigInteger)
    reach: Mapped[int | None] = mapped_column(BigInteger)
    profile_visits: Mapped[int | None] = mapped_column(Integer)
    male_percentage: Mapped[float | None] = mapped_column(Float)
    female_percentage: Mapped[float | None] = mapped_column(Float)
    top_location: Mapped[str | None] = mapped_column(String(100))
    active_hours: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    social_account: Mapped[SocialAccount] = relationship(back_populates="audience_records")

