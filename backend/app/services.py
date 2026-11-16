"""Shared business logic: engagement formula, filters, demo-data generation."""
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from .models import (ContentRecord, FollowerGrowth, AudienceMetric, Activity, Campaign, AgencyCreator,
                     RevenueRecord, HashtagMetric, Notification, Brand, CampaignCreator, Sponsorship, CampaignPerformance)
from .schemas import PLATFORMS, REVENUE_SOURCES


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
        "id": c.id, "user_id": c.user_id, "brand_id": getattr(c, "brand_id", None),
        "title": c.title, "client_name": c.client_name,
        "description": c.description, "objective": getattr(c, "objective", "Brand Awareness"),
        "status": c.status, "platform": c.platform,
        "budget": c.budget, "spent": c.spent, "target_reach": c.target_reach,
        "actual_reach": c.actual_reach, "target_engagement": c.target_engagement,
        "actual_engagement": c.actual_engagement,
        "start_date": c.start_date, "end_date": c.end_date,
        "is_demo": c.is_demo, "created_at": c.created_at, "updated_at": getattr(c, "updated_at", None),
        "roi_pct": roi,
    }


def brand_to_dict(b: Brand, mask_contacts: bool = False) -> dict:
    camps = getattr(b, "campaigns", []) or []
    spons = getattr(b, "sponsorships", []) or []
    return {
        "id": b.id, "user_id": b.user_id, "name": b.name,
        "description": b.description, "industry": b.industry,
        "website": b.website,
        "contact_email": None if mask_contacts else b.contact_email,
        "contact_phone": None if mask_contacts else b.contact_phone,
        "contact_person": None if mask_contacts else b.contact_person,
        "is_demo": b.is_demo, "is_archived": getattr(b, "is_archived", False),
        "created_at": b.created_at,
        "active_campaigns_count": len([c for c in camps if getattr(c, "status", "") == "active"]),
        "total_sponsorships_count": len(spons),
    }


def campaign_creator_to_dict(cc: CampaignCreator) -> dict:
    creator_user = getattr(cc, "creator", None)
    camp = getattr(cc, "campaign", None)
    return {
        "id": cc.id, "campaign_id": cc.campaign_id, "creator_id": cc.creator_id,
        "agreed_compensation": cc.agreed_compensation, "status": cc.status,
        "deliverables": cc.deliverables, "assigned_date": cc.assigned_date,
        "is_demo": cc.is_demo, "is_archived": getattr(cc, "is_archived", False),
        "created_at": cc.created_at,
        "creator_name": creator_user.full_name if creator_user else None,
        "creator_email": creator_user.email if creator_user else None,
        "campaign_title": camp.title if camp else None,
    }


def sponsorship_to_dict(s: Sponsorship) -> dict:
    brand = getattr(s, "brand", None)
    creator = getattr(s, "creator", None)
    camp = getattr(s, "campaign", None)
    return {
        "id": s.id, "brand_id": s.brand_id, "campaign_id": s.campaign_id,
        "creator_id": s.creator_id, "amount": s.amount,
        "payment_status": s.payment_status, "contract_status": s.contract_status,
        "payment_due_date": s.payment_due_date, "payment_date": s.payment_date,
        "deliverable_summary": s.deliverable_summary, "notes": s.notes,
        "is_demo": s.is_demo, "is_archived": getattr(s, "is_archived", False),
        "created_at": s.created_at,
        "brand_name": brand.name if brand else None,
        "creator_name": creator.full_name if creator else None,
        "campaign_title": camp.title if camp else None,
    }


def campaign_performance_to_dict(cp: CampaignPerformance) -> dict:
    eng_rate = engagement_rate(cp.engagements, 0, 0, 0, cp.reach) if cp.reach > 0 else 0.0
    conv_rate = round((cp.conversions / max(1, cp.clicks)) * 100, 2) if cp.clicks > 0 else 0.0
    ctr = round((cp.clicks / max(1, cp.impressions)) * 100, 2) if cp.impressions > 0 else 0.0
    creator = getattr(cp, "creator", None)
    camp = getattr(cp, "campaign", None)
    return {
        "id": cp.id, "campaign_id": cp.campaign_id, "creator_id": cp.creator_id,
        "impressions": cp.impressions, "reach": cp.reach, "engagements": cp.engagements,
        "clicks": cp.clicks, "conversions": cp.conversions, "revenue": cp.revenue,
        "reporting_date": cp.reporting_date, "data_source": cp.data_source,
        "is_demo": cp.is_demo, "is_archived": getattr(cp, "is_archived", False),
        "created_at": cp.created_at,
        "engagement_rate": eng_rate, "conversion_rate": conv_rate,
        "click_through_rate": ctr,
        "creator_name": creator.full_name if creator else None,
        "campaign_title": camp.title if camp else None,
    }


