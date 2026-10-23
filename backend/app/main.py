
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import auth, users, admin
from app.routers.social_accounts import router as social_accounts_router
from app import models



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables for local development
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CreatorIQ API",
    description="Authentication, user management, and social media analytics APIs for CreatorIQ.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(social_accounts_router)


@app.get("/")
def health():
    return {"message": "CreatorIQ API is running", "docs": "/docs"}
