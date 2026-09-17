"""Integration test: full recovery flow revokes existing sessions on reset (T060, FR-016)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def test_recovery_reset_revokes_existing_refresh_token(test_client) -> None:
    register_and_verify(
        test_client, email="recovery-revoke@example.com", mobile_number="+15550190001"
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "recovery-revoke@example.com", "password": "Passw0rd"},
    )
    assert login_response.status_code == 200

    # Sanity check: refresh works before recovery reset.
    assert test_client.post("/api/v1/auth/refresh").status_code == 200

    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-revoke@example.com"}
    )
    answer = test_client.post(
        "/api/v1/auth/recovery/answer",
        json={"user_id": start.json()["user_id"], "answer": "Rex"},
    )
    reset_token = answer.json()["reset_token"]
    reset_response = test_client.post(
        "/api/v1/auth/recovery/reset",
        json={"reset_token": reset_token, "new_password": "BrandNewPassw0rd"},
    )
    assert reset_response.status_code == 200

    # The refresh-token cookie from the pre-reset session must now be revoked (FR-016).
    refresh_after_reset = test_client.post("/api/v1/auth/refresh")
    assert refresh_after_reset.status_code == 401


def test_recovery_full_flow_old_password_rejected_new_password_accepted(test_client) -> None:
    register_and_verify(
        test_client, email="recovery-e2e@example.com", mobile_number="+15550190002"
    )

    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-e2e@example.com"}
    )
    assert start.status_code == 200

    answer = test_client.post(
        "/api/v1/auth/recovery/answer",
        json={"user_id": start.json()["user_id"], "answer": "Rex"},
    )
    assert answer.status_code == 200

    reset = test_client.post(
        "/api/v1/auth/recovery/reset",
        json={"reset_token": answer.json()["reset_token"], "new_password": "AnotherNewPassw0rd"},
    )
    assert reset.status_code == 200

    old_password = test_client.post(
        "/api/v1/auth/login",
        json={"email": "recovery-e2e@example.com", "password": "Passw0rd"},
    )
    assert old_password.status_code == 401

    new_password = test_client.post(
        "/api/v1/auth/login",
        json={"email": "recovery-e2e@example.com", "password": "AnotherNewPassw0rd"},
    )
    assert new_password.status_code == 200