def revenue_to_dict(r: RevenueRecord) -> dict:
    return {
        "id": r.id, "user_id": r.user_id, "source": r.source, "amount": r.amount,
        "platform": r.platform, "date": r.date, "notes": r.notes,
        "is_demo": r.is_demo, "created_at": r.created_at,
    }


def hashtag_to_dict(h: HashtagMetric) -> dict:
    return {
        "id": h.id, "user_id": h.user_id, "tag": h.tag, "platform": h.platform,
        "post_count": h.post_count, "total_reach": h.total_reach,
        "avg_engagement": h.avg_engagement, "is_demo": h.is_demo, "created_at": h.created_at,
    }


def notification_to_dict(n: Notification) -> dict:
    return {
        "id": n.id, "user_id": n.user_id, "title": n.title, "message": n.message,
        "category": n.category, "is_read": n.is_read, "is_demo": n.is_demo, "created_at": n.created_at,
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
    for m in (ContentRecord, FollowerGrowth, AudienceMetric, Campaign, RevenueRecord, HashtagMetric, Notification):
        db.query(m).filter(m.user_id == user_id, m.is_demo.is_(True)).delete()


_REVENUE_TEMPLATES = [
    ("sponsorships", "Nike Athletics - Summer Speed Campaign Integration", 3500.0, "instagram"),
    ("sponsorships", "Sony Audio - Wireless Earbuds Long-Form Dedicated Review", 4200.0, "youtube"),
    ("sponsorships", "Skillshare - Creator Workflow Mid-roll Sponsorship", 2800.0, "youtube"),
    ("sponsorships", "Logitech Tech - Desk Setup Sponsored Carousel", 1600.0, "instagram"),
    ("ad_revenue", "YouTube AdSense Monthly Monetization Payout", 2150.0, "youtube"),
    ("ad_revenue", "Meta Creator Bonus & Reels Play Payout", 480.0, "instagram"),
    ("ad_revenue", "TikTok Creator Rewards Program Payout", 620.0, "tiktok"),
    ("ad_revenue", "Facebook In-Stream Ads Earnings", 290.0, "facebook"),
    ("affiliate", "Amazon Associates - Creator Studio & Gear Links", 540.0, "youtube"),
    ("affiliate", "Notion & SaaS Productivity Referral Commission", 410.0, "x"),
    ("affiliate", "Camera Equipment Storefront Affiliate", 360.0, "youtube"),
    ("brand_collaborations", "Gymshark Fitness Apparel Seasonal Ambassador Collaboration", 3200.0, "tiktok"),
    ("brand_collaborations", "Spotify Sound Podcast & Playlist Co-Promotion", 1500.0, "youtube"),
    ("brand_collaborations", "Figma Design Creator Co-Marketing Series", 2100.0, "linkedin"),
    ("subscriptions", "YouTube Channel Memberships & SuperThanks Tiers", 850.0, "youtube"),
    ("subscriptions", "Patreon Community Monthly Membership Support", 1250.0, "youtube"),
    ("subscriptions", "Substack Newsletter Premium Tier", 380.0, "linkedin"),
]

_HASHTAG_TEMPLATES = [
    ("#contentcreator", "instagram", 22, 54000, 8.4),
    ("#techreview", "youtube", 16, 125000, 9.8),
    ("#creatoreconomy", "linkedin", 10, 32000, 6.7),
    ("#viralvideo", "tiktok", 28, 210000, 12.1),
    ("#behindthescenes", "instagram", 18, 48000, 8.9),
    ("#softwaretips", "x", 14, 39000, 6.2),
    ("#youtubegrowth", "youtube", 12, 94000, 9.1),
    ("#fitnesschallenge", "tiktok", 20, 165000, 11.0),
    ("#marketingstrategy", "linkedin", 8, 24000, 5.8),
    ("#buildinpublic", "x", 19, 58000, 7.3),
    ("#aiworkflow", "x", 11, 47000, 8.2),
    ("#cameragear", "youtube", 9, 78000, 7.9),
]

_NOTIFICATION_TEMPLATES = [
    ("Performance Spike Detected", "Your recent post 'Gear I actually use in 2026' achieved a 38% higher engagement rate than your 30-day average.", "performance", False),
    ("Revenue Milestone Crossed", "Total monthly sponsorship revenue surpassed $5,000 across connected channels.", "revenue", False),
    ("Audience Surge on TikTok", "Your TikTok profile gained over 1,200 new followers following your latest viral short.", "engagement", True),
    ("Scheduled Synchronization Complete", "Latest platform metrics and audience engagement data synced successfully.", "system", True),
    ("Campaign Budget Alert", "The Nike Summer Footwear campaign has utilized 72% of its allocated budget with strong reach ROI.", "performance", True),
    ("High Engagement on YouTube", "Watch time for '5 editing tricks I wish I knew sooner' is trending 45% above average.", "performance", False),
]


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
                              geo_distribution=_split(rng, _GEO),
                              device_distribution=_split(rng, ["Mobile", "Desktop", "Tablet"], 0.75),
                              active_hours=hours))
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

    # demo revenue records (covering all 5 revenue sources across recent dates)
    for idx, (source, notes, base_amt, platform) in enumerate(_REVENUE_TEMPLATES):
        tx_date = today - timedelta(days=int(idx * (days / len(_REVENUE_TEMPLATES))) + rng.randint(0, 3))
        # Add slight natural variance
        amount = round(base_amt * rng.uniform(0.85, 1.25), 2)
        db.add(RevenueRecord(
            user_id=user_id,
            source=source,
            amount=amount,
            platform=platform,
            date=tx_date,
            notes=notes,
            is_demo=True,
        ))

    # demo hashtags
    for tag, platform, p_count, reach_base, eng_base in _HASHTAG_TEMPLATES:
        db.add(HashtagMetric(
            user_id=user_id,
            tag=tag,
            platform=platform,
            post_count=int(p_count * rng.uniform(0.8, 1.3)),
            total_reach=int(reach_base * rng.uniform(0.85, 1.2)),
            avg_engagement=round(eng_base * rng.uniform(0.9, 1.15), 2),
            is_demo=True,
        ))

    # demo notifications
    for title, msg, category, is_read in _NOTIFICATION_TEMPLATES:
        db.add(Notification(
            user_id=user_id,
            title=title,
            message=msg,
            category=category,
            is_read=is_read,
            is_demo=True,
        ))


