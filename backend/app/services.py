"""Shared business logic: engagement formula, filters, demo-data generation."""
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .models import ContentRecord, FollowerGrowth, AudienceMetric, Activity, Campaign, AgencyCreator
from .schemas import PLATFORMS


def engagement_rate(likes, comments, shares, saves, reach) -> float:
    """Engagement Rate (%) = (Likes + Comments + Shares + Saves) / Reach * 100.
    Returns 0.0 when reach is zero or negative (no division by zero)."""
    if not reach or reach <= 0:
        return 0.0
    return round((likes + comments + shares + saves) / reach * 100, 2)


def resolve_range(start: date | None, end: date | None, days: int | None = None):
    end = end or date.today()
    if start is None:
        start = end - timedelta(days=(days or 30) - 1)
    return start, end


def log(db: Session, user_id: int, action: str, detail: str = ""):
    db.add(Activity(user_id=user_id, action=action, detail=detail[:255]))


def content_to_dict(c: ContentRecord) -> dict:
    return {
        "id": c.id, "title": c.title, "platform": c.platform, "published_at": c.published_at,
        "views": c.views, "likes": c.likes, "comments": c.comments, "shares": c.shares,
        "saves": c.saves, "reach": c.reach, "watch_time_minutes": c.watch_time_minutes,
        "is_demo": c.is_demo,
        "engagement_rate": engagement_rate(c.likes, c.comments, c.shares, c.saves, c.reach),
    }


def campaign_to_dict(c: Campaign) -> dict:
    roi = round(((c.actual_reach / max(1, c.target_reach)) * 100) - 100, 1) if c.target_reach > 0 else 0.0
    return {
        "id": c.id, "user_id": c.user_id, "title": c.title, "client_name": c.client_name,
        "description": c.description, "status": c.status, "platform": c.platform,
        "budget": c.budget, "spent": c.spent, "target_reach": c.target_reach,
        "actual_reach": c.actual_reach, "target_engagement": c.target_engagement,
        "actual_engagement": c.actual_engagement,
        "start_date": c.start_date, "end_date": c.end_date,
        "is_demo": c.is_demo, "created_at": c.created_at, "roi_pct": roi,
    }


# ---------------------------------------------------------------- demo data
_TITLES = ["5 editing tricks I wish I knew sooner", "Behind the scenes: studio tour", "Q&A: your top questions answered",
           "My morning routine for creators", "How I plan a month of content", "Gear I actually use in 2026",
           "Reacting to your best comments", "Beginner mistakes to avoid", "Day in the life of a full-time creator",
           "Free tools that saved me hours", "How I grew to 10K followers", "Storytelling hooks that work",
           "Weekly recap and what's next", "Collab announcement", "Honest review: the new camera",
           "Thumbnail makeover challenge", "What the algorithm rewards", "Lighting setup on a budget"]
_BASE = {"youtube": (14000, 24, 52000), "instagram": (9000, 18, 21000), "tiktok": (22000, 12, 60000),
         "facebook": (3500, 8, 9000), "x": (2500, 10, 12000), "linkedin": (2200, 9, 6500)}
_GEO = ["India", "United States", "United Kingdom", "Indonesia", "Brazil", "Germany", "Other"]

_CAMPAIGNS = [
    {"title": "Summer Footwear Launch 2026", "client_name": "Nike Athletics", "platform": "instagram", "status": "active",
     "budget": 25000.0, "spent": 18200.0, "target_reach": 850000, "actual_reach": 920000, "target_engagement": 45000, "actual_engagement": 53200,
     "description": "Multi-creator lifestyle and workout apparel showcase."},
    {"title": "Noise-Cancelling Earbuds Drop", "client_name": "Sony Audio", "platform": "youtube", "status": "active",
     "budget": 40000.0, "spent": 29500.0, "target_reach": 1200000, "actual_reach": 1380000, "target_engagement": 65000, "actual_engagement": 78900,
     "description": "Long-form reviews, audio demos, and unboxing series."},
    {"title": "Protein & Hydration Surge", "client_name": "Gymshark Nutrition", "platform": "tiktok", "status": "active",
     "budget": 15000.0, "spent": 14200.0, "target_reach": 600000, "actual_reach": 740000, "target_engagement": 52000, "actual_engagement": 66400,
     "description": "Viral recipe hooks, gym transformation shorts, and challenges."},
    {"title": "Fall Season Creator Spotlight", "client_name": "Spotify Sound", "platform": "all", "status": "completed",
     "budget": 35000.0, "spent": 35000.0, "target_reach": 1500000, "actual_reach": 1620000, "target_engagement": 90000, "actual_engagement": 98400,
     "description": "Cross-platform playlist curation and podcast highlights."},
    {"title": "AI Workflow Toolkit Q4", "client_name": "Notion Apps", "platform": "x", "status": "planning",
     "budget": 12000.0, "spent": 1500.0, "target_reach": 400000, "actual_reach": 85000, "target_engagement": 18000, "actual_engagement": 4200,
     "description": "Developer and productivity creator thread campaigns."},
]


