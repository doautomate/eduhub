"""Unit tests for DOB/age and security-question-code validation on `RegisterRequest` (T029)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from src.core.config import get_settings
from src.schemas.auth import RegisterRequest

_BASE_FIELDS = {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "email": "ada@example.com",
    "mobile_number": "+15550130002",
    "password": "Passw0rd",
    "country": "IN",
    "state_province": "KA",
    "pin_code": "560001",
}


def _today_minus_years(years: int) -> date:
    approx = date.today().replace(year=date.today().year - years)
    return approx - timedelta(days=1)  # ensure strictly past the birthday this year


def test_date_of_birth_in_the_future_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(
            **_BASE_FIELDS,
            date_of_birth=date.today() + timedelta(days=1),
            security_question_code="FIRST_PET",
            security_answer="Rex",
        )


def test_date_of_birth_today_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(
            **_BASE_FIELDS,
            date_of_birth=date.today(),
            security_question_code="FIRST_PET",
            security_answer="Rex",
        )


def test_date_of_birth_under_minimum_age_rejected():
    minimum_age = get_settings().minimum_registration_age_years
    with pytest.raises(ValidationError):
        RegisterRequest(
            **_BASE_FIELDS,
            date_of_birth=_today_minus_years(minimum_age - 1),
            security_question_code="FIRST_PET",
            security_answer="Rex",
        )


def test_date_of_birth_exactly_minimum_age_accepted():
    minimum_age = get_settings().minimum_registration_age_years
    req = RegisterRequest(
        **_BASE_FIELDS,
        date_of_birth=_today_minus_years(minimum_age),
        security_question_code="FIRST_PET",
        security_answer="Rex",
    )
    assert req.security_question_code == "FIRST_PET"


def test_unknown_security_question_code_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(
            **_BASE_FIELDS,
            date_of_birth=_today_minus_years(30),
            security_question_code="NOT_A_REAL_CODE",
            security_answer="Rex",
        )


def test_blank_security_answer_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(
            **_BASE_FIELDS,
            date_of_birth=_today_minus_years(30),
            security_question_code="FIRST_PET",
            security_answer="   ",
        )


def test_valid_security_question_and_answer_accepted():
    req = RegisterRequest(
        **_BASE_FIELDS,
        date_of_birth=_today_minus_years(30),
        security_question_code="BIRTH_CITY",
        security_answer="Bengaluru",
    )
    assert req.security_question_code == "BIRTH_CITY"
    assert req.security_answer == "Bengaluru"
