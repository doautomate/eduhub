"""Unit test: registration password-policy validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.schemas.auth import RegisterRequest

_BASE_FIELDS = {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "email": "a@example.com",
    "mobile_number": "+15550130001",
    "country": "IN",
    "state_province": "KA",
    "pin_code": "560001",
    "date_of_birth": "1995-06-15",
    "security_question_code": "FIRST_PET",
    "security_answer": "Rex",
}


def test_password_too_short_rejected() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(**_BASE_FIELDS, password="Ab1")


def test_password_without_digit_rejected() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(**_BASE_FIELDS, password="Abcdefgh")


def test_password_without_letter_rejected() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(**_BASE_FIELDS, password="12345678")


def test_valid_password_accepted() -> None:
    req = RegisterRequest(**_BASE_FIELDS, password="Passw0rd")
    assert req.password == "Passw0rd"


def test_missing_first_name_rejected() -> None:
    fields = {**_BASE_FIELDS, "first_name": ""}
    with pytest.raises(ValidationError):
        RegisterRequest(**fields, password="Passw0rd")


def test_missing_last_name_rejected() -> None:
    fields = {**_BASE_FIELDS, "last_name": "   "}
    with pytest.raises(ValidationError):
        RegisterRequest(**fields, password="Passw0rd")


def test_invalid_mobile_number_rejected() -> None:
    fields = {**_BASE_FIELDS, "mobile_number": "abc-not-a-number"}
    with pytest.raises(ValidationError):
        RegisterRequest(**fields, password="Passw0rd")


def test_mobile_number_with_country_code_accepted() -> None:
    req = RegisterRequest(**_BASE_FIELDS, password="Passw0rd")
    assert req.mobile_number == "+15550130001"
