"""Integration test: CAPTCHA-after-3-failures gate (TS-011)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_captcha_gate_resets_after_successful_login(test_client) -> None:
    register_and_verify(test_client, email="gate@example.com", mobile_number="+15550100701")
    for _ in range(3):
        response = test_client.post(
            "/api/v1/auth/login", json={"email": "gate@example.com", "password": "wrong-pass1"}
        )
        assert response.status_code == 401

    gated = test_client.post(
        "/api/v1/auth/login", json={"email": "gate@example.com", "password": "wrong-pass1"}
    )
    assert gated.status_code == 428

    success = test_client.post(
        "/api/v1/auth/login",
        json={
            "email": "gate@example.com",
            "password": "Passw0rd",
            "captcha_token": "test-captcha-token",
        },
    )
    assert success.status_code == 200

    after_reset = test_client.post(
        "/api/v1/auth/login", json={"email": "gate@example.com", "password": "wrong-pass1"}
    )
    assert after_reset.status_code == 401
