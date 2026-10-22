from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import (
    AgencyProfile, AudienceInsight, ContentMetric, ContentPost, CreatorProfile,
    MarketingTeamProfile, Notification, RevenueRecord, Report, SocialAccount, User,
)
from app.security import hash_password


def seed_demo_data(db: Session) -> None:
    # Seed the admin independently so existing databases receive it on upgrade.
    admin = db.query(User).filter(User.email == "admin@creatoriq.dev").first()
    if admin is None:
        admin = User(
            email="admin@creatoriq.dev",
            full_name="CreatorIQ Administrator",
            hashed_password=hash_password("CreatorIQAdmin@123"),
            role="administrator",
            is_active=True,
        )
        db.add(admin)
    else:
        admin.role = "administrator"
        admin.is_active = True

    # Seed each public workspace role with its own role-specific profile table.
    role_demo_accounts = [
        ("agency@creatoriq.dev", "Taylor Agency", "AgencyDemo@123", "agency", "Taylor Agency Workspace", "Creator & brand partnerships"),
        ("marketing@creatoriq.dev", "Jordan Marketing", "MarketingDemo@123", "marketing_team", "Jordan Marketing Workspace", "Content marketing"),
    ]
    for email, full_name, password, role, profile_name, focus_area in role_demo_accounts:
        demo_user = db.query(User).filter(User.email == email).first()
        if demo_user is None:
            demo_user = User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role=role,
                is_active=True,
            )
            db.add(demo_user)
            db.flush()
        else:
            demo_user.role = role
            demo_user.is_active = True

        legacy_creator_profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == demo_user.id).first()
        legacy_name = legacy_creator_profile.display_name if legacy_creator_profile else profile_name
        legacy_focus = legacy_creator_profile.niche if legacy_creator_profile else focus_area
        if role == "agency":
            role_profile = db.query(AgencyProfile).filter(AgencyProfile.user_id == demo_user.id).first()
            if role_profile is None:
                db.add(AgencyProfile(user_id=demo_user.id, agency_name=legacy_name, service_focus=legacy_focus))
        else:
            role_profile = db.query(MarketingTeamProfile).filter(MarketingTeamProfile.user_id == demo_user.id).first()
            if role_profile is None:
                db.add(MarketingTeamProfile(user_id=demo_user.id, team_name=legacy_name, focus_area=legacy_focus))

    existing = db.query(User).filter(User.email == "demo@creatoriq.dev").first()
    if existing:
        db.commit()
        return

    user = User(
        email="demo@creatoriq.dev",
        full_name="Alex Morgan",
        hashed_password=hash_password("CreatorIQ@123"),
        role="creator",
        is_active=True,
    )
    db.add(user)
    db.flush()
    profile = CreatorProfile(
        user_id=user.id,
        display_name="Alex Creates",
        niche="Technology & Education",
        bio="Demo workspace for creator performance analytics.",
    )
    db.add(profile)
    db.flush()

    account_specs = [
        ("YouTube", "@alexcreates", 28450, "https://youtube.com"),
        ("Instagram", "@alex.creates", 17820, "https://instagram.com"),
        ("TikTok", "@alexcreates", 9760, "https://tiktok.com"),
    ]
    accounts = []
    for platform, handle, followers, url in account_specs:
        account = SocialAccount(
            creator_profile_id=profile.id,
            platform=platform,
            handle=handle,
            followers_count=followers,
            profile_url=url,
            is_connected=False,
        )
        db.add(account)
        accounts.append(account)
    db.flush()

    post_titles = {
        "YouTube": ["5 Python Tools I Use Every Day", "Build a Portfolio That Gets Noticed", "React vs Vue: What to Choose"],
        "Instagram": ["A clean desk, a clear plan", "3 coding habits that actually help", "Behind the scenes: project day"],
        "TikTok": ["One CSS trick in 20 seconds", "POV: your code finally works", "Git commands worth remembering"],
    }
    multipliers = [1.0, 0.73, 0.52]
    today = date.today()
    for account in accounts:
        for post_index, title in enumerate(post_titles[account.platform]):
            published = datetime.now(timezone.utc) - timedelta(days=post_index + 2)
            post = ContentPost(
                social_account_id=account.id,
                title=title,
                content_type="Short video" if account.platform != "YouTube" or post_index == 0 else "Video",
                post_url=None,
                published_at=published,
            )
            db.add(post)
            db.flush()
            platform_factor = {"YouTube": 1.4, "Instagram": 1.0, "TikTok": 1.15}[account.platform]
            for day_offset in range(6, -1, -1):
                recorded = today - timedelta(days=day_offset)
                day_factor = 0.76 + (6 - day_offset) * 0.075
                base_views = int((1250 + (2 - post_index) * 440) * multipliers[post_index] * platform_factor * day_factor)
                likes = int(base_views * (0.075 + post_index * 0.004))
                comments = int(base_views * 0.012)
                shares = int(base_views * 0.009)
                saves = int(base_views * 0.014)
                reach = int(base_views * 0.82)
                engagement_rate = round((likes + comments + shares + saves) / max(reach, 1) * 100, 2)
                db.add(ContentMetric(
                    content_post_id=post.id,
                    recorded_on=recorded,
                    views=base_views,
                    likes=likes,
                    comments=comments,
                    shares=shares,
                    saves=saves,
                    watch_time_seconds=base_views * (18 if account.platform == "YouTube" else 9),
                    reach=reach,
                    impressions=int(base_views * 1.22),
                    engagement_rate=engagement_rate,
                ))

    for account in accounts:
        db.add(AudienceInsight(
            social_account_id=account.id,
            recorded_on=today,
            age_distribution={"18-24": 42, "25-34": 36, "35-44": 15, "45+": 7},
            gender_distribution={"women": 48, "men": 49, "unspecified": 3},
            geographic_distribution={"India": 61, "United States": 16, "United Kingdom": 8, "Other": 15},
            device_distribution={"mobile": 78, "desktop": 17, "tablet": 5},
            active_hours={"09": 18, "12": 27, "18": 41, "21": 14},
            impressions=18000,
            reach=14600,
        ))

    month_start = today.replace(day=1)
    db.add_all([
        RevenueRecord(creator_profile_id=profile.id, source="Sponsorships", amount=Decimal("12500.00"), currency="INR", description="Demo brand collaboration", recorded_on=max(month_start, today - timedelta(days=9))),
        RevenueRecord(creator_profile_id=profile.id, source="Ad revenue", amount=Decimal("6840.00"), currency="INR", description="Demo platform earnings", recorded_on=max(month_start, today - timedelta(days=3))),
        Notification(creator_profile_id=profile.id, title="Weekly performance is ready", message="Your demo workspace has a fresh 7-day overview.", category="performance"),
        Report(creator_profile_id=profile.id, report_type="weekly_analytics", title="Weekly Creator Performance", format="PDF", status="sample"),
    ])
    db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    print("Creator demo: demo@creatoriq.dev / CreatorIQ@123")
    print("Admin demo: admin@creatoriq.dev / CreatorIQAdmin@123 (local review only)")


if __name__ == "__main__":
    main()
