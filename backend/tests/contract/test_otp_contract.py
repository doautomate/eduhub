"""Contract tests: POST /api/v1/auth/otp/verify and /otp/resend (T043)."""

from __future__ import annotations

from tests.conftest import get_captured_otp_code, register_payload


def _register(test_client, email="otp-contract@example.com", mobile_number="+15550160001"):
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email=email, mobile_number=mobile_number),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_otp_verify_with_correct_code_returns_200(test_client) -> None:
    body = _register(test_client)
    code = get_captured_otp_code(body["email"])
    response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": code}
    )
    assert response.status_code == 200
    assert response.json()["verified"] is True


def test_otp_verify_with_wrong_code_returns_400_with_attempts_remaining(test_client) -> None:
    body = _register(test_client, email="otp-wrong@example.com", mobile_number="+15550160002")
    response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": "000000"}
    )
    assert response.status_code == 400
    assert response.json()["detail"]["attempts_remaining"] == 2


def test_otp_verify_exceeding_attempt_limit_returns_429(test_client) -> None:
    body = _register(test_client, email="otp-limit@example.com", mobile_number="+15550160003")
    for _ in range(2):
        test_client.post("/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": "000000"})
    response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": "000000"}
    )
    assert response.status_code == 429


def test_otp_resend_before_cooldown_elapses_returns_429(test_client) -> None:
    body = _register(test_client, email="otp-resend-cd@example.com", mobile_number="+15550160004")
    response = test_client.post("/api/v1/auth/otp/resend", json={"user_id": body["id"]})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_otp_resend_for_unknown_user_returns_400(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/otp/resend",
        json={"user_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 400
