"""Tests for verify_captcha()'s real-HTTP-verification branch (when a secret key IS
configured). We mock httpx.AsyncClient.post so no network call is made, and exercise
both a Google 'success: true' and 'success: false' response payload.
"""

from __future__ import annotations

import httpx
import pytest

from src.core.config import Settings
from src.services import captcha_service


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs) -> None:
        self.posted_with: dict | None = None

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *exc_info) -> None:
        return None

    async def post(self, url: str, data: dict) -> _FakeResponse:
        self.posted_with = {"url": url, "data": data}
        if data["secret"] == "valid-secret":
            return _FakeResponse({"success": True})
        return _FakeResponse({"success": False, "error-codes": ["invalid-input-secret"]})


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    def _clear() -> None:
        # Tests may monkeypatch `get_settings` with a plain (non-lru_cache) callable for
        # the duration of the test, so `cache_clear` won't always be present - guard it
        # rather than depend on fixture teardown ordering relative to `monkeypatch`.
        cache_clear = getattr(captcha_service.get_settings, "cache_clear", None)
        if cache_clear is not None:
            cache_clear()

    _clear()
    yield
    _clear()


@pytest.mark.asyncio
async def test_verify_captcha_returns_true_on_google_success(monkeypatch):
    monkeypatch.setattr(
        captcha_service,
        "get_settings",
        lambda: Settings(recaptcha_secret_key="valid-secret"),
    )
    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    assert await captcha_service.verify_captcha("some-client-token") is True


@pytest.mark.asyncio
async def test_verify_captcha_returns_false_on_google_failure(monkeypatch):
    monkeypatch.setattr(
        captcha_service,
        "get_settings",
        lambda: Settings(recaptcha_secret_key="wrong-secret"),
    )
    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    assert await captcha_service.verify_captcha("some-client-token") is False


@pytest.mark.asyncio
async def test_verify_captcha_returns_false_when_token_missing():
    assert await captcha_service.verify_captcha(None) is False
    assert await captcha_service.verify_captcha("") is False
