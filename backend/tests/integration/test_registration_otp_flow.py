"""Integration test: register -> OTP verify -> login flow (T044)."""

from __future__ import annotations

from tests.conftest import get_captured_otp_code, register_payload


def test_register_then_verify_then_login_succeeds(test_client) -> None:
    register_response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="otp-flow@example.com", mobile_number="+15550170001"),
    )
    assert register_response.status_code == 201
    body = register_response.json()
    assert body["is_verified"] is False

    # Logging in before verification must be rejected.
    early_login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "otp-flow@example.com", "password": "Passw0rd"},
    )
    assert early_login.status_code == 403
    assert early_login.json()["detail"]["reason"] == "EMAIL_NOT_VERIFIED"

    code = get_captured_otp_code("otp-flow@example.com")
    verify_response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": code}
    )
    assert verify_response.status_code == 200

    profile_before_login = test_client.get("/api/v1/users/me")
    assert profile_before_login.status_code == 401  # no session yet, sanity check only

    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "otp-flow@example.com", "password": "Passw0rd"},
    )
    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]
    profile_response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["is_verified"] is True


def test_resend_after_cooldown_issues_a_new_code_that_verifies(test_client, monkeypatch) -> None:

    register_response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="otp-resend-flow@example.com", mobile_number="+15550170002"),
    )
    body = register_response.json()

    # Simulate the cooldown having elapsed by clearing the Redis key directly via a
    # fresh service instance sharing the same fake_redis backing the test client.
    from src.api.deps import get_redis_dep
    from src.app import app

    async def _clear_cooldown():
        async for redis in app.dependency_overrides[get_redis_dep]():
            await redis.delete(f"otp_resend_cooldown:{body['id']}")
            break

    import asyncio

    asyncio.run(_clear_cooldown())

    resend_response = test_client.post("/api/v1/auth/otp/resend", json={"user_id": body["id"]})
    assert resend_response.status_code == 202

    new_code = get_captured_otp_code("otp-resend-flow@example.com")
    verify_response = test_client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": new_code}
    )
    assert verify_response.status_code == 200
