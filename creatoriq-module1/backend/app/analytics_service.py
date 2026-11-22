"""Analytics logic. Pure Python: takes plain objects/dicts, returns plain dicts."""
import random
import re
from datetime import date, datetime, timedelta
from typing import Optional

PLATFORMS = ["YouTube", "Instagram", "TikTok", "X"]
HISTORY_DAYS = 180
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ------------------------------------------------------------------
# 1) DEMO DATA GENERATOR (stands in for real social-media APIs)
# ------------------------------------------------------------------
def _slug(text: str, fallback: str) -> str:
    return re.sub(r"[^a-z0-9]+", ".", (text or "").lower()).strip(".")[:20] or fallback


def _split_100(rng, n):
    """n random percentages that add up to 100."""
    w = [rng.uniform(0.5, 3.0) for _ in range(n)]
    vals = [round(x / sum(w) * 100) for x in w]
    vals[vals.index(max(vals))] += 100 - sum(vals)
    return vals


TOPICS = ["video editing", "morning routines", "budget travel", "healthy cooking", "study tips", "home workouts",
          "phone photography", "personal finance", "gaming setups", "fashion hauls", "AI tools", "daily vlogging"]
FORMATS = ["How I Learned {}", "5 Tips for {}", "Behind the Scenes of {}", "My Honest Take on {}",
           "Beginner's Guide to {}", "Mistakes to Avoid in {}", "{} in 10 Minutes", "Everything About {}"]
COUNTRIES = ["India", "United States", "United Kingdom", "UAE", "Canada", "Australia", "Singapore", "Germany"]


def generate_demo_data(user_id: int, name: str = "", today: Optional[date] = None) -> dict:
    """Demo data that is DIFFERENT for every user (seeded by the user id)."""
    today = today or date.today()
    rng = random.Random(user_id * 7919 + 13)
    handle = _slug(name, "creator" + str(user_id))

    # every platform gets its own size, growth speed and activity level for this user
    base_cfg = {"YouTube": (36000, 8500, "@{}.yt"), "Instagram": (45000, 6000, "@{}"),
                "TikTok": (10000, 7000, "@{}.tt"), "X": (7500, 1500, "@{}_x")}
    cfg = {}
    for platform, (f_base, v_base, fmt) in base_cfg.items():
        size = rng.uniform(0.3, 2.4)
        f1 = int(f_base * size)
        cfg[platform] = (int(f1 / (1 + rng.uniform(0.08, 0.45))), f1, int(v_base * size * rng.uniform(0.6, 1.5)), fmt.format(handle))

    weekday_factor = [0.9, 0.95, 1.0, 1.05, 1.25, 1.2, 0.95]
    rng.shuffle(weekday_factor)
    accounts, metrics = [], []
    for platform, (f0, f1, base, h) in cfg.items():
        accounts.append(dict(platform=platform, handle=h, connected=True))
        for i in range(HISTORY_DAYS):
            d = today - timedelta(days=HISTORY_DAYS - 1 - i)
            t = i / (HISTORY_DAYS - 1)
            views = int(base * (1 + 0.5 * t) * weekday_factor[d.weekday()] * rng.uniform(0.8, 1.2))
            metrics.append(dict(
                platform=platform, date=d,
                followers=int(f0 + (f1 - f0) * t + rng.uniform(-0.002, 0.002) * f1),
                views=views,
                likes=int(views * rng.uniform(0.04, 0.10)),
                comments=int(views * rng.uniform(0.005, 0.014)),
                shares=int(views * rng.uniform(0.003, 0.010)),
            ))

    posts, used = [], set()
    while len(posts) < 32:
        title = rng.choice(FORMATS).format(rng.choice(TOPICS))
        if title in used and len(used) < 80:
            continue
        used.add(title)
        platform = PLATFORMS[len(posts) % len(PLATFORMS)]
        views = int(rng.uniform(5000, 140000) * cfg[platform][1] / 40000 + 3000)
        posts.append(dict(
            platform=platform, title=title, post_type=rng.choice(["Video", "Reel", "Short", "Post"]), views=views,
            likes=int(views * rng.uniform(0.04, 0.10)), comments=int(views * rng.uniform(0.004, 0.012)),
            shares=int(views * rng.uniform(0.003, 0.009)), published_at=today - timedelta(days=rng.randint(1, 85)),
        ))

    audience = []
    for category, labels in {
        "age": ["13-17", "18-24", "25-34", "35-44", "45+"],
        "gender": ["Female", "Male", "Other"],
        "location": rng.sample(COUNTRIES, 4) + ["Other"],
        "device": ["Mobile", "Desktop", "Tablet"],
    }.items():
        for label, v in zip(labels, _split_100(rng, len(labels))):
            audience.append(dict(category=category, label=label, value=float(v)))

    revenue = []
    scale = rng.uniform(0.4, 2.5)
    base_rev = {"Sponsorships": 1500, "Ad Revenue": 1100, "Affiliate": 520, "Brand Collabs": 380, "Subscriptions": 210}
    mix = {k: rng.uniform(0.3, 1.8) for k in base_rev}
    for back in range(5, -1, -1):
        y, m = today.year, today.month - back
        while m <= 0:
            m += 12; y -= 1
        for source, amt in base_rev.items():
            revenue.append(dict(month=date(y, m, 1), source=source,
                                amount=round(amt * scale * mix[source] * (1 + 0.07 * (5 - back)) * rng.uniform(0.9, 1.1), 2)))

    return dict(accounts=accounts, metrics=metrics, posts=posts, audience=audience, revenue=revenue)


