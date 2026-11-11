from urllib.parse import parse_qs, urlparse

from app import facebook_service
from app.config import Settings, settings
from app.routers import integrations


def _configure(monkeypatch):
    monkeypatch.setattr(settings, "meta_oauth_client_id", "meta-app-id")
    monkeypatch.setattr(settings, "meta_oauth_client_secret", "meta-app-secret")
    monkeypatch.setattr(settings, "facebook_oauth_config_id", "")
    monkeypatch.setattr(
        settings,
        "facebook_oauth_redirect_uri",
        "http://localhost:8001/api/integrations/facebook/callback",
    )
    monkeypatch.setattr(settings, "meta_graph_api_version", "v26.0")


def test_facebook_authorization_url_uses_page_scopes_without_business_config(
    monkeypatch,
):
    _configure(monkeypatch)

    url = facebook_service.build_authorization_url("csrf-state")
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "www.facebook.com"
    assert parsed.path.endswith("/dialog/oauth")
    assert params["client_id"] == ["meta-app-id"]
    assert params["redirect_uri"] == [
        "http://localhost:8001/api/integrations/facebook/callback"
    ]
    assert params["scope"] == ["pages_show_list,pages_read_engagement"]
    assert params["state"] == ["csrf-state"]
    assert "config_id" not in params


def test_facebook_authorization_url_preserves_business_login_config(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "facebook_oauth_config_id", "business-config")

    params = parse_qs(
        urlparse(facebook_service.build_authorization_url("csrf-state")).query
    )

    assert params["config_id"] == ["business-config"]
    assert "scope" not in params


def test_facebook_provider_is_ready_without_business_login_config(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "oauth_token_encryption_key", "test-fernet-key")
    monkeypatch.setattr(integrations, "validate_encryption_key", lambda: None)

    providers = integrations._provider_configuration_status()["providers"]
    facebook = next(provider for provider in providers if provider["id"] == "facebook")

    assert facebook["configured"] is True
    assert facebook["message"] == "Ready to connect."


def test_facebook_env_legacy_names_are_supported(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            (
                "FB_APP_ID=legacy-app-id",
                "FB_APP_SECRET=legacy-app-secret",
                "FB_REDIRECT_URI=https://example.test/facebook/callback",
            )
        ),
        encoding="utf-8",
    )

    configured = Settings(_env_file=env_file)

    assert configured.meta_oauth_client_id == "legacy-app-id"
    assert configured.meta_oauth_client_secret == "legacy-app-secret"
    assert configured.facebook_oauth_redirect_uri == (
        "https://example.test/facebook/callback"
    )
