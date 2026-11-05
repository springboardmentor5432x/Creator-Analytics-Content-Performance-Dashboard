import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError, ProgrammingError

from .config import FRONTEND_ORIGIN, SEED_DEMO_USERS, SYNC_INTERVAL_MINUTES, YOUTUBE_API_KEY
from .database import SessionLocal
from .routers import account, admin, agencies, analytics, auth, creators
from .seed import seed_demo_users
from .models import SocialAccount
from .services.youtube import sync_youtube_channel_to_db
from sqlalchemy import select

log = logging.getLogger("creatoriq")


def _resync_all() -> None:
    """Re-sync every live YouTube account -> stores today's follower snapshot (real growth history)."""
    with SessionLocal() as db:
        accounts = db.scalars(select(SocialAccount).where(
            SocialAccount.platform == "youtube", SocialAccount.is_live.is_(True))).all()
        for acc in accounts:
            try:
                sync_youtube_channel_to_db(db, acc.creator_id, acc.username or acc.platform_user_id)
            except Exception as e:  # keep the loop alive
                db.rollback()
                log.warning("Auto-sync failed for %s: %s", acc.username, e)


async def _sync_loop() -> None:
    while True:
        await asyncio.sleep(SYNC_INTERVAL_MINUTES * 60)
        await asyncio.to_thread(_resync_all)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables come from Alembic: run `alembic upgrade head` once before starting.
    if SEED_DEMO_USERS:
        try:
            with SessionLocal() as db:
                seed_demo_users(db)
        except (OperationalError, ProgrammingError):
            log.error("Database tables not found. Run: alembic upgrade head")
    task = None
    if YOUTUBE_API_KEY and SYNC_INTERVAL_MINUTES > 0:
        task = asyncio.create_task(_sync_loop())
    yield
    if task:
        task.cancel()


app = FastAPI(title="CreatorIQ API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:5175", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, account, creators, agencies, admin, analytics):
    app.include_router(r.router)


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok"}
