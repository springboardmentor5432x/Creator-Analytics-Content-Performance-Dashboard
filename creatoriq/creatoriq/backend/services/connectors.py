"""
Social-media connectors + ingestion pipeline.

In production each connector would call YouTube Data API, Instagram Graph API, TikTok API ...
Here every platform is simulated by a realistic data generator so the whole workflow
(connect -> collect -> validate -> store -> analyse -> alert) runs offline with zero API keys.
"""
import json, random
from datetime import datetime, timedelta, date

from ..database import q, q1
from .analytics import daterange

PROFILES = {  # followers, avg views/follower, post types, avg watch seconds, monetisation weight
    "YouTube":   dict(base=48000, vpf=0.55, types=["Video", "Short", "Live"], watch=240, ads=1.0),
    "Instagram": dict(base=36000, vpf=0.40, types=["Reel", "Post", "Story", "Carousel"], watch=18, ads=0.3),
    "TikTok":    dict(base=61000, vpf=0.90, types=["Video", "Duet"], watch=14, ads=0.25),
    "Facebook":  dict(base=18000, vpf=0.22, types=["Post", "Video", "Reel"], watch=30, ads=0.35),
    "X":         dict(base=22000, vpf=0.30, types=["Tweet", "Thread"], watch=3, ads=0.1),
    "LinkedIn":  dict(base=9000,  vpf=0.35, types=["Article", "Post", "Video"], watch=20, ads=0.05),
}
HASHTAGS = ["#python", "#coding", "#aitools", "#productivity", "#studytips", "#techreview", "#shorts",
            "#reels", "#viral", "#tutorial", "#careertips", "#webdev", "#datascience", "#gadgets",
            "#motivation", "#lifehacks", "#startup", "#design"]
TITLE_A = ["5 Ways to", "How I", "Stop Doing This When You", "The Truth About", "Beginner's Guide to",
           "I Tried", "Why Nobody Talks About", "Ultimate Guide:", "Behind the Scenes of", "Quick Tips for"]
TITLE_B = ["Grow Faster Online", "Build a Side Project", "Edit Videos in Minutes", "Use AI Every Day",
           "Learn Python Quickly", "Plan Content Weekly", "Boost Engagement", "Go Viral in 30 Days",
           "Set Up a Creator Studio", "Earn From Content", "Master Short-Form Video"]
BRANDS = ["Nova Gadgets", "PixelForge", "LearnLoop", "FitFuel", "CloudNest", "UrbanThreads", "BrewBox", "CodeCamp"]
EXTRA_PLATFORMS = ["Facebook", "X", "LinkedIn"]


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


def _post(user_id, platform, day, followers, rng):
    p = PROFILES[platform]
    hour = rng.choices([7, 9, 12, 15, 18, 19, 20, 21, 22], weights=[2, 3, 3, 3, 6, 8, 9, 7, 3])[0]
    viral = 4.0 if rng.random() < 0.06 else 1.0
    views = int(followers * p["vpf"] * rng.uniform(0.25, 1.4) * viral)
    likes = int(views * rng.uniform(0.03, 0.10))
    ptype = rng.choice(p["types"])
    tags = " ".join(rng.sample(HASHTAGS, rng.randint(2, 4)))
    return (user_id, platform, f"{rng.choice(TITLE_A)} {rng.choice(TITLE_B)}", ptype, tags,
            f"{day.isoformat()} {hour:02d}:{rng.choice(['00', '15', '30', '45'])}",
            views, likes, int(likes * rng.uniform(0.04, 0.12)), int(likes * rng.uniform(0.05, 0.25)),
            int(likes * rng.uniform(0.05, 0.35)), round(views * p["watch"] * rng.uniform(0.3, 0.7) / 3600, 1),
            int(views * rng.uniform(0.7, 0.95)))


def _seed_demographics(conn, uid, rng):
    if conn.execute("SELECT 1 FROM audience_demo WHERE user_id=? LIMIT 1", (uid,)).fetchone():
        return

    def dist(category, labels, weights):
        w = [x * rng.uniform(0.7, 1.3) for x in weights]
        t = sum(w)
        for label, x in zip(labels, w):
            conn.execute("INSERT INTO audience_demo(user_id,category,label,value) VALUES(?,?,?,?)",
                         (uid, category, label, round(x / t * 100, 1)))
    dist("age", ["13-17", "18-24", "25-34", "35-44", "45+"], [8, 38, 32, 14, 8])
    dist("gender", ["Male", "Female", "Other"], [52, 45, 3])
    dist("country", ["India", "United States", "United Kingdom", "Canada", "Germany", "Other"], [38, 22, 9, 6, 5, 20])
    dist("device", ["Mobile", "Desktop", "Tablet", "Smart TV"], [68, 22, 6, 4])
    dist("hour", [f"{h:02d}" for h in range(24)],
         [1, .6, .4, .3, .3, .6, 1.2, 2.2, 3, 3.2, 3.4, 3.8, 4.4, 4, 3.6, 3.8, 4.4, 5.4, 7, 8.6, 9, 7.6, 4.6, 2.2])


