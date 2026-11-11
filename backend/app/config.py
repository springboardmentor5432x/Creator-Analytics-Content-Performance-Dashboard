
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CreatorIQ API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./creatoriq.db"

    jwt_secret_key: str = "local-development-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:4173,"
        "http://127.0.0.1:4173"
    )
    seed_demo_data: bool = True

    # Google / YouTube OAuth
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = (
        "http://127.0.0.1:8001/api/integrations/youtube/callback"
    )
    google_oauth_authorize_url: str = (
        "https://accounts.google.com/o/oauth2/v2/auth"
    )
    google_oauth_token_url: str = (
        "https://oauth2.googleapis.com/token"
    )

    # YouTube APIs
    youtube_api_key: str = ""
    youtube_data_api_base_url: str = (
        "https://www.googleapis.com/youtube/v3"
    )
    youtube_analytics_api_base_url: str = (
        "https://youtubeanalytics.googleapis.com/v2/reports"
    )

    # OAuth security
    frontend_base_url: str = "http://localhost:5173"
    oauth_state_ttl_seconds: int = 600
    oauth_token_encryption_key: str = ""

    # Shared Meta app credentials (Facebook Pages)
    meta_oauth_client_id: str = Field(
        default="",
        validation_alias=AliasChoices(
            "FB_APP_ID",
            "META_OAUTH_CLIENT_ID",
        ),
    )
    meta_oauth_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices(
            "FB_APP_SECRET",
            "META_OAUTH_CLIENT_SECRET",
        ),
    )
    # Kept for older Instagram Unified Login deployments. The Facebook +
    # Instagram connection flow uses the shared Meta app credentials above.
    meta_oauth_config_id: str = ""
    instagram_client_id: str = ""
    instagram_client_secret: str = ""
    instagram_config_id: str = ""
    # Must match the redirect URL registered in the Meta app's Instagram
    # configuration exactly (localhost, not 127.0.0.1).
    instagram_redirect_uri: str = (
        "http://localhost:8001/api/integrations/instagram/callback"
    )
    meta_graph_api_version: str = "v26.0"

    # Facebook
    facebook_oauth_config_id: str = ""
    facebook_oauth_redirect_uri: str = Field(
        default="http://localhost:8001/api/integrations/facebook/callback",
        validation_alias=AliasChoices(
            "FB_REDIRECT_URI",
            "FACEBOOK_OAUTH_REDIRECT_URI",
        ),
    )
    facebook_oauth_authorize_url: str = "https://www.facebook.com"
    facebook_graph_api_base_url: str = "https://graph.facebook.com"

    # X API
    x_client_id: str = ""
    x_client_secret: str = ""
    x_redirect_uri: str = (
        "http://127.0.0.1:8001/api/integrations/x/callback"
    )
    x_oauth_authorize_url: str = "https://x.com/i/oauth2/authorize"
    x_oauth_token_url: str = "https://api.x.com/2/oauth2/token"
    x_api_base_url: str = "https://api.x.com/2"

    # LinkedIn
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = (
        "http://127.0.0.1:8001/api/integrations/linkedin/callback"
    )
    linkedin_oauth_authorize_url: str = (
        "https://www.linkedin.com/oauth/v2/authorization"
    )
    linkedin_oauth_token_url: str = (
        "https://www.linkedin.com/oauth/v2/accessToken"
    )
    linkedin_api_base_url: str = "https://api.linkedin.com"
    linkedin_api_version: str = "202610"
    linkedin_oauth_scopes: str = (
        # Self-serve scopes that work without special app approval.
        # r_member_postAnalytics and r_organization_social require approved
        # LinkedIn Community Management API access; requesting them on an
        # unapproved app triggers invalid_scope_error.
        "openid profile email w_member_social"
    )

    http_timeout_seconds: float = 20.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
