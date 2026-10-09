from sqlalchemy.orm import Session
from app.db.database import engine, Base
from app.models.user import User, UserRole, CreatorProfile, AgencyProfile, UserSettings
from app.core.security import get_password_hash

def init_db(db: Session) -> None:
    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    # Check if database already populated
    existing_user = db.query(User).first()
    if existing_user:
        return

    print("Initializing Database with default Module 1 Seed Users...")
    hashed_pwd = get_password_hash("Password123!")

    # 1. Creator User
    creator_user = User(
        full_name="Alex Rivera",
        email="creator@creatoriq.com",
        hashed_password=hashed_pwd,
        role=UserRole.CREATOR,
        is_active=True,
        is_verified=True
    )
    db.add(creator_user)
    db.commit()
    db.refresh(creator_user)

    creator_prof = CreatorProfile(
        user_id=creator_user.id,
        handle="@alexrivera",
        niche="Tech & AI Creator",
        bio="Full-time tech creator sharing tutorials, AI workflows, and hardware reviews.",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        youtube_channel="youtube.com/c/AlexRiveraTech",
        instagram_handle="@alex_rivera_tech",
        tiktok_handle="@alexrivera_official",
        total_followers=248000,
        monthly_views=1850000,
        connected_accounts=["YouTube", "Instagram", "TikTok"]
    )
    creator_sett = UserSettings(user_id=creator_user.id)
    db.add_all([creator_prof, creator_sett])

    # 2. Agency User
    agency_user = User(
        full_name="Sarah Jenkins (Apex Agency)",
        email="agency@creatoriq.com",
        hashed_password=hashed_pwd,
        role=UserRole.AGENCY,
        is_active=True,
        is_verified=True
    )
    db.add(agency_user)
    db.commit()
    db.refresh(agency_user)

    agency_prof = AgencyProfile(
        user_id=agency_user.id,
        agency_name="Apex Creator Talent Agency",
        company_website="https://apexcreators.com",
        managed_creators_count=34,
        primary_contact_email="sarah@apexcreators.com",
        tier="Enterprise Agency",
        description="Global talent management agency managing top tech and lifestyle creators."
    )
    agency_sett = UserSettings(user_id=agency_user.id)
    db.add_all([agency_prof, agency_sett])

    # 3. Marketing Team User
    marketing_user = User(
        full_name="Marcus Vance",
        email="marketing@creatoriq.com",
        hashed_password=hashed_pwd,
        role=UserRole.MARKETING_TEAM,
        is_active=True,
        is_verified=True
    )
    db.add(marketing_user)
    db.commit()
    db.refresh(marketing_user)
    mkt_sett = UserSettings(user_id=marketing_user.id)
    db.add(mkt_sett)

    # 4. Administrator User
    admin_user = User(
        full_name="System Admin",
        email="admin@creatoriq.com",
        hashed_password=hashed_pwd,
        role=UserRole.ADMINISTRATOR,
        is_active=True,
        is_verified=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    admin_sett = UserSettings(user_id=admin_user.id)
    db.add(admin_sett)

    db.commit()
    print("Database seeding completed successfully!")
