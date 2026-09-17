"""Unit test: password hashing never stores/returns plaintext."""

from __future__ import annotations

from src.core.security import hash_password, verify_password
from tests.conftest import get_captured_otp_code, register_and_verify, register_payload


def test_hash_password_does_not_return_plaintext() -> None:
    hashed = hash_password("Passw0rd")
    assert hashed != "Passw0rd"
    assert hashed.startswith("$argon2")


def test_verify_password_correct() -> None:
    hashed = hash_password("Passw0rd")
    assert verify_password("Passw0rd", hashed) is True


def test_verify_password_incorrect() -> None:
    hashed = hash_password("Passw0rd")
    assert verify_password("WrongPass1", hashed) is False


# Regression coverage (T071): no endpoint response ever exposes date_of_birth,
# security_answer, or a plaintext password/OTP (FR-017/FR-018, SC-006).
_FORBIDDEN_KEYS = {
    "password",
    "password_hash",
    "date_of_birth",
    "security_answer",
    "security_answer_hash",
    "code",
    "code_hash",
    "otp",
    "otp_code",
}


def _assert_no_forbidden_keys(body: dict) -> None:
    leaked = _FORBIDDEN_KEYS & set(body.keys())
    assert not leaked, f"Response leaked forbidden field(s): {leaked}"


def test_register_response_never_exposes_sensitive_fields(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="hash-check@example.com", mobile_number="+15550195001"),
    )
    assert response.status_code == 201
    _assert_no_forbidden_keys(response.json())


def test_otp_verify_success_response_never_exposes_the_code(test_client) -> None:
    register_response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="hash-check-otp@example.com", mobile_number="+15550195002"),
    )
    body = register_response.json()
    code = get_captured_otp_code("hash-check-otp@example.com")

    verify_response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": code}
    )
    assert verify_response.status_code == 200
    verify_body = verify_response.json()
    _assert_no_forbidden_keys(verify_body)
    assert code not in str(verify_body)


def test_users_me_response_never_exposes_sensitive_fields(test_client) -> None:
    register_and_verify(
        test_client, email="hash-check-me@example.com", mobile_number="+15550195003"
    )
    login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "hash-check-me@example.com", "password": "Passw0rd"},
    )
    access_token = login.json()["access_token"]
    profile = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert profile.status_code == 200
    _assert_no_forbidden_keys(profile.json())


def test_login_error_response_never_echoes_the_submitted_password(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "no-such-user@example.com", "password": "SuperSecretValue1"},
    )
    assert response.status_code == 401
    assert "SuperSecretValue1" not in response.text