def calculate_reach_prediction(
    db: Session,
    user_id: int,
    platform: str,
    content_type: str = "post",
    hashtags: str | None = None,
    caption: str | None = None,
    planned_hour: int | None = None
) -> dict:
    """
    Statistical Reach Prediction Engine (Module 4):
    Predicts expected reach, reach boundaries, and engagement potential based on:
    - Creator's historical platform reach and engagement baseline
    - Content format multipliers (Reels/Shorts, Video, Carousel, Post)
    - Hashtag velocity and historical reach contribution
    - Audience active hours alignment
    - Caption length and optimization heuristics
    """
    import re
    # 1. Historical Baseline
    posts = db.query(ContentRecord).filter(
        ContentRecord.user_id == user_id,
        ContentRecord.platform == platform
    ).all()

    if not posts:
        # Cross-platform fallback for new platform
        posts = db.query(ContentRecord).filter(ContentRecord.user_id == user_id).all()

    if posts:
        sample_count = len(posts)
        avg_reach = max(500, sum(p.reach for p in posts) / sample_count)
        avg_eng_rate = max(1.5, sum(engagement_rate(p.likes, p.comments, p.shares, p.saves, p.reach) for p in posts) / sample_count)
    else:
        sample_count = 0
        avg_reach = 4500.0
        avg_eng_rate = 5.2

    # 2. Content Type Multipliers
    type_multipliers = {
        "reel": 1.45,
        "short": 1.45,
        "video": 1.25,
        "carousel": 1.15,
        "post": 1.0,
        "story": 0.65,
    }
    type_mult = type_multipliers.get(content_type.lower(), 1.0)

    # 3. Hashtags Extraction & Impact
    extracted_tags = set()
    if hashtags:
        for t in re.split(r"[,\s]+", hashtags.strip()):
            cleaned = t.strip()
            if cleaned:
                if not cleaned.startswith("#"):
                    cleaned = f"#{cleaned}"
                extracted_tags.add(cleaned.lower())
    if caption:
        for t in re.findall(r"#\w+", caption):
            extracted_tags.add(t.lower())

    hashtag_impacts = []
    hashtag_mult = 1.0
    recommendations = []

    if extracted_tags:
        for tag in extracted_tags:
            rec = db.query(HashtagMetric).filter(
                HashtagMetric.user_id == user_id,
                HashtagMetric.tag.ilike(tag)
            ).first()
            if rec and rec.total_reach > 0:
                boost = min(25.0, round((rec.total_reach / max(1, rec.post_count * 5000)) * 12.0, 1))
                hist_reach = rec.total_reach
            else:
                boost = 5.0
                hist_reach = int(avg_reach * 0.4)

            hashtag_impacts.append({
                "tag": tag,
                "reach_boost_pct": boost,
                "historical_reach": hist_reach
            })
            hashtag_mult += (boost / 100.0)

        hashtag_mult = min(1.75, hashtag_mult)
    else:
        recommendations.append("Adding 3 to 5 targeted niche hashtags can increase expected reach by up to 25%.")

    # 4. Audience Active Hours Alignment
    aud = db.query(AudienceMetric).filter(
        AudienceMetric.user_id == user_id,
        AudienceMetric.platform == platform
    ).first()

    active_hours = aud.active_hours if aud and aud.active_hours and len(aud.active_hours) == 24 else [
        15, 10, 8, 5, 4, 8, 15, 30, 50, 65, 75, 80, 85, 80, 78, 82, 88, 95, 92, 85, 70, 55, 35, 20
    ]
    best_hour = int(max(range(24), key=lambda h: active_hours[h]))
    best_score = float(active_hours[best_hour])
    mean_score = sum(active_hours) / 24.0

    if planned_hour is not None:
        hour_score = float(active_hours[planned_hour % 24])
        timing_mult = 1.0 + ((hour_score - mean_score) / max(1.0, mean_score)) * 0.25
        if planned_hour != best_hour:
            recommendations.append(f"Consider rescheduling to {best_hour}:00 for peak audience availability (+{round(((best_score - hour_score)/max(1.0, hour_score))*100, 1)}% activity boost).")
    else:
        timing_mult = 1.05
        recommendations.append(f"Optimal posting time is {best_hour}:00 based on your historical audience active hours.")

    best_boost_pct = round(((best_score - mean_score) / max(1.0, mean_score)) * 25.0, 1)

    # 5. Caption Length Optimization
    cap_len = len(caption.strip()) if caption else 0
    if 40 <= cap_len <= 250:
        caption_mult = 1.08
    elif cap_len < 20:
        caption_mult = 0.95
        recommendations.append("Expanding caption length beyond 40 characters encourages algorithmic dwell time and saves.")
    else:
        caption_mult = 1.0

    if content_type in ("reel", "short"):
        recommendations.append(f"Short-form video ({content_type}) benefits from +45% algorithmic discovery on {platform.title()}.")

    # 6. Aggregated Forecast
    expected_reach = int(avg_reach * type_mult * hashtag_mult * timing_mult * caption_mult)
    min_reach = int(expected_reach * 0.65)
    max_reach = int(expected_reach * 1.80)
    pred_eng = max(1, int(expected_reach * (avg_eng_rate / 100.0)))
    conf_score = min(0.95, round(0.40 + (min(sample_count, 30) / 30.0) * 0.55, 2))

    return {
        "platform": platform,
        "content_type": content_type,
        "expected_reach": expected_reach,
        "min_reach": min_reach,
        "max_reach": max_reach,
        "predicted_engagement": pred_eng,
        "predicted_engagement_rate": round(avg_eng_rate, 2),
        "hashtag_impact": hashtag_impacts,
        "optimal_posting_window": {
            "best_hour": best_hour,
            "activity_score": best_score,
            "expected_boost_pct": best_boost_pct
        },
        "confidence_score": conf_score,
        "recommendations": recommendations[:4],
    }
