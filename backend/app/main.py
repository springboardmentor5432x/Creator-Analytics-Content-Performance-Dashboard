from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers.account import router as account_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.seed_demo import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed_demo_data(db)
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "CreatorIQ Milestone 1 - authentication and creator analytics "
        "dashboard API."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS fallback for direct local API access. The Vite proxy below also makes
# browser development requests same-origin, avoiding CORS preflights entirely.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "creatoriq-api",
        "project": "CreatorIQ",
        "milestone": "1",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "creatoriq-api"}
