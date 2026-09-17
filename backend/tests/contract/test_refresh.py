"""Contract test: POST /api/v1/auth/refresh"""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_refresh_with_valid_cookie_returns_new_access_token(test_client) -> None:
    register_and_verify(test_client, email="refresh@example.com", mobile_number="+15550100301")
    login_response = test_client.post(
        "/api/v1/auth/login", json={"email": "refresh@example.com", "password": "Passw0rd"}
    )
    assert login_response.status_code == 200

    refresh_response = test_client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()


def test_refresh_without_cookie_returns_401(test_client) -> None:
    response = test_client.post("/api/v1/auth/refresh")
    assert response.status_code == 401
