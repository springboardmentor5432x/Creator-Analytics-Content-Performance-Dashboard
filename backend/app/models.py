"""Module 1 tables. Names and columns follow database/schema.sql.

users 1--1 creators      users 1--1 agencies      agencies M--N creators (agency_creators)
"""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func, true
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
