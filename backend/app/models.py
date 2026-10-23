
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.sql import func


def utc_now():
    return datetime.now(timezone.utc)


# Supported application roles
CREATOR_ROLE = "creator"
AGENCY_ROLE = "agency"
MARKETING_TEAM_ROLE = "marketing_team"
ADMIN_ROLE = "administrator"

SUPPORTED_ROLES = {
    CREATOR_ROLE,
    AGENCY_ROLE,
    MARKETING_TEAM_ROLE,
    ADMIN_ROLE,
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=CREATOR_ROLE,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    bio: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    social_links: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    theme_preference: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="system",
    )

    email_notifications: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

class SocialAccount(Base):
    __tablename__ = "social_accounts"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "platform",
            "platform_user_id",
            name="uq_social_user_platform_account",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    platform: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )

    platform_user_id: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    username: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    display_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
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

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
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