def _split(rng, labels, spread=1.0):
    raw = [rng.random() ** 1.5 * spread + 0.15 for _ in labels]
    s = sum(raw)
    vals = [round(r / s * 100, 1) for r in raw]
    vals[0] = round(vals[0] + (100 - sum(vals)), 1)
    return dict(zip(labels, vals))


def clear_demo(db: Session, user_id: int):
    for m in (ContentRecord, FollowerGrowth, AudienceMetric, Campaign):
        db.query(m).filter(m.user_id == user_id, m.is_demo.is_(True)).delete()


def load_demo(db: Session, user_id: int, days: int = 120, seed: int | None = None):
    """Generate realistic, deterministic-per-user sample data. Everything is flagged is_demo=True."""
    rng = random.Random(seed if seed is not None else user_id * 7919)
    clear_demo(db, user_id)
    today = date.today()
    # follower history
    for p in PLATFORMS:
        followers, daily, imp = _BASE[p]
        f = followers
        for i in range(days):
            d = today - timedelta(days=days - 1 - i)
            wave = 1 + 0.35 * (1 if d.weekday() in (4, 5) else 0)
            new = max(0, int(rng.gauss(daily * wave * (1 + i / days * 0.8), daily * 0.4)))
            lost = int(new * rng.uniform(0.05, 0.25))
            f += new - lost
            impressions = int(imp / 30 * rng.uniform(0.7, 1.4) * (1 + i / days * 0.5))
            db.add(FollowerGrowth(user_id=user_id, platform=p, date=d, followers=f, new_followers=new - lost,
                                  impressions=impressions, reach=int(impressions * rng.uniform(0.55, 0.8)), is_demo=True))
        peak = rng.choice([9, 12, 18, 20, 21])
        hours = [int(max(5, 100 - min(abs(h - peak), 24 - abs(h - peak)) * 12 + rng.randint(-8, 8))) for h in range(24)]
        db.add(AudienceMetric(user_id=user_id, platform=p, is_demo=True,
                              age_distribution=_split(rng, ["13-17", "18-24", "25-34", "35-44", "45+"]),
                              gender_distribution=_split(rng, ["Female", "Male", "Other"], 0.6),
                              geo_distribution=_split(rng, _GEO), active_hours=hours))
    # content
    for i in range(36):
        p = PLATFORMS[i % len(PLATFORMS)] if i < 12 else rng.choice(PLATFORMS)
        base_views = _BASE[p][2] / 8
        views = int(base_views * rng.lognormvariate(0, 0.7))
        reach = int(views * rng.uniform(0.6, 0.95))
        likes = int(reach * rng.uniform(0.03, 0.11))
        db.add(ContentRecord(user_id=user_id, title=rng.choice(_TITLES), platform=p,
                             published_at=today - timedelta(days=rng.randint(0, days - 1)), views=views,
                             likes=likes, comments=int(likes * rng.uniform(0.04, 0.15)),
                             shares=int(likes * rng.uniform(0.05, 0.3)), saves=int(likes * rng.uniform(0.05, 0.4)),
                             reach=reach, watch_time_minutes=round(views * rng.uniform(0.6, 4.5), 1), is_demo=True))

    # demo campaigns
    for idx, c in enumerate(_CAMPAIGNS):
        db.add(Campaign(
            user_id=user_id,
            title=c["title"],
            client_name=c["client_name"],
            description=c["description"],
            status=c["status"],
            platform=c["platform"],
            budget=c["budget"],
            spent=c["spent"],
            target_reach=c["target_reach"],
            actual_reach=c["actual_reach"],
            target_engagement=c["target_engagement"],
            actual_engagement=c["actual_engagement"],
            start_date=today - timedelta(days=25 + idx * 5),
            end_date=today + timedelta(days=15 + idx * 7) if c["status"] != "completed" else today - timedelta(days=5),
            is_demo=True,
        ))
