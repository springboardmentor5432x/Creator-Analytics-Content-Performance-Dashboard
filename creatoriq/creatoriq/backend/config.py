"""Central configuration for CreatorIQ (lite edition)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "creatoriq.db"
FRONTEND_DIR = BASE_DIR / "frontend"

SECRET_KEY = os.getenv("CREATORIQ_SECRET", "creatoriq-dev-secret-change-me-0123456789")
ALGORITHM = "HS256"
TOKEN_HOURS = 12

LIVE_TICK_SECONDS = 15      # simulated real-time metrics engine
SYNC_MINUTES = 10           # scheduled social-media synchronisation
CACHE_TTL = 8               # seconds (in-memory stand-in for Redis)

PLATFORMS = ["YouTube", "Instagram", "TikTok", "Facebook", "X", "LinkedIn"]
ROLES = ["creator", "agency", "marketing", "admin"]
REVENUE_SOURCES = ["Sponsorship", "Ad Revenue", "Affiliate", "Brand Collaboration", "Subscription"]
