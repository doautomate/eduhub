"""Integration test: registration flow persists country/state/pin end-to-end (User Story 4)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_register_persists_address_and_login_profile_reflects_it(test_client) -> None:
    register_and_verify(
        test_client,
        email="addr-flow@example.com",
        mobile_number="+15550100901",
        country="US",
        state_province="CA",
        pin_code="94105",
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "addr-flow@example.com", "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    profile_response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert profile_response.status_code == 200
    body = profile_response.json()
    assert body["country"] == "US"
    assert body["state_province"] == "CA"
    assert body["pin_code"] == "94105"
