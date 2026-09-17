"""Registration, login, token issuance/revocation, and CAPTCHA gate logic."""

from __future__ import annotations

from datetime import date, timedelta

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import (
    CaptchaRequiredError,
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    MobileNumberAlreadyRegisteredError,
    StateProvinceMismatchError,
)
from src.core.logging import log_audit_event
from src.core.security import (
    create_access_token,
    create_refresh_token_id,
    hash_password,
    verify_password,
)
from src.models.audit import AuditEventType
from src.models.user import User
from src.repositories.user_repository import UserRepository
from src.services.captcha_service import verify_captcha
from src.services.location_service import LocationService
from src.services.otp_service import OtpService

_REFRESH_KEY_PREFIX = "refresh:"
_USER_REFRESH_TOKENS_KEY_PREFIX = "user_refresh_tokens:"
_FAILURE_KEY_PREFIX = "login_failures:"
_FAILURE_WINDOW_SECONDS = 15 * 60


class AuthService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self._session = session
        self._redis = redis
        self._repo = UserRepository(session)
        self._settings = get_settings()
        self._location_service = LocationService()
        self._otp_service = OtpService(session, redis)

    async def register(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        mobile_number: str,
        country: str,
        state_province: str,
        pin_code: str,
        date_of_birth: date,
        security_question_code: str,
        security_answer: str,
    ) -> User:
        # FR-007: uniqueness is enforced independently per field - a match on either the
        # email or the mobile number (even against two different existing accounts) blocks
        # registration.
        existing_email = await self._repo.get_by_email(email)
        if existing_email is not None:
            raise EmailAlreadyRegisteredError(email)
        existing_mobile = await self._repo.get_by_mobile_number(mobile_number)
        if existing_mobile is not None:
            raise MobileNumberAlreadyRegisteredError(mobile_number)
        # FR-012: state/province must belong to the selected country; country itself is
        # already constrained to the curated set by the Pydantic schema's enum validation.
        if not self._location_service.is_valid_state_for_country(country, state_province):
            raise StateProvinceMismatchError(country, state_province)
        normalized_mobile = mobile_number.strip()
        user = await self._repo.create(
            email=email,
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            mobile_number_encrypted=encrypt_field(normalized_mobile),
            mobile_number_lookup_hash=blind_index(normalized_mobile),
            country=country,
            state_province=state_province,
            pin_code=pin_code,
            date_of_birth_encrypted=encrypt_field(date_of_birth.isoformat()),
            security_question_code=security_question_code,
            # Normalize (trim + lowercase) before hashing so answer matching at recovery
            # time is not sensitive to casing/whitespace (FR-016).
            security_answer_hash=hash_password(security_answer.strip().lower()),
        )
        log_audit_event(AuditEventType.REGISTRATION.value, user_id=str(user.id))
        # FR-011: registration always ends in a pending-verification state with an OTP sent.
        await self._otp_service.issue(user)
        log_audit_event(AuditEventType.EMAIL_VERIFICATION_SENT.value, user_id=str(user.id))
        return user

    async def _failure_key(self, email: str) -> str:
        return f"{_FAILURE_KEY_PREFIX}{email.strip().lower()}"

    async def get_failure_count(self, email: str) -> int:
        value = await self._redis.get(await self._failure_key(email))
        return int(value) if value else 0

    async def _record_failure(self, email: str) -> None:
        key = await self._failure_key(email)
        count = await self._redis.incr(key)
        if count == 1:
            await self._redis.expire(key, _FAILURE_WINDOW_SECONDS)

    async def _reset_failures(self, email: str) -> None:
        await self._redis.delete(await self._failure_key(email))

    async def login(self, email: str, password: str, captcha_token: str | None) -> tuple[str, int, str]:
        """Authenticate and issue tokens. Returns (access_token, expires_in, refresh_token_id)."""
        failure_count = await self.get_failure_count(email)
        if failure_count >= self._settings.login_failure_threshold:
            if not await verify_captcha(captcha_token):
                raise CaptchaRequiredError()

        user = await self._repo.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            await self._record_failure(email)
            log_audit_event(AuditEventType.LOGIN_FAILURE.value)
            raise InvalidCredentialsError()

        if not user.is_verified:
            # Wrong-password and unverified-account paths are distinguished only after the
            # password check succeeds (FR-012): an attacker probing a random unverified
            # email still only ever gets the generic invalid-credentials message unless
            # they already know the correct password.
            raise EmailNotVerifiedError()

        await self._reset_failures(email)
        access_token, expires_in = create_access_token(subject=str(user.id))
        refresh_token_id = create_refresh_token_id()
        await self._redis.set(
            f"{_REFRESH_KEY_PREFIX}{refresh_token_id}",
            str(user.id),
            ex=timedelta(days=self._settings.refresh_token_expire_days),
        )
        # Tracked so account-recovery (FR-016 point 3) can revoke every outstanding
        # session for this user, not just the one refresh token being used right now.
        await self._redis.sadd(f"{_USER_REFRESH_TOKENS_KEY_PREFIX}{user.id}", refresh_token_id)
        log_audit_event(AuditEventType.LOGIN_SUCCESS.value, user_id=str(user.id))
        return access_token, expires_in, refresh_token_id

    async def refresh(self, refresh_token_id: str) -> tuple[str, int]:
        """Issue a new access token from a still-valid, non-revoked refresh token."""
        user_id = await self._redis.get(f"{_REFRESH_KEY_PREFIX}{refresh_token_id}")
        if user_id is None:
            raise InvalidRefreshTokenError()
        access_token, expires_in = create_access_token(subject=str(user_id))
        return access_token, expires_in

    async def logout(self, refresh_token_id: str, user_id: str | None = None) -> None:
        """Revoke the refresh token so it can no longer renew a session."""
        resolved_user_id = user_id or await self._redis.get(
            f"{_REFRESH_KEY_PREFIX}{refresh_token_id}"
        )
        await self._redis.delete(f"{_REFRESH_KEY_PREFIX}{refresh_token_id}")
        if resolved_user_id is not None:
            await self._redis.srem(
                f"{_USER_REFRESH_TOKENS_KEY_PREFIX}{str(resolved_user_id)}", refresh_token_id
            )
        log_audit_event(AuditEventType.LOGOUT.value, user_id=user_id)
