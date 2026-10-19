from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    display_name = Column(
        String(100)
    )

    bio = Column(
        Text
    )

    niche = Column(
        String(100)
    )

    location = Column(
        String(150)
    )

    website_url = Column(
        String(255)
    )

    user = relationship(
        "User",
        back_populates="creator_profile"
    )


class AgencyProfile(Base):
    __tablename__ = "agency_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    agency_name = Column(
        String(150)
    )

    description = Column(
        Text
    )

    location = Column(
        String(150)
    )

    website_url = Column(
        String(255)
    )

    user = relationship(
        "User",
        back_populates="agency_profile"
    )