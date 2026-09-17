"""Pydantic v2 request/response schemas for the auth API."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.core.config import get_settings
from src.core.validators import validate_mobile_number
from src.data.locations import CURATED_COUNTRIES
from src.data.security_questions import is_valid_security_question_code
from src.util.password_strength import min_strength_met

_VALID_COUNTRY_CODES = {c["country_code"] for c in CURATED_COUNTRIES}


def _age_in_years(dob: date, today: date) -> int:
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    mobile_number: str
    password: str = Field(min_length=8)
    country: str = Field(min_length=1, max_length=100)
    state_province: str = Field(min_length=1, max_length=100)
    pin_code: str = Field(min_length=3, max_length=12)
    date_of_birth: date
    security_question_code: str
    security_answer: str = Field(min_length=1)

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field cannot be blank.")
        return stripped

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_must_be_valid(cls, value: str) -> str:
        return validate_mobile_number(value)

    @field_validator("password")
    @classmethod
    def password_must_have_letters_and_numbers(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must include both letters and numbers.")
        # research.md §3: server-side mirror of the client's minimum "Fair" strength bar.
        if not min_strength_met(value):
            raise ValueError("Password is too weak. Use a longer password with mixed character types.")
        return value

    @field_validator("country")
    @classmethod
    def country_must_be_supported(cls, value: str) -> str:
        # FR-010: country MUST be one of the curated, pre-populated countries.
        normalized = value.strip().upper()
        if normalized not in _VALID_COUNTRY_CODES:
            raise ValueError("Country is required and must be one of the supported countries.")
        return normalized

    @field_validator("state_province")
    @classmethod
    def state_province_must_not_be_blank(cls, value: str) -> str:
        # Country/state pairing is validated at the service layer (FR-012), where the
        # already-validated `country` value is available for cross-field validation.
        stripped = value.strip().upper()
        if not stripped:
            raise ValueError("State/Province is required and must belong to the selected country.")
        return stripped

    @field_validator("pin_code")
    @classmethod
    def pin_code_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Pin/Postal code is required (3-12 characters).")
        return stripped

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_must_be_real_past_date_and_meet_minimum_age(cls, value: date) -> date:
        today = datetime.now(UTC).date()
        if value >= today:
            raise ValueError("Date of birth must be a real date in the past.")
        settings = get_settings()
        if _age_in_years(value, today) < settings.minimum_registration_age_years:
            # Raised as a plain ValueError here (Pydantic 422) rather than
            # `UnderMinimumAgeError` - the service layer never sees an invalid DOB.
            raise ValueError(
                f"You must be at least {settings.minimum_registration_age_years} years old to register."
            )
        return value

    @field_validator("security_question_code")
    @classmethod
    def security_question_code_must_be_known(cls, value: str) -> str:
        stripped = value.strip()
        if not is_valid_security_question_code(stripped):
            raise ValueError("Security question must be one of the supported questions.")
        return stripped

    @field_validator("security_answer")
    @classmethod
    def security_answer_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Security answer cannot be blank.")
        return stripped


class RegisterResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    mobile_number: str
    country: str
    state_province: str
    pin_code: str
    is_verified: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class OtpVerifyRequest(BaseModel):
    """POST /api/v1/auth/otp/verify body (US4, FR-013)."""

    user_id: uuid.UUID
    code: str = Field(min_length=1, max_length=32)


class OtpResendRequest(BaseModel):
    """POST /api/v1/auth/otp/resend body (US4, FR-014)."""

    user_id: uuid.UUID


class RecoveryStartRequest(BaseModel):
    """POST /api/v1/auth/recovery/start body (US5, FR-015)."""

    email: EmailStr


class RecoveryStartResponse(BaseModel):
    user_id: uuid.UUID
    question_text: str


class RecoveryAnswerRequest(BaseModel):
    """POST /api/v1/auth/recovery/answer body (US5, FR-016)."""

    user_id: uuid.UUID
    answer: str = Field(min_length=1)


class RecoveryAnswerResponse(BaseModel):
    reset_token: str


class RecoveryResetRequest(BaseModel):
    """POST /api/v1/auth/recovery/reset body (US5, FR-016)."""

    reset_token: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def new_password_must_meet_strength_bar(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must include both letters and numbers.")
        if not min_strength_met(value):
            raise ValueError("Password is too weak. Use a longer password with mixed character types.")
        return value
