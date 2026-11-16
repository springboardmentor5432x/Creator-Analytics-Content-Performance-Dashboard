import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./creatoriq.db"
    # If SECRET_KEY is missing a random one is generated (tokens die on restart).
    SECRET_KEY: str = secrets.token_urlsafe(48)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    
    DEMO_PASSWORD: str = "Demo@12345"
    ENVIRONMENT: str = "development"
    ALLOW_DEV_ADMIN_REGISTRATION: bool = True
    AUTO_INIT_DB: bool = True

    # Database connection pool settings (for PostgreSQL / production)
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    LOG_LEVEL: str = "INFO"

    # YouTube API / OAuth Credentials (read securely by backend from .env)
    YOUTUBE_CLIENT_ID: str | None = None
    YOUTUBE_CLIENT_SECRET: str | None = None
    YOUTUBE_REDIRECT_URI: str = "http://localhost:5173/connections/youtube/callback"
    YOUTUBE_API_KEY: str | None = None

    # Instagram Graph API / Meta App Credentials (read securely by backend from .env)
    META_GRAPH_API_VERSION: str = "v26.0"
    INSTAGRAM_CLIENT_ID: str | None = None
    INSTAGRAM_CLIENT_SECRET: str | None = None
    INSTAGRAM_APP_ID: str | None = None
    INSTAGRAM_APP_SECRET: str | None = None
    INSTAGRAM_REDIRECT_URI: str = "http://localhost:5173/connections/instagram/callback"

    # TikTok API Credentials
    TIKTOK_CLIENT_KEY: str | None = None
    TIKTOK_CLIENT_SECRET: str | None = None
    TIKTOK_REDIRECT_URI: str = "http://localhost:5173/connections/tiktok/callback"

    # Facebook Graph API Credentials
    FACEBOOK_APP_ID: str | None = None
    FACEBOOK_APP_SECRET: str | None = None
    FACEBOOK_REDIRECT_URI: str = "http://localhost:5173/connections/facebook/callback"

    # X (Twitter) API v2 Credentials
    X_CLIENT_ID: str | None = None
    X_CLIENT_SECRET: str | None = None
    X_REDIRECT_URI: str = "http://localhost:5173/connections/x/callback"

    # LinkedIn Marketing API Credentials
    LINKEDIN_CLIENT_ID: str | None = None
    LINKEDIN_CLIENT_SECRET: str | None = None
    LINKEDIN_REDIRECT_URI: str = "http://localhost:5173/connections/linkedin/callback"

    # Secondary Store & Cache (Redis & MongoDB)
    REDIS_URL: str | None = None
    MONGODB_URL: str | None = None
    MONGODB_DB_NAME: str = "creatoriq"

    @property
    def cors_list(self):
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
