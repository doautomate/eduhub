"""Integration test: GET /api/v1/users/me (authenticated profile endpoint, FR-011)."""

from __future__ import annotations

import uuid

from src.core.security import create_access_token
from tests.conftest import register_and_verify


def _register_and_login(test_client, email: str, mobile_number: str) -> str:
    register_and_verify(test_client, email=email, mobile_number=mobile_number)
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def test_get_me_returns_profile_for_authenticated_user(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="profile@example.com", mobile_number="+15550100201"
    )
    response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "profile@example.com"
    assert body["first_name"] == "Test"
    assert body["last_name"] == "User"
    assert body["mobile_number"] == "+15550100201"
    assert "id" in body
    assert "created_at" in body
    # 009-profile-onboarding-setup: a freshly registered/verified user has no academic
    # profile yet - GET /me must surface that as null fields + a false completeness flag.
    assert body["board"] is None
    assert body["board_other"] is None
    assert body["standard"] is None
    assert body["academic_profile_complete"] is False


def test_get_me_without_token_returns_401(test_client) -> None:
    response = test_client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_get_me_with_invalid_token_returns_401(test_client) -> None:
    response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


def test_get_me_with_valid_token_for_deleted_user_returns_401(test_client) -> None:
    # A well-formed, correctly-signed JWT whose subject no longer maps to any user
    # (e.g. the account was deleted after the token was issued).
    access_token, _ = create_access_token(subject=str(uuid.uuid4()))
    response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 401
