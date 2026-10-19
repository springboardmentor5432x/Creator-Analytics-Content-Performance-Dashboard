from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends

from app.database import get_db

from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.profiles import router as profiles_router
from app.routes.marketing import router as marketing_router

app = FastAPI(
    title="CreatorIQ API",
    description="Creator Analytics & Content Performance Dashboard API",
    version="1.0.0"
)
app.include_router(marketing_router)

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"]
)


app.include_router(
    users_router,
    prefix="/api/users",
    tags=["Users"]
)


app.include_router(
    profiles_router,
    prefix="/api/profiles",
    tags=["Profiles"]
)


@app.get("/")
def root():

    return {
        "message": "Welcome to CreatorIQ API",
        "status": "running"
    }


@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


@app.get("/health/database")
def database_health(
    db: Session = Depends(get_db)
):

    result = db.execute(
        text("SELECT 1")
    )

    return {
        "database": "connected",
        "result": result.scalar()
    }