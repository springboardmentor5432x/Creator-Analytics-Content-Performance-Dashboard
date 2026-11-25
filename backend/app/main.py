
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from . import models
from .routers import auth, profiles, admin, analytics, youtube, meta


# Create database tables
Base.metadata.create_all(bind=engine)


# Create default roles if they do not exist
with SessionLocal() as db:
    for name in ["creator", "agency", "marketing", "admin"]:
        existing_role = (
            db.query(models.Role)
            .filter_by(name=name)
            .first()
        )

        if not existing_role:
            db.add(models.Role(name=name))

    db.commit()


# Create FastAPI application
app = FastAPI(
    title="CreatorIQ API",
    description="CreatorIQ Social Media Analytics Platform",
    version="2.0.0"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register existing routers
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(youtube.router)


# Register Meta integration router
app.include_router(meta.router)


# Home route
@app.get("/")
def home():
    return {
        "status": "success",
        "message": "CreatorIQ API is running successfully",
        "version": "2.0.0"
    }

