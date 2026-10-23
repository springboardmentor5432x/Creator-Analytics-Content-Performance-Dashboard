from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/creatoriq"
    jwt_secret_key: str = "CHANGE-ME-BEFORE-RUNNING"
    access_token_expire_minutes: int = 30
    frontend_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