# ------------------------------------------------------------------
# 2) DASHBOARD AGGREGATION
# ------------------------------------------------------------------
def _pct(cur, prev):
    return round((cur - prev) / prev * 100, 1) if prev else None


def _engagement(likes, comments, shares, views):
    return round((likes + comments + shares) / views * 100, 2) if views else 0.0


def build_dashboard(metrics, posts, audience, revenue, accounts, days: int, platform: str) -> dict:
    """Each argument is a list of objects with attributes (ORM rows or SimpleNamespace)."""
    if not metrics:
        return {"has_data": False}

    chosen = PLATFORMS if platform == "all" else [platform]
    rows = [m for m in metrics if m.platform in chosen]
    last = max(m.date for m in metrics)
    start = last - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)

    cur = [m for m in rows if start <= m.date <= last]
    prev = [m for m in rows if prev_start <= m.date < start]

    def total(rs, field): return sum(getattr(r, field) for r in rs)

    followers_now = sum(m.followers for m in rows if m.date == last)
    followers_start = sum(m.followers for m in rows if m.date == start)

    sums = {f: total(cur, f) for f in ("views", "likes", "comments", "shares")}
    prev_sums = {f: total(prev, f) for f in ("views", "likes", "comments", "shares")}
    eng = _engagement(sums["likes"], sums["comments"], sums["shares"], sums["views"])
    prev_eng = _engagement(prev_sums["likes"], prev_sums["comments"], prev_sums["shares"], prev_sums["views"])

    kpis = {
        "followers": {"value": followers_now, "delta": _pct(followers_now, followers_start)},
        **{f: {"value": sums[f], "delta": _pct(sums[f], prev_sums[f])} for f in sums},
        "engagement_rate": {"value": eng, "delta": round(eng - prev_eng, 2) if prev_sums["views"] else None},
    }

    # follower growth (one line per platform)
    dates = [start + timedelta(days=i) for i in range(days)]
    by_key = {(m.platform, m.date): m.followers for m in rows}
    series = {p: [by_key.get((p, d)) for d in dates] for p in chosen}
    total_line = [sum(series[p][i] or 0 for p in chosen) for i in range(days)]

    # content performance by weekday
    by_weekday = {f: [0] * 7 for f in ("views", "likes", "comments", "shares")}
    for m in cur:
        for f in by_weekday:
            by_weekday[f][m.date.weekday()] += getattr(m, f)

    # top posts
    in_range = [p for p in posts if p.platform in chosen and p.published_at >= start]
    top_posts = [{
        "title": p.title, "platform": p.platform, "type": p.post_type, "views": p.views,
        "likes": p.likes, "comments": p.comments, "shares": p.shares,
        "engagement": _engagement(p.likes, p.comments, p.shares, p.views),
        "published": p.published_at.isoformat(),
    } for p in sorted(in_range, key=lambda p: p.views, reverse=True)[:5]]

    # audience
    aud = {}
    for a in audience:
        aud.setdefault(a.category, []).append({"label": a.label, "value": a.value})

    # revenue (latest month vs previous month)
    months = sorted({r.month for r in revenue})
    rev = None
    if months:
        latest = months[-1]
        latest_rows = [r for r in revenue if r.month == latest]
        total_latest = sum(r.amount for r in latest_rows)
        total_prev = sum(r.amount for r in revenue if len(months) > 1 and r.month == months[-2])
        rev = {
            "month": latest.isoformat(), "total": round(total_latest, 2),
            "delta": _pct(total_latest, total_prev),
            "sources": sorted([{"source": r.source, "amount": round(r.amount, 2)} for r in latest_rows],
                              key=lambda x: x["amount"], reverse=True),
            "trend": [{"month": mth.isoformat(), "total": round(sum(r.amount for r in revenue if r.month == mth), 2)} for mth in months],
        }

    # connected accounts (always all platforms, not filtered)
    latest_followers = {m.platform: m.followers for m in metrics if m.date == last}
    acc = [{"platform": a.platform, "handle": a.handle, "connected": a.connected,
            "followers": latest_followers.get(a.platform, 0)} for a in accounts]

    return {
        "has_data": True, "days": days, "platform": platform,
        "range": {"start": start.isoformat(), "end": last.isoformat()},
        "kpis": kpis,
        "follower_growth": {"labels": [d.isoformat() for d in dates], "series": series, "total": total_line},
        "content_performance": {"labels": WEEKDAYS, **by_weekday},
        "top_posts": top_posts,
        "audience": aud,
        "revenue": rev,
        "accounts": acc,
    }


