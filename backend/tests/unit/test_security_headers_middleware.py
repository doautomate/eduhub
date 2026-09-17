"""Unit test: SecurityHeadersMiddleware attaches baseline security headers and a
route-appropriate Content-Security-Policy to every response."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.app import app

client = TestClient(app)


def test_health_response_has_baseline_security_headers() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Permissions-Policy"] == "camera=(), microphone=(), geolocation=()"
    assert response.headers["Strict-Transport-Security"] == "max-age=63072000; includeSubDomains"


def test_api_json_response_gets_a_locked_down_csp() -> None:
    response = client.get("/health")
    assert response.headers["Content-Security-Policy"] == "default-src 'none'; frame-ancestors 'none'"


def test_docs_response_gets_a_csp_scoped_to_swagger_ui_assets() -> None:
    response = client.get("/docs")
    assert response.status_code == 200
    csp = response.headers["Content-Security-Policy"]
    assert "cdn.jsdelivr.net" in csp
    assert csp != "default-src 'none'; frame-ancestors 'none'"


def test_openapi_json_gets_the_docs_scoped_csp() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "cdn.jsdelivr.net" in response.headers["Content-Security-Policy"]
