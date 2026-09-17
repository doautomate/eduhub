"""Integration test: login flow (TS-004, TS-005)."""

from __future__ import annotations

import jwt

from tests.conftest import get_captured_otp_code, register_and_verify, register_payload


def test_ts004_login_issues_access_and_refresh_tokens(test_client) -> None:
    register_and_verify(test_client, email="flow@example.com", mobile_number="+15550100501")
    response = test_client.post(
        "/api/v1/auth/login", json={"email": "flow@example.com", "password": "Passw0rd"}
    )
    assert response.status_code == 200
    body = response.json()
    decoded = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert decoded["exp"] - decoded["iat"] == 900
    assert "refresh_token" in response.cookies


def test_ts005_wrong_password_or_unregistered_email_same_generic_message(test_client) -> None:
    register_and_verify(test_client, email="flow2@example.com", mobile_number="+15550100502")
    wrong_password = test_client.post(
        "/api/v1/auth/login", json={"email": "flow2@example.com", "password": "wrong-pass1"}
    )
    unregistered = test_client.post(
        "/api/v1/auth/login", json={"email": "unregistered@example.com", "password": "whatever1"}
    )
    assert wrong_password.status_code == 401
    assert unregistered.status_code == 401
    assert wrong_password.json()["detail"] == unregistered.json()["detail"]


def test_login_blocked_pre_verification_then_succeeds_post_verification(test_client) -> None:
    register_response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="pre-post-verify@example.com", mobile_number="+15550100503"),
    )
    body = register_response.json()

    blocked = test_client.post(
        "/api/v1/auth/login",
        json={"email": "pre-post-verify@example.com", "password": "Passw0rd"},
    )
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["reason"] == "EMAIL_NOT_VERIFIED"

    code = get_captured_otp_code("pre-post-verify@example.com")
    verify_response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": code}
    )
    assert verify_response.status_code == 200

    allowed = test_client.post(
        "/api/v1/auth/login",
        json={"email": "pre-post-verify@example.com", "password": "Passw0rd"},
    )
    assert allowed.status_code == 200
