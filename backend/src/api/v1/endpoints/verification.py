"""Email-OTP verification (US4) and security-question account recovery (US5) endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_otp_service_dep, get_recovery_service_dep
from src.core.exceptions import (
    InvalidOtpError,
    InvalidResetTokenError,
    InvalidSecurityAnswerError,
    OtpAttemptsExceededError,
    OtpResendCooldownError,
    RecoveryLockedError,
    UserNotFoundError,
)
from src.schemas.auth import (
    OtpResendRequest,
    OtpVerifyRequest,
    RecoveryAnswerRequest,
    RecoveryAnswerResponse,
    RecoveryResetRequest,
    RecoveryStartRequest,
    RecoveryStartResponse,
)
from src.services.otp_service import OtpService
from src.services.recovery_service import RecoveryService

router = APIRouter()


@router.post("/otp/verify", status_code=status.HTTP_200_OK)
async def verify_otp(
    payload: OtpVerifyRequest, otp_service: OtpService = Depends(get_otp_service_dep)
) -> dict[str, bool]:
    try:
        await otp_service.verify(str(payload.user_id), payload.code)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request.") from exc
    except OtpAttemptsExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new code.",
        ) from exc
    except InvalidOtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "detail": "Incorrect or expired verification code.",
                "attempts_remaining": exc.attempts_remaining,
            },
        ) from exc
    return {"verified": True}


@router.post("/otp/resend", status_code=status.HTTP_202_ACCEPTED)
async def resend_otp(
    payload: OtpResendRequest, otp_service: OtpService = Depends(get_otp_service_dep)
) -> dict[str, bool]:
    try:
        await otp_service.resend(str(payload.user_id))
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request.") from exc
    except OtpResendCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    return {"accepted": True}


@router.post("/recovery/start", response_model=RecoveryStartResponse)
async def start_recovery(
    payload: RecoveryStartRequest,
    recovery_service: RecoveryService = Depends(get_recovery_service_dep),
) -> RecoveryStartResponse:
    try:
        user_id, question_text = await recovery_service.start(payload.email)
    except RecoveryLockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account recovery is temporarily locked. Please try again later.",
        ) from exc
    return RecoveryStartResponse(user_id=uuid.UUID(user_id), question_text=question_text)


@router.post("/recovery/answer", response_model=RecoveryAnswerResponse)
async def answer_recovery(
    payload: RecoveryAnswerRequest,
    recovery_service: RecoveryService = Depends(get_recovery_service_dep),
) -> RecoveryAnswerResponse:
    try:
        reset_token = await recovery_service.answer(str(payload.user_id), payload.answer)
    except RecoveryLockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account recovery is temporarily locked. Please try again later.",
        ) from exc
    except InvalidSecurityAnswerError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect answer.",
        ) from exc
    return RecoveryAnswerResponse(reset_token=reset_token)


@router.post("/recovery/reset")
async def reset_password(
    payload: RecoveryResetRequest,
    recovery_service: RecoveryService = Depends(get_recovery_service_dep),
) -> dict[str, bool]:
    try:
        await recovery_service.reset(payload.reset_token, payload.new_password)
    except (InvalidResetTokenError, UserNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        ) from exc
    return {"reset": True}
