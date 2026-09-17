"""Contract test: POST /api/v1/auth/register"""

from __future__ import annotations

from tests.conftest import register_payload


def test_register_success_returns_201(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="newuser@example.com", mobile_number="+15550100101"),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "newuser@example.com"
    assert body["first_name"] == "Test"
    assert body["last_name"] == "User"
    assert body["mobile_number"] == "+15550100101"
    assert "id" in body
    assert "created_at" in body
    assert "password" not in body


def test_register_duplicate_email_returns_409(test_client) -> None:
    payload = register_payload(email="dup@example.com", mobile_number="+15550100102")
    first = test_client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = test_client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert "email" in second.json()["detail"]


def test_register_duplicate_mobile_number_returns_409(test_client) -> None:
    first = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="mobile-owner@example.com", mobile_number="+15550100103"),
    )
    assert first.status_code == 201
    second = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="different-email@example.com", mobile_number="+15550100103"),
    )
    assert second.status_code == 409
    assert "mobile number" in second.json()["detail"]


def test_register_missing_name_or_mobile_returns_422(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json={"email": "incomplete@example.com", "password": "Passw0rd"},
    )
    assert response.status_code == 422


def test_register_invalid_mobile_number_returns_422(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="badmobile@example.com", mobile_number="not-a-number"),
    )
    assert response.status_code == 422


def test_register_weak_password_returns_422(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="weak@example.com", password="short", mobile_number="+15550100104"),
    )
    assert response.status_code == 422


def test_register_password_without_numbers_returns_422(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(
            email="weak2@example.com", password="allletterssnodigits", mobile_number="+15550100105"
        ),
    )
    assert response.status_code == 422


def test_register_returns_is_verified_false(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="dob-user@example.com", mobile_number="+15550100106"),
    )
    assert response.status_code == 201
    assert response.json()["is_verified"] is False


def test_register_under_minimum_age_returns_422(test_client) -> None:
    payload = register_payload(email="underage@example.com", mobile_number="+15550100107")
    payload["date_of_birth"] = "2020-01-01"  # well under the minimum registration age
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_future_date_of_birth_returns_422(test_client) -> None:
    payload = register_payload(email="futuredob@example.com", mobile_number="+15550100108")
    payload["date_of_birth"] = "2999-01-01"
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_unknown_security_question_code_returns_422(test_client) -> None:
    payload = register_payload(email="badquestion@example.com", mobile_number="+15550100109")
    payload["security_question_code"] = "NOT_A_REAL_CODE"
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_missing_security_answer_returns_422(test_client) -> None:
    payload = register_payload(email="missinganswer@example.com", mobile_number="+15550100110")
    del payload["security_answer"]
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_response_never_exposes_date_of_birth_or_security_answer(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="noleak@example.com", mobile_number="+15550100111"),
    )
    assert response.status_code == 201
    body = response.json()
    assert "date_of_birth" not in body
    assert "security_answer" not in body
    assert "security_question_code" not in body
