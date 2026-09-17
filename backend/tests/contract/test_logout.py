"""Contract test: POST /api/v1/auth/logout"""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_logout_revokes_session_returns_204(test_client) -> None:
    register_and_verify(test_client, email="logout@example.com", mobile_number="+15550100401")
    test_client.post(
        "/api/v1/auth/login", json={"email": "logout@example.com", "password": "Passw0rd"}
    )
    response = test_client.post("/api/v1/auth/logout")
    assert response.status_code == 204


def test_logout_without_session_returns_401(test_client) -> None:
    response = test_client.post("/api/v1/auth/logout")
    assert response.status_code == 401
