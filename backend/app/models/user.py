import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserRole(str, enum.Enum):
    CREATOR = "Creator"
    AGENCY = "Agency"
    MARKETING_TEAM = "Marketing Team"
    ADMINISTRATOR = "Administrator"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CREATOR)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    agency_profile = relationship("AgencyProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    handle = Column(String(50), nullable=True)
    niche = Column(String(100), default="Tech & Content")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    youtube_channel = Column(String(100), nullable=True)
    instagram_handle = Column(String(100), nullable=True)
    tiktok_handle = Column(String(100), nullable=True)
    total_followers = Column(Integer, default=125000)
    monthly_views = Column(Integer, default=450000)
    connected_accounts = Column(JSON, default=lambda: ["YouTube", "Instagram"])

    user = relationship("User", back_populates="creator_profile")

class AgencyProfile(Base):
    __tablename__ = "agency_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    agency_name = Column(String(100), nullable=False)
    company_website = Column(String(150), nullable=True)
    managed_creators_count = Column(Integer, default=15)
    primary_contact_email = Column(String(100), nullable=True)
    tier = Column(String(50), default="Enterprise Agency")
    description = Column(Text, nullable=True)

    user = relationship("User", back_populates="agency_profile")

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    theme = Column(String(20), default="dark")
    email_notifications = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    api_rate_limit_alert = Column(Boolean, default=True)

    user = relationship("User", back_populates="settings")
