from datetime import datetime
from sqlalchemy import (Column, Integer, String, Boolean, DateTime, Date, Float,
                        ForeignKey, Text, UniqueConstraint)
from sqlalchemy.orm import relationship
from .database import Base


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String(30), unique=True, nullable=False)  # creator, agency, marketing_team, admin
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)  # NEVER store plain password
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False)
    agency_profile = relationship("AgencyProfile", back_populates="user", uselist=False)


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String(100))
    bio = Column(Text)
    niche = Column(String(60))          # e.g. tech, fitness, travel
    primary_platform = Column(String(30))  # YouTube, Instagram...
    user = relationship("User", back_populates="creator_profile")


class AgencyProfile(Base):
    __tablename__ = "agency_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    agency_name = Column(String(150))
    website = Column(String(255))
    description = Column(Text)
    user = relationship("User", back_populates="agency_profile")


# ---------------- Analytics tables (Creator dashboard) ----------------
class SocialAccount(Base):
    __tablename__ = "social_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    platform = Column(String(30), nullable=False)      # YouTube, Instagram, TikTok, X
    handle = Column(String(100))
    connected = Column(Boolean, default=True)


class DailyMetric(Base):
    """One row per user, per platform, per day. Powers KPI cards and the charts."""
    __tablename__ = "daily_metrics"
    __table_args__ = (UniqueConstraint("user_id", "platform", "date", name="uq_metric_day"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    platform = Column(String(30), nullable=False)
    date = Column(Date, nullable=False)
    followers = Column(Integer, default=0)   # total followers at end of that day
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)


class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    platform = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    post_type = Column(String(20))           # Video, Reel, Short, Post
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    published_at = Column(Date, nullable=False)


class AudienceStat(Base):
    __tablename__ = "audience_stats"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category = Column(String(20), nullable=False)   # age, gender, location, device
    label = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)           # percentage


class RevenueEntry(Base):
    __tablename__ = "revenue_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    month = Column(Date, nullable=False)            # first day of the month
    source = Column(String(40), nullable=False)     # Sponsorships, Ad Revenue, ...
    amount = Column(Float, nullable=False)


# ---------------- Agency & Marketing dashboard tables ----------------
class ManagedCreator(Base):
    """Creators an agency manages (demo data for now)."""
    __tablename__ = "managed_creators"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)  # the agency
    name = Column(String(100), nullable=False)
    handle = Column(String(100))
    platform = Column(String(30))
    niche = Column(String(60))
    followers = Column(Integer, default=0)
    prev_followers = Column(Integer, default=0)       # followers 30 days ago
    views_30d = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0)
    monthly_revenue = Column(Float, default=0)


class Campaign(Base):
    """Marketing team campaigns (demo data for now)."""
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)  # the marketing user
    name = Column(String(150), nullable=False)
    platform = Column(String(30))
    status = Column(String(20))                       # Active, Paused, Completed
    budget = Column(Float, default=0)
    spend = Column(Float, default=0)
    reach = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
