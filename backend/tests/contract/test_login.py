"""Contract test: POST /api/v1/auth/login"""

from __future__ import annotations

from tests.conftest import register_and_verify, register_payload


def _register(test_client, email="loginuser@example.com", password="Passw0rd", mobile_number="+15550100201"):
    return register_and_verify(test_client, email=email, password=password, mobile_number=mobile_number)


def test_login_success_returns_200_with_tokens(test_client) -> None:
    _register(test_client)
    response = test_client.post(
        "/api/v1/auth/login", json={"email": "loginuser@example.com", "password": "Passw0rd"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 900
    assert "refresh_token" in response.cookies


def test_login_wrong_password_returns_401_generic_message(test_client) -> None:
    _register(test_client)
    response = test_client.post(
        "/api/v1/auth/login", json={"email": "loginuser@example.com", "password": "wrong-pass1"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


def test_login_unregistered_email_returns_same_generic_401(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever1"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


def test_login_captcha_required_after_3_failures(test_client) -> None:
    _register(test_client, email="captcha@example.com", mobile_number="+15550100202")
    for _ in range(3):
        test_client.post(
            "/api/v1/auth/login",
            json={"email": "captcha@example.com", "password": "wrong-pass1"},
        )
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "captcha@example.com", "password": "wrong-pass1"},
    )
    assert response.status_code == 428
    assert response.json()["detail"] == "CAPTCHA verification required."


def test_login_unverified_account_returns_403_email_not_verified(test_client) -> None:
    # Register without going through OTP verification: account stays `is_verified=False`.
    test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="unverified@example.com", mobile_number="+15550100203"),
    )
    response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "unverified@example.com", "password": "Passw0rd"},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["reason"] == "EMAIL_NOT_VERIFIED"
