import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration settings for CreatorIQ Flask Backend"""
    SECRET_KEY = os.getenv("SECRET_KEY", "creatoriq-super-secret-jwt-key-change-in-prod-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # SQLite Database URI (can be swapped for PostgreSQL via DATABASE_URL)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(BASE_DIR, 'creatoriq.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

    # OAuth2 Mock & Integration Settings
    OAUTH_GOOGLE_CLIENT_ID = os.getenv("OAUTH_GOOGLE_CLIENT_ID", "mock-google-client-id")
    OAUTH_GOOGLE_CLIENT_SECRET = os.getenv("OAUTH_GOOGLE_CLIENT_SECRET", "mock-google-client-secret")
    OAUTH_YOUTUBE_CLIENT_ID = os.getenv("OAUTH_YOUTUBE_CLIENT_ID", "mock-youtube-client-id")
    OAUTH_TIKTOK_CLIENT_ID = os.getenv("OAUTH_TIKTOK_CLIENT_ID", "mock-tiktok-client-id")
