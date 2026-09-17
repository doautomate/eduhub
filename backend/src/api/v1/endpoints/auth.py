"""Auth endpoints: register, login, logout, refresh (contracts/auth-api.md)."""

from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse

from src.api.deps import get_auth_service_dep
from src.core.exceptions import (
    CaptchaRequiredError,
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    MobileNumberAlreadyRegisteredError,
    StateProvinceMismatchError,
)
from src.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from src.services.auth_service import AuthService

router = APIRouter()

_REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token_id: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=refresh_token_id,
        httponly=True,
        secure=True,
        samesite="strict",
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest, auth_service: AuthService = Depends(get_auth_service_dep)
) -> RegisterResponse:
    try:
        user = await auth_service.register(
            payload.email,
            payload.password,
            payload.first_name,
            payload.last_name,
            payload.mobile_number,
            payload.country,
            payload.state_province,
            payload.pin_code,
            payload.date_of_birth,
            payload.security_question_code,
            payload.security_answer,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from exc
    except MobileNumberAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this mobile number already exists.",
        ) from exc
    except StateProvinceMismatchError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="State/Province is required and must belong to the selected country.",
        ) from exc
    return RegisterResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        mobile_number=payload.mobile_number,
        country=user.country,
        state_province=user.state_province,
        pin_code=user.pin_code,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service_dep),
) -> TokenResponse:
    try:
        access_token, expires_in, refresh_token_id = await auth_service.login(
            payload.email, payload.password, payload.captcha_token
        )
    except CaptchaRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="CAPTCHA verification required.",
        ) from exc
    except EmailNotVerifiedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "detail": "Please verify your email address before signing in.",
                "reason": "EMAIL_NOT_VERIFIED",
            },
        ) from exc
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        ) from exc
    _set_refresh_cookie(response, refresh_token_id)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_token: str | None = Cookie(default=None, alias=_REFRESH_COOKIE_NAME),
    auth_service: AuthService = Depends(get_auth_service_dep),
) -> TokenResponse | JSONResponse:
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active session.")
    try:
        access_token, expires_in = await auth_service.refresh(refresh_token)
    except InvalidRefreshTokenError:
        # Build the error response directly rather than raising HTTPException: FastAPI
        # constructs a brand-new Response for exception handlers, so mutations (like
        # delete_cookie) made on the injected `response` here would otherwise be lost.
        error_response = JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Session expired. Please log in again."},
        )
        error_response.delete_cookie(_REFRESH_COOKIE_NAME)
        return error_response
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=_REFRESH_COOKIE_NAME),
    auth_service: AuthService = Depends(get_auth_service_dep),
) -> None:
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active session.")
    await auth_service.logout(refresh_token)
    response.delete_cookie(_REFRESH_COOKIE_NAME)
