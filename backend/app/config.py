import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./creatoriq.db"
    # If SECRET_KEY is missing a random one is generated (tokens die on restart).
    SECRET_KEY: str = secrets.token_urlsafe(48)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    
    DEMO_PASSWORD: str = ""
    ENVIRONMENT: str = "development"
    ALLOW_DEV_ADMIN_REGISTRATION: bool = False

    @property
    def cors_list(self):
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
