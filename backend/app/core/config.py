import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CreatorIQ - Creator Analytics & Content Performance Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-key-creatoriq-jwt-authentication-2026-secure-token"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    DATABASE_URL: str = "sqlite:///./creatoriq.db"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
