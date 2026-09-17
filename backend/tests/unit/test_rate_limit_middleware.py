"""Direct unit tests for AuthRateLimitMiddleware.dispatch(), covering the
pass-through (non-auth path), normal increment, and 429-threshold-exceeded branches.
This middleware is intentionally NOT mounted on the main app (see
specs/001-user-auth/tasks.md Implementation Notes), so it is exercised here on an
isolated FastAPI app wired to a fakeredis client via monkeypatching get_redis().
"""

from __future__ import annotations

import pytest
from fakeredis.aioredis import FakeRedis
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.middleware import rate_limit as rate_limit_module
from src.middleware.rate_limit import AuthRateLimitMiddleware


@pytest.fixture
def rate_limited_app(monkeypatch):
    fake = FakeRedis(decode_responses=True)
    monkeypatch.setattr(rate_limit_module, "get_redis", lambda: fake)

    app = FastAPI()
    app.add_middleware(AuthRateLimitMiddleware)

    @app.get("/api/v1/auth/ping")
    def auth_ping():
        return {"ok": True}

    @app.get("/unprotected")
    def unprotected():
        return {"ok": True}

    return app


def test_non_auth_paths_bypass_rate_limiting(rate_limited_app):
    client = TestClient(rate_limited_app)
    for _ in range(50):
        response = client.get("/unprotected")
        assert response.status_code == 200


def test_auth_path_allows_requests_under_the_threshold(rate_limited_app):
    client = TestClient(rate_limited_app)
    response = client.get("/api/v1/auth/ping")
    assert response.status_code == 200


def test_auth_path_returns_429_once_threshold_exceeded(rate_limited_app):
    client = TestClient(rate_limited_app)
    last_response = None
    for _ in range(31):
        last_response = client.get("/api/v1/auth/ping")
    assert last_response.status_code == 429
    assert "Too many requests" in last_response.json()["detail"]


def test_otp_and_recovery_paths_are_covered_by_the_same_auth_prefix_limit(rate_limited_app):
    """T072: `/auth/otp/*` and `/auth/recovery/*` are registered under the same
    `/api/v1/auth/` prefix as the rest of the auth router, so they are already covered
    by `AuthRateLimitMiddleware`'s prefix match without any additional configuration."""

    @rate_limited_app.get("/api/v1/auth/otp/ping")
    def otp_ping():
        return {"ok": True}

    @rate_limited_app.get("/api/v1/auth/recovery/ping")
    def recovery_ping():
        return {"ok": True}

    client = TestClient(rate_limited_app)
    # Both new paths share the same per-client-IP counter as the rest of /auth/*, so a
    # mix of requests across all three still trips the shared threshold.
    last_response = None
    for i in range(31):
        path = ["/api/v1/auth/ping", "/api/v1/auth/otp/ping", "/api/v1/auth/recovery/ping"][i % 3]
        last_response = client.get(path)
    assert last_response.status_code == 429
