from urllib.parse import parse_qs, urlparse

from app import instagram_service
from app.config import settings


def _configure(monkeypatch):
    monkeypatch.setattr(settings, "instagram_client_id", "meta-app-id")
    monkeypatch.setattr(settings, "instagram_client_secret", "meta-app-secret")
    monkeypatch.setattr(settings, "instagram_config_id", "2154487905144729")
    monkeypatch.setattr(
        settings,
        "instagram_redirect_uri",
        "http://localhost:8001/api/integrations/instagram/callback",
    )
    monkeypatch.setattr(settings, "meta_graph_api_version", "v26.0")


def test_authorization_url_uses_unified_login_config(monkeypatch):
    _configure(monkeypatch)

    url = instagram_service.build_authorization_url("csrf-state")
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "www.facebook.com"
    assert parsed.path.endswith("/dialog/oauth")
    assert params["client_id"] == ["meta-app-id"]
    assert params["config_id"] == ["2154487905144729"]
    assert params["redirect_uri"] == [settings.instagram_redirect_uri]
    assert params["state"] == ["csrf-state"]
    assert params["response_type"] == ["code"]
    assert params["prompt"] == ["login"]
    assert "scope" not in params


def test_authorization_url_requires_config_id(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "instagram_config_id", "")

    try:
        instagram_service.build_authorization_url("csrf-state")
    except instagram_service.InstagramProviderError as exc:
        assert exc.status_code == 503
        assert "INSTAGRAM_CONFIG_ID" in str(exc)
    else:
        raise AssertionError("Expected a missing configuration ID to fail")


def test_code_exchange_uses_graph_facebook_host(monkeypatch):
    _configure(monkeypatch)
    seen = {}

    def fake_request(method, url, **kwargs):
        seen["method"] = method
        seen["url"] = url
        seen["params"] = kwargs.get("params")
        return {"access_token": "system-user-token", "token_type": "bearer"}

    monkeypatch.setattr(instagram_service, "_request", fake_request)
    monkeypatch.setattr(
        settings,
        "facebook_graph_api_base_url",
        "https://graph.facebook.com",
    )

    token = instagram_service.exchange_authorization_code("auth-code")

    assert token["access_token"] == "system-user-token"
    assert seen["method"] == "GET"
    assert seen["url"] == "https://graph.facebook.com/v26.0/oauth/access_token"
    assert seen["params"] == {
        "client_id": "meta-app-id",
        "client_secret": "meta-app-secret",
        "code": "auth-code",
        "redirect_uri": settings.instagram_redirect_uri,
    }


def test_code_exchange_requires_access_token(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(
        instagram_service,
        "_request",
        lambda *args, **kwargs: {"error": "nope"},
    )

    try:
        instagram_service.exchange_authorization_code("auth-code")
    except instagram_service.InstagramProviderError as exc:
        assert exc.status_code == 502
    else:
        raise AssertionError("Expected a missing access token to fail")


def test_assigned_instagram_accounts_are_read_from_system_user_token(monkeypatch):
    _configure(monkeypatch)
    calls = []

    def fake_request(method, url, **kwargs):
        calls.append(url)
        if len(calls) == 1:
            return {
                "data": [
                    {"id": "17841400000000000", "username": "creator_test"},
                ],
                "paging": {"next": "https://graph.facebook.com/v26.0/next-page"},
            }
        return {
            "data": [{"id": "17841400000000001", "username": "second"}],
        }

    monkeypatch.setattr(instagram_service, "_request", fake_request)
    monkeypatch.setattr(
        settings,
        "facebook_graph_api_base_url",
        "https://graph.facebook.com",
    )

    accounts = instagram_service.list_assigned_instagram_accounts("system-token")

    assert [item["username"] for item in accounts] == [
        "creator_test",
        "second",
    ]
    assert calls[0] == (
        "https://graph.facebook.com/v26.0/me/assigned_instagram_accounts"
    )


def test_client_business_id_is_required(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(
        instagram_service,
        "graph_get",
        lambda *args, **kwargs: {"id": "123"},
    )

    try:
        instagram_service.get_client_business_id("system-token")
    except instagram_service.InstagramProviderError as exc:
        assert exc.status_code == 502
        assert "business portfolio" in str(exc)
    else:
        raise AssertionError("Expected a missing business portfolio to fail")


def test_profile_is_read_for_the_shared_account(monkeypatch):
    _configure(monkeypatch)
    seen = {}

    def fake_graph_get(path, token, params=None):
        seen["path"] = path
        seen["params"] = params
        return {"id": "17841400000000000", "username": "creator_test"}

    monkeypatch.setattr(instagram_service, "graph_get", fake_graph_get)

    profile = instagram_service.get_profile(
        "system-token",
        "17841400000000000",
    )

    assert profile["username"] == "creator_test"
    assert seen["path"] == "17841400000000000"
    assert "followers_count" in seen["params"]["fields"]


def test_instagram_scopes_match_the_configuration_permissions():
    assert instagram_service.INSTAGRAM_SCOPES == (
        "instagram_basic",
        "instagram_manage_insights",
        "instagram_manage_messages",
    )
