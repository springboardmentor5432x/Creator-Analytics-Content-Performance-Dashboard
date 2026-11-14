
from datetime import date, datetime

from sqlalchemy import (
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Date,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ContentPost(Base):
    __tablename__ = "content_posts"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    platform: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False
    )
    views: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    likes: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    comments: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    shares: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )


class AudienceSnapshot(Base):
    __tablename__ = "audience_snapshots"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    snapshot_date: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    followers: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "platform",
            name="uq_social_account_user_platform",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    platform: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    external_account_id: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    account_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    access_token_encrypted: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    refresh_token_encrypted: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scopes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class OAuthState(Base):
    __tablename__ = "oauth_states"

    state: Mapped[str] = mapped_column(
        String(128), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    platform: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
