"""Integration test: logout revokes refresh token (TS-008, SC-004)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_logout_revokes_refresh_token_and_blocks_subsequent_refresh(test_client) -> None:
    register_and_verify(test_client, email="revoke@example.com", mobile_number="+15550100601")
    test_client.post(
        "/api/v1/auth/login", json={"email": "revoke@example.com", "password": "Passw0rd"}
    )

    logout_response = test_client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    refresh_response = test_client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401
