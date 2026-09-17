"""Pydantic v2 request/response schemas for the authenticated user profile endpoint."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from src.core.validators import validate_mobile_number
from src.schemas.auth import _VALID_COUNTRY_CODES


def _normalize_optional_text(value: str | None, *, max_length: int, field_name: str) -> str | None:
    """Blank-to-`NULL` normalization shared by the two new optional address fields
    (data-model.md validation rules): a blank string is stored as `NULL`, not `""`, so
    "not set" has one canonical representation."""
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    if len(stripped) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or fewer.")
    return stripped


class Board(str, Enum):
    """Fixed Board list plus an "Other" free-text fallback (009, Clarification 2026-09-14)."""

    CBSE = "CBSE"
    ICSE = "ICSE"
    IGCSE = "IGCSE"
    IB = "IB"
    STATE_BOARD = "STATE_BOARD"
    OTHER = "OTHER"


class Standard(str, Enum):
    """Standard/Grade IV through XII inclusive (FR-004)."""

    IV = "IV"
    V = "V"
    VI = "VI"
    VII = "VII"
    VIII = "VIII"
    IX = "IX"
    X = "X"
    XI = "XI"
    XII = "XII"


class UserProfileResponse(BaseModel):
    """Profile fields kept out of the JWT (FR-011) and served via GET /api/v1/users/me instead."""

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
    # Academic Profile (009-profile-onboarding-setup): null until first-login setup is
    # completed (FR-001/FR-012); academic_profile_complete is the single source of
    # truth the frontend uses to decide whether to force the setup step (FR-002/FR-007).
    board: Board | None = None
    board_other: str | None = None
    standard: Standard | None = None
    academic_profile_complete: bool
    # Address Details expansion (013-profile-popover-management, FR-011).
    house_number: str | None = None
    apartment_building: str | None = None


class UpdateAddressRequest(BaseModel):
    """PATCH /api/v1/users/me body (User Story 5, FR-018/FR-019).

    Reuses the same country/state/pin validation rules as registration (FR-012).
    """

    country: str = Field(min_length=1, max_length=100)
    state_province: str = Field(min_length=1, max_length=100)
    pin_code: str = Field(min_length=3, max_length=12)
    # New in 013-profile-popover-management (FR-011): both optional, plain text.
    house_number: str | None = Field(default=None, max_length=50)
    apartment_building: str | None = Field(default=None, max_length=150)

    @field_validator("country")
    @classmethod
    def country_must_be_supported(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in _VALID_COUNTRY_CODES:
            raise ValueError("Country is required and must be one of the supported countries.")
        return normalized

    @field_validator("state_province")
    @classmethod
    def state_province_must_not_be_blank(cls, value: str) -> str:
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

    @field_validator("house_number")
    @classmethod
    def house_number_normalize(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value, max_length=50, field_name="House/flat number")

    @field_validator("apartment_building")
    @classmethod
    def apartment_building_normalize(cls, value: str | None) -> str | None:
        return _normalize_optional_text(
            value, max_length=150, field_name="Building/apartment name"
        )


class UpdatePersonalDetailsRequest(BaseModel):
    """PATCH /api/v1/users/me/personal-details body (FR-008/FR-009).

    Only `mobile_number` is accepted - full name and email are intentionally not part of
    this schema's fields at all (not merely read-only in the UI), so the API surface
    itself enforces "only mobile number is editable" rather than relying on the frontend
    to withhold the other fields.
    """

    mobile_number: str

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_must_be_valid(cls, value: str) -> str:
        return validate_mobile_number(value)


class UpdateAcademicProfileRequest(BaseModel):
    """PATCH /api/v1/users/me/academic-profile body.

    Used for both first-login setup (US1) and later edits (US2/US3, FR-009/FR-010) -
    one contract, per research.md's "API surface" decision. Both fields are required
    together (FR-003); board_other is required only when board == OTHER (FR-005a) and
    forbidden otherwise, so the saved state never has a stale free-text value lingering
    after a user switches away from "Other".
    """

    board: Board
    standard: Standard
    board_other: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def board_other_matches_board(self) -> UpdateAcademicProfileRequest:
        if self.board == Board.OTHER:
            if not self.board_other or not self.board_other.strip():
                raise ValueError(
                    'board_other is required and must be non-empty when board is "OTHER".'
                )
            self.board_other = self.board_other.strip()
        elif self.board_other is not None:
            raise ValueError('board_other must be omitted/null unless board is "OTHER".')
        return self