# ------------------------------------------------------------------
# 3) AGENCY dashboard
# ------------------------------------------------------------------
AGENCY_POOL = [
    ("Aarav Travels", "Travel", "YouTube"), ("Meera Makes", "DIY & Crafts", "Instagram"), ("FitWithKavya", "Fitness", "Instagram"),
    ("Techie Rohan", "Technology", "YouTube"), ("Spice Stories", "Food", "TikTok"), ("Study With Isha", "Education", "YouTube"),
    ("Style by Nisha", "Fashion", "Instagram"), ("Gamer Dev", "Gaming", "TikTok"), ("Finance Fridays", "Finance", "YouTube"),
    ("Pixel Priya", "Photography", "Instagram"), ("Yoga with Anu", "Wellness", "YouTube"), ("Desi Doodles", "Art", "Instagram"),
    ("Cricket Corner", "Sports", "X"), ("Code with Karan", "Programming", "YouTube"), ("Beauty by Sana", "Beauty", "Instagram"),
    ("Daily Dose Tarun", "Comedy", "TikTok"), ("Book Nook Rhea", "Books", "Instagram"), ("Auto Arjun", "Cars", "YouTube"),
    ("Pet Pals Maya", "Pets", "TikTok"), ("Startup Sid", "Business", "X"), ("Home Chef Lata", "Food", "YouTube"),
    ("Trek with Vik", "Adventure", "Instagram"), ("Music by Neel", "Music", "YouTube"), ("Mom Life Divya", "Parenting", "Instagram"),
]


def generate_agency_demo(user_id: int) -> list:
    """Each agency manages a different set of creators with different numbers."""
    rng = random.Random(user_id * 31 + 7)
    out = []
    for name, niche, platform in rng.sample(AGENCY_POOL, rng.randint(6, 9)):
        followers = int(10 ** rng.uniform(4.4, 5.6))
        out.append(dict(
            name=name, handle="@" + _slug(name, "creator"), platform=rng.choice([platform, platform, platform, rng.choice(PLATFORMS)]),
            niche=niche, followers=followers, prev_followers=int(followers / (1 + rng.uniform(0.01, 0.10))),
            views_30d=int(followers * rng.uniform(1.2, 4.5)), engagement_rate=round(rng.uniform(2.8, 10.5), 1),
            monthly_revenue=round(followers * rng.uniform(0.006, 0.022), 2),
        ))
    return out


def build_agency_dashboard(creators) -> dict:
    if not creators:
        return {"has_data": False}
    total_f = sum(c.followers for c in creators)
    prev_f = sum(c.prev_followers for c in creators)
    total_rev = sum(c.monthly_revenue for c in creators)
    by_platform = {}
    for c in creators:
        by_platform[c.platform] = by_platform.get(c.platform, 0) + c.followers
    ordered = sorted(creators, key=lambda c: c.followers, reverse=True)
    return {
        "has_data": True,
        "kpis": {
            "creators": len(creators),
            "followers": total_f, "followers_delta": _pct(total_f, prev_f),
            "views": sum(c.views_30d for c in creators),
            "engagement": round(sum(c.engagement_rate for c in creators) / len(creators), 1),
            "revenue": round(total_rev, 2),
        },
        "creators": [{
            "name": c.name, "handle": c.handle, "platform": c.platform, "niche": c.niche,
            "followers": c.followers, "growth": _pct(c.followers, c.prev_followers),
            "engagement": c.engagement_rate, "revenue": round(c.monthly_revenue, 2),
        } for c in ordered],
        "by_platform": [{"label": k, "value": v} for k, v in sorted(by_platform.items(), key=lambda x: -x[1])],
        "revenue_share": [{"label": c.name, "value": round(c.monthly_revenue, 2)} for c in ordered],
    }


