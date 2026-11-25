from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean, DateTime,
    ForeignKey, func,
)
from sqlalchemy.orm import relationship
from .database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    role = relationship("Role")


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    niche = Column(String)
    bio = Column(String)
    platform_links = Column(String)


class AgencyProfile(Base):
    __tablename__ = "agency_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    agency_name = Column(String)
    website = Column(String)
    description = Column(String)


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(BigInteger, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String, nullable=False)
    platform_account_id = Column(String, nullable=False)
    account_name = Column(String)
    connected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Post(Base):
    __tablename__ = "posts"

    id = Column(BigInteger, primary_key=True)
    social_account_id = Column(BigInteger, ForeignKey("social_accounts.id"), nullable=False)
    platform_post_id = Column(String, nullable=False)
    title = Column(Text)
    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PostAnalytics(Base):
    __tablename__ = "post_analytics"

    id = Column(BigInteger, primary_key=True)
    post_id = Column(BigInteger, ForeignKey("posts.id"), nullable=False)
    views = Column(BigInteger)
    likes = Column(BigInteger)
    comments = Column(BigInteger)
    shares = Column(BigInteger)
    reach = Column(BigInteger)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AudienceAnalytics(Base):
    __tablename__ = "audience_analytics"

    id = Column(BigInteger, primary_key=True)
    social_account_id = Column(BigInteger, ForeignKey("social_accounts.id"), nullable=False)
    subscriber_count = Column(BigInteger)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
