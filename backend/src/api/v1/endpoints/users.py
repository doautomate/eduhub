"""Authenticated user profile endpoint (FR-011: profile fields are never in the JWT)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_user_service_dep
from src.core.encryption import decrypt_field
from src.core.exceptions import (
    MobileNumberAlreadyRegisteredError,
    StateProvinceMismatchError,
    UserNotFoundError,
)
from src.middleware.auth_middleware import get_current_user_id
from src.models.user import User
from src.schemas.user import (
    Board,
    Standard,
    UpdateAcademicProfileRequest,
    UpdateAddressRequest,
    UpdatePersonalDetailsRequest,
    UserProfileResponse,
)
from src.services.user_service import UserService

router = APIRouter()


def _to_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        mobile_number=decrypt_field(user.mobile_number),
        country=user.country,
        state_province=user.state_province,
        pin_code=user.pin_code,
        is_verified=user.is_verified,
        created_at=user.created_at,
        board=Board(user.board) if user.board is not None else None,
        board_other=user.board_other,
        standard=Standard(user.standard) if user.standard is not None else None,
        academic_profile_complete=user.board is not None and user.standard is not None,
        house_number=user.house_number,
        apartment_building=user.apartment_building,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
    user_service: UserService = Depends(get_user_service_dep),
) -> UserProfileResponse:
    try:
        user = await user_service.get_profile(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from exc
    return _to_response(user)


@router.patch("/me", response_model=UserProfileResponse)
async def update_current_user_address(
    payload: UpdateAddressRequest,
    user_id: str = Depends(get_current_user_id),
    user_service: UserService = Depends(get_user_service_dep),
) -> UserProfileResponse:
    try:
        user = await user_service.update_address(
            user_id,
            payload.country,
            payload.state_province,
            payload.pin_code,
            house_number=payload.house_number,
            apartment_building=payload.apartment_building,
        )
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from exc
    except StateProvinceMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="State/Province is required and must belong to the selected country.",
        ) from exc
    return _to_response(user)


@router.patch("/me/personal-details", response_model=UserProfileResponse)
async def update_current_user_personal_details(
    payload: UpdatePersonalDetailsRequest,
    user_id: str = Depends(get_current_user_id),
    user_service: UserService = Depends(get_user_service_dep),
) -> UserProfileResponse:
    """Mobile-number-only update (013-profile-popover-management, FR-008/FR-009). Full
    name and email are read-only and are not part of this request schema at all."""
    try:
        user = await user_service.update_personal_details(user_id, payload.mobile_number)
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from exc
    except MobileNumberAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This mobile number is already associated with another account.",
        ) from exc
    return _to_response(user)


@router.patch("/me/academic-profile", response_model=UserProfileResponse)
async def update_current_user_academic_profile(
    payload: UpdateAcademicProfileRequest,
    user_id: str = Depends(get_current_user_id),
    user_service: UserService = Depends(get_user_service_dep),
) -> UserProfileResponse:
    """First-login setup (US1) and later edits (US3) share this one endpoint (FR-003,
    FR-006, FR-009/FR-010); board/board_other pairing is already validated by
    `UpdateAcademicProfileRequest` (FR-005a)."""
    try:
        user = await user_service.update_academic_profile(
            user_id,
            board=payload.board.value,
            standard=payload.standard.value,
            board_other=payload.board_other,
        )
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from exc
    return _to_response(user)