def _revenue(conn, uid, platform, day, followers, rng):
    p = PROFILES[platform]
    rows = []
    if day.weekday() == 0:  # weekly ad payout
        amt = round(followers * p["ads"] * rng.uniform(0.004, 0.012) * 7, 2)
        if amt > 3:
            rows.append(("Ad Revenue", platform, "", amt, "Paid"))
    if day.day == 1:
        rows.append(("Subscription", platform, "", round(followers * rng.uniform(0.002, 0.006), 2), "Paid"))
        rows.append(("Affiliate", platform, rng.choice(["Amazon", "Notion", "Skillshare"]),
                     round(rng.uniform(80, 520), 2), "Paid"))
    if rng.random() < 0.04:
        src = rng.choice(["Sponsorship", "Brand Collaboration"])
        age = (date.today() - day).days
        rows.append((src, platform, rng.choice(BRANDS), round(followers * rng.uniform(0.02, 0.06) + 300, 2),
                     "Paid" if age > 25 else rng.choice(["Pending", "Paid"])))
    for src, plat, brand, amt, status in rows:
        conn.execute("INSERT INTO revenue(user_id,source,platform,brand,amount,date,status) VALUES(?,?,?,?,?,?,?)",
                     (uid, src, plat, brand, amt, day.isoformat(), status))


def notify(conn, uid, kind, title, message=""):
    if conn.execute("SELECT 1 FROM notifications WHERE user_id=? AND title=? AND message=?", (uid, title, message)).fetchone():
        return
    conn.execute("INSERT INTO notifications(user_id,kind,title,message) VALUES(?,?,?,?)", (uid, kind, title, message))


def sync_account(conn, acc, backfill=90):
    """Collect -> validate -> transform -> store for one connected account."""
    uid, platform = acc["user_id"], acc["platform"]
    rng = random.Random()
    last = q1(conn, "SELECT date, followers FROM audience_daily WHERE user_id=? AND platform=? ORDER BY date DESC LIMIT 1",
              (uid, platform))
    today = date.today()
    if last:
        start = date.fromisoformat(last["date"]) + timedelta(days=1)
        followers = last["followers"]
    else:
        start = today - timedelta(days=backfill)
        followers = int(PROFILES[platform]["base"] * random.Random(f"{uid}{platform}").uniform(0.5, 1.6))
    new_posts = 0
    for day in daterange(start, today):
        growth = rng.gauss(0.0018, 0.0012) * (1.8 if rng.random() < 0.05 else 1)
        followers = max(100, int(followers * (1 + growth)) + rng.randint(-8, 40))
        imp = int(followers * rng.uniform(0.35, 0.9))
        conn.execute("INSERT OR REPLACE INTO audience_daily(user_id,platform,date,followers,impressions,reach) VALUES(?,?,?,?,?,?)",
                     (uid, platform, day.isoformat(), followers, imp, int(imp * rng.uniform(0.6, 0.88))))
        if rng.random() < 0.42:
            conn.execute("INSERT INTO content(user_id,platform,title,type,hashtags,published_at,views,likes,comments,shares,saves,watch_time,reach) "
                         "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", _post(uid, platform, day, followers, rng))
            new_posts += 1
        _revenue(conn, uid, platform, day, followers, rng)
    _seed_demographics(conn, uid, rng)
    conn.execute("UPDATE accounts SET last_sync=? WHERE id=?", (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), acc["id"]))
    check_alerts(conn, uid, platform, new_posts)
    return new_posts


def check_alerts(conn, uid, platform, new_posts):
    best = q1(conn, "SELECT title, views FROM content WHERE user_id=? AND platform=? AND published_at >= date('now','-7 day') ORDER BY views DESC LIMIT 1", (uid, platform))
    if best and best["views"] > 60000:
        notify(conn, uid, "success", f"High-performing post on {platform}", f'"{best["title"]}" reached {best["views"]:,} views this week.')
    pend = q1(conn, "SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM revenue WHERE user_id=? AND status='Pending'", (uid,))
    if pend and pend["n"]:
        notify(conn, uid, "warning", "Pending payments", f'{pend["n"]} payment(s) worth ${pend["s"]:,.0f} are still pending.')
    fl = q(conn, "SELECT followers FROM audience_daily WHERE user_id=? AND platform=? ORDER BY date DESC LIMIT 8", (uid, platform))
    if len(fl) == 8 and fl[0]["followers"] > fl[-1]["followers"] * 1.02:
        notify(conn, uid, "success", f"{platform} follower surge", "Followers grew more than 2% over the last 7 days.")
    if new_posts:
        notify(conn, uid, "info", f"{platform} synced", f"{new_posts} new post(s) imported from the {platform} API.")


def live_tick(conn):
    """Real-time metrics engine: recent posts keep collecting views/likes."""
    for p in q(conn, "SELECT id, views, likes, comments, shares, saves, watch_time, reach FROM content WHERE published_at >= date('now','-3 day')"):
        dv = random.randint(0, max(3, p["views"] // 900))
        conn.execute("UPDATE content SET views=views+?, likes=likes+?, reach=reach+?, comments=comments+?, shares=shares+?, watch_time=watch_time+? WHERE id=?",
                     (dv, int(dv * 0.06), int(dv * 0.8), 1 if random.random() < 0.2 else 0,
                      1 if random.random() < 0.1 else 0, round(dv * 0.01, 2), p["id"]))


def sync_user(conn, uid):
    n = 0
    for acc in q(conn, "SELECT * FROM accounts WHERE user_id=?", (uid,)):
        n += sync_account(conn, acc)
    return n