# ------------------------------------------------------------------
# 4) MARKETING TEAM dashboard
# ------------------------------------------------------------------
CAMPAIGN_POOL = [
    "Diwali Sale Teaser", "Back to Campus Push", "Product Launch Reels", "Creator Collab Series", "Winter Collection Ads",
    "App Install Boost", "Brand Awareness Q4", "Summer Splash Giveaway", "New Year Countdown", "Loyalty Rewards Push",
    "Webinar Registration Drive", "Festival Mega Offer", "Influencer Takeover Week", "Free Trial Promo", "Customer Stories Series",
    "Black Friday Early Access",
]


def generate_marketing_demo(user_id: int) -> list:
    """Each marketing user gets a different set of campaigns and numbers."""
    rng = random.Random(user_id * 53 + 11)
    out = []
    for name in rng.sample(CAMPAIGN_POOL, rng.randint(6, 8)):
        status = rng.choice(["Active", "Active", "Active", "Paused", "Completed"])
        budget = float(rng.choice([1500, 2000, 2500, 3500, 4500, 5500, 7000, 9000]))
        spend = round(budget * (rng.uniform(0.93, 1.0) if status == "Completed" else rng.uniform(0.35, 0.9)), 2)
        reach = int(spend * rng.uniform(35, 95))
        clicks = int(reach * rng.uniform(0.015, 0.065))
        out.append(dict(name=name, platform=rng.choice(PLATFORMS), status=status, budget=budget, spend=spend,
                        reach=reach, clicks=clicks, conversions=int(clicks * rng.uniform(0.03, 0.13))))
    return out


def build_marketing_dashboard(campaigns) -> dict:
    if not campaigns:
        return {"has_data": False}
    reach = sum(c.reach for c in campaigns)
    clicks = sum(c.clicks for c in campaigns)
    spend = sum(c.spend for c in campaigns)
    by_platform = {}
    for c in campaigns:
        by_platform[c.platform] = by_platform.get(c.platform, 0) + c.reach
    return {
        "has_data": True,
        "kpis": {
            "campaigns": len(campaigns), "active": sum(1 for c in campaigns if c.status == "Active"),
            "budget": round(sum(c.budget for c in campaigns), 2), "spend": round(spend, 2),
            "reach": reach, "clicks": clicks, "conversions": sum(c.conversions for c in campaigns),
            "ctr": round(clicks / reach * 100, 2) if reach else 0.0,
            "cpc": round(spend / clicks, 2) if clicks else 0.0,
        },
        "campaigns": [{
            "name": c.name, "platform": c.platform, "status": c.status, "budget": c.budget, "spend": c.spend,
            "reach": c.reach, "clicks": c.clicks, "conversions": c.conversions,
            "ctr": round(c.clicks / c.reach * 100, 2) if c.reach else 0.0,
        } for c in campaigns],
        "by_platform": [{"label": k, "value": v} for k, v in sorted(by_platform.items(), key=lambda x: -x[1])],
    }


# ------------------------------------------------------------------
# 5) ADMIN overview (REAL data from the users table)
# ------------------------------------------------------------------
ROLE_LABELS = {"creator": "Creators", "agency": "Agencies", "marketing_team": "Marketing Teams", "admin": "Administrators"}


def build_admin_overview(users, creators_with_data: int = 0, top_creators=None, today: Optional[date] = None) -> dict:
    today = today or datetime.utcnow().date()
    counts = {k: 0 for k in ROLE_LABELS}
    for u in users:
        counts[u.role.name] = counts.get(u.role.name, 0) + 1

    days = [today - timedelta(days=29 - i) for i in range(30)]
    reg = {d: 0 for d in days}
    new_7d = 0
    for u in users:
        d = u.created_at.date() if u.created_at else None
        if d in reg:
            reg[d] += 1
        if d and d >= today - timedelta(days=6):
            new_7d += 1

    recent = sorted(users, key=lambda u: u.created_at or datetime.min, reverse=True)[:10]
    return {
        "kpis": {
            "total": len(users), "creators": counts["creator"], "agencies": counts["agency"],
            "marketing": counts["marketing_team"], "admins": counts["admin"],
            "new_7d": new_7d, "active": sum(1 for u in users if u.is_active),
            "creators_with_data": creators_with_data,
        },
        "by_role": [{"label": ROLE_LABELS[k], "value": v} for k, v in counts.items()],
        "top_creators": top_creators or [],
        "registrations": {"labels": [d.isoformat() for d in days], "values": [reg[d] for d in days]},
        "recent_users": [{
            "id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role.name,
            "joined": u.created_at.date().isoformat() if u.created_at else None, "is_active": u.is_active,
        } for u in recent],
    }