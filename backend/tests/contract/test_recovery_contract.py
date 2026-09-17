"""Contract tests: POST /api/v1/auth/recovery/start|answer|reset (T059)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def _register(test_client, email="recovery-contract@example.com", mobile_number="+15550180001"):
    return register_and_verify(test_client, email=email, mobile_number=mobile_number)


def test_recovery_start_returns_question_text_for_known_email(test_client) -> None:
    _register(test_client)
    response = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-contract@example.com"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "user_id" in body
    assert "question_text" in body


def test_recovery_start_does_not_reveal_unknown_email(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "nobody@example.com"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "user_id" in body
    assert "question_text" in body


def test_recovery_answer_with_correct_answer_returns_reset_token(test_client) -> None:
    _register(test_client, email="recovery-answer@example.com", mobile_number="+15550180002")
    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-answer@example.com"}
    )
    response = test_client.post(
        "/api/v1/auth/recovery/answer",
        json={"user_id": start.json()["user_id"], "answer": "Rex"},
    )
    assert response.status_code == 200
    assert "reset_token" in response.json()


def test_recovery_answer_with_wrong_answer_returns_401(test_client) -> None:
    _register(test_client, email="recovery-wrong@example.com", mobile_number="+15550180003")
    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-wrong@example.com"}
    )
    response = test_client.post(
        "/api/v1/auth/recovery/answer",
        json={"user_id": start.json()["user_id"], "answer": "wrong-answer"},
    )
    assert response.status_code == 401


def test_recovery_answer_lockout_returns_423_after_max_failures(test_client) -> None:
    from src.core.config import get_settings

    _register(test_client, email="recovery-lockout@example.com", mobile_number="+15550180004")
    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-lockout@example.com"}
    )
    user_id = start.json()["user_id"]
    max_failures = get_settings().recovery_max_failures
    for _ in range(max_failures - 1):
        response = test_client.post(
            "/api/v1/auth/recovery/answer", json={"user_id": user_id, "answer": "wrong"}
        )
        assert response.status_code == 401
    locked_response = test_client.post(
        "/api/v1/auth/recovery/answer", json={"user_id": user_id, "answer": "wrong"}
    )
    assert locked_response.status_code == 423


def test_recovery_reset_with_invalid_token_returns_400(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/recovery/reset",
        json={"reset_token": "not-a-real-token", "new_password": "NewPassw0rd"},
    )
    assert response.status_code == 400


def test_recovery_reset_with_valid_token_allows_login_with_new_password(test_client) -> None:
    _register(test_client, email="recovery-reset@example.com", mobile_number="+15550180005")
    start = test_client.post(
        "/api/v1/auth/recovery/start", json={"email": "recovery-reset@example.com"}
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

    old_password_login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "recovery-reset@example.com", "password": "Passw0rd"},
    )
    assert old_password_login.status_code == 401

    new_password_login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "recovery-reset@example.com", "password": "BrandNewPassw0rd"},
    )
    assert new_password_login.status_code == 200
