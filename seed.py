from app import create_app
from models import db, User, CreatorProfile, AuditLog

def seed_database():
    app = create_app()
    with app.app_context():
        # Clear existing data for fresh seed
        db.drop_all()
        db.create_all()
        print("Initializing database tables...")

        # 1. Administrator
        admin = User(
            name="Sarah Jenkins",
            email="admin@creatoriq.com",
            role="admin",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
        )
        admin.set_password("AdminPass123!")
        db.session.add(admin)

        # 2. Creator (Default Demo - HARSHITHA S)
        creator = User(
            name="HARSHITHA S",
            email="sharshitha28007@gmail.com",
            role="creator",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
        )
        creator.set_password("CreatorPass123!")
        db.session.add(creator)
        db.session.flush()

        creator_profile = CreatorProfile(
            user_id=creator.id,
            handle="@harshitha_s",
            bio="Tech innovator, content creator & AI engineer based in Bangalore. Building data-driven creator analytics and sharing tech lifestyle content.",
            niche="Technology, AI & Digital Innovation",
            location="Bangalore, India",
            website="https://harshithas.dev",
            contact_email="sharshitha28007@gmail.com",
            base_rate=3500.0,
            collaboration_status="open",
            youtube_handle="@HarshithaTech",
            youtube_subscribers=185000,
            instagram_handle="@harshitha.codes",
            instagram_followers=94200,
            tiktok_handle="@harshitha_dev",
            tiktok_followers=310000,
            twitter_handle="@harshitha_s",
            engagement_rate=6.8,
            monthly_reach=1850000,
            verified=True
        )
        db.session.add(creator_profile)

        # 3. Agency User
        agency = User(
            name="Vanguard Talent Group",
            email="agency@creatoriq.com",
            role="agency",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80"
        )
        agency.set_password("AgencyPass123!")
        db.session.add(agency)

        # 4. Marketing Team User
        marketing = User(
            name="Nova Brands Growth Team",
            email="marketing@creatoriq.com",
            role="marketing",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
        )
        marketing.set_password("MarketingPass123!")
        db.session.add(marketing)

        # 5. Additional Creators for Discovery & Roster
        creators_data = [
            {
                "name": "Sophia Chen",
                "email": "sophia.tech@creatoriq.com",
                "pass": "SophiaPass123!",
                "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
                "handle": "@sophiachen",
                "bio": "AI researcher & consumer hardware reviewer. Demystifying neural networks for everyday creators.",
                "niche": "AI, Hardware & Future Tech",
                "location": "Seattle, WA",
                "site": "https://sophiachen.ai",
                "contact": "collab@sophiachen.ai",
                "rate": 3200.0,
                "yt": 340000,
                "ig": 142000,
                "tt": 520000,
                "eng": 6.8,
                "reach": 2400000
            },
            {
                "name": "Marcus Vance",
                "email": "marcus.visuals@creatoriq.com",
                "pass": "MarcusPass123!",
                "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
                "handle": "@marcusvisuals",
                "bio": "Cinematographer, colorist, and travel storyteller exploring high-end camera rigs and lighting techniques.",
                "niche": "Cinematography & Travel",
                "location": "Austin, TX",
                "site": "https://marcusvance.co",
                "contact": "biz@marcusvance.co",
                "rate": 2800.0,
                "yt": 210000,
                "ig": 195000,
                "tt": 180000,
                "eng": 4.9,
                "reach": 1600000
            },
            {
                "name": "Elena Rostova",
                "email": "elena.wellness@creatoriq.com",
                "pass": "ElenaPass123!",
                "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
                "handle": "@elenawellness",
                "bio": "Holistic nutrition, mindful routines, and peak mental performance for digital entrepreneurs.",
                "niche": "Health, Wellness & Biohacking",
                "location": "Boulder, CO",
                "site": "https://elenawellness.com",
                "contact": "partners@elenawellness.com",
                "rate": 1900.0,
                "yt": 98000,
                "ig": 220000,
                "tt": 410000,
                "eng": 7.2,
                "reach": 1900000
            }
        ]

        for c in creators_data:
            u = User(
                name=c["name"],
                email=c["email"],
                role="creator",
                status="active",
                avatar_url=c["avatar"]
            )
            u.set_password(c["pass"])
            db.session.add(u)
            db.session.flush()

            prof = CreatorProfile(
                user_id=u.id,
                handle=c["handle"],
                bio=c["bio"],
                niche=c["niche"],
                location=c["location"],
                website=c["site"],
                contact_email=c["contact"],
                base_rate=c["rate"],
                collaboration_status="open",
                youtube_handle=c["handle"] + "YT",
                youtube_subscribers=c["yt"],
                instagram_handle=c["handle"] + "IG",
                instagram_followers=c["ig"],
                tiktok_handle=c["handle"] + "TT",
                tiktok_followers=c["tt"],
                twitter_handle=c["handle"],
                engagement_rate=c["eng"],
                monthly_reach=c["reach"],
                verified=True
            )
            db.session.add(prof)

        # Add initial audit logs
        db.session.add(AuditLog(
            action="SYSTEM_INIT",
            details="Database initialized and pre-seeded with role-based accounts.",
            ip_address="127.0.0.1"
        ))

        db.session.commit()
        print("Database seeding completed successfully!")
        print("Demo accounts created:")
        print(" - Admin: admin@creatoriq.com / AdminPass123!")
        print(" - Creator: creator@creatoriq.com / CreatorPass123!")
        print(" - Agency: agency@creatoriq.com / AgencyPass123!")
        print(" - Marketing: marketing@creatoriq.com / MarketingPass123!")

if __name__ == '__main__':
    seed_database()
