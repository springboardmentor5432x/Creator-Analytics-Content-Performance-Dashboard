
import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.db_migrations import run_migrations

from app.routers.account import router as account_router
from app.routers.admin import router as admin_router
from app.routers.agency import router as agency_router
from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.integrations import router as integrations_router
from app.routers.twitter_auth import router as twitter_auth_router
from app.routers.creators import router as creators_router
from app.routers.monetization import router as monetization_router
from app.routers.workspace import router as workspace_router
from app.report_scheduler import report_scheduler_loop

# YouTube Public Analytics
from app.routers.youtube_public_analytics import (
    router as youtube_public_analytics_router,
)

from app.seed_demo import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preserve existing database tables and application records. Create any
    # missing tables first, then apply checked-in migrations so older databases
    # gain new columns before the API and scheduler use them.
    Base.metadata.create_all(bind=engine)
    run_migrations()

    # Existing seed configuration is preserved for now.
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed_demo_data(db)

    scheduler_task = asyncio.create_task(report_scheduler_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task


app = FastAPI(
    title=settings.app_name,
    description=(
        "CreatorIQ - Creator analytics, audience insights, "
        "revenue tracking, reporting, and social platform "
        "integrations."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Existing application routers
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)
app.include_router(integrations_router, prefix=settings.api_prefix)
app.include_router(twitter_auth_router, prefix=settings.api_prefix)
app.include_router(creators_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
app.include_router(monetization_router, prefix=settings.api_prefix)
app.include_router(workspace_router, prefix=settings.api_prefix)
app.include_router(agency_router, prefix=settings.api_prefix)

# New YouTube Public Analytics router
app.include_router(
    youtube_public_analytics_router,
    prefix=settings.api_prefix,
)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "creatoriq-api",
        "project": "CreatorIQ",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "creatoriq-api",
        "version": "1.0.0",
    }
