"""OTP issuance/verification/resend for account-email verification (US4, FR-011/013/014).

Code hashing reuses the existing Argon2 `passlib` context (`core/security.py`) - the same
pattern as password hashing - so a DB read alone can never reveal a valid code. Attempt
counting is tracked on the `EmailVerificationCode` row itself (research.md §5 uses Redis
counters for `login_failures`; here the row already carries `attempt_count`, so a second,
redundant Redis counter is not introduced). Resend cooldown uses a Redis TTL key, matching
the existing Redis-backed throttling pattern.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.exceptions import (
    InvalidOtpError,
    OtpAttemptsExceededError,
    OtpResendCooldownError,
    UserNotFoundError,
)
from src.core.logging import log_audit_event
from src.core.security import hash_password, verify_password
from src.models.audit import AuditEventType
from src.models.user import User
from src.repositories.email_verification_code_repository import EmailVerificationCodeRepository
from src.repositories.user_repository import UserRepository
from src.tasks.email_tasks import dispatch_otp_email
from src.util.datetime_utils import ensure_aware

_RESEND_COOLDOWN_KEY_PREFIX = "otp_resend_cooldown:"


class OtpService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self._session = session
        self._redis = redis
        self._settings = get_settings()
        self._user_repo = UserRepository(session)
        self._code_repo = EmailVerificationCodeRepository(session)

    def _generate_code(self) -> str:
        digits = "0123456789"
        return "".join(secrets.choice(digits) for _ in range(self._settings.otp_code_length))

    def _cooldown_key(self, user_id: str | uuid.UUID) -> str:
        return f"{_RESEND_COOLDOWN_KEY_PREFIX}{user_id}"

    async def issue(self, user: User) -> None:
        """Invalidate any active code for `user`, issue a fresh one, and dispatch the email."""
        await self._code_repo.invalidate_active_for_user(user.id)
        code = self._generate_code()
        expires_at = datetime.now(UTC) + timedelta(minutes=self._settings.otp_expiry_minutes)
        await self._code_repo.create(
            user_id=user.id, code_hash=hash_password(code), expires_at=expires_at
        )
        await self._redis.set(
            self._cooldown_key(user.id), "1", ex=self._settings.otp_resend_cooldown_seconds
        )
        dispatch_otp_email(user.email, code)
        log_audit_event(AuditEventType.EMAIL_VERIFICATION_SENT.value, user_id=str(user.id))

    async def verify(self, user_id: str | uuid.UUID, code: str) -> None:
        """Verify `code` against the active OTP for `user_id`.

        Raises `InvalidOtpError` (wrong/expired code, with attempts remaining) or
        `OtpAttemptsExceededError` (attempt limit reached; caller must resend). On success
        marks the user verified and the code used.
        """
        active_code = await self._code_repo.get_latest_active_for_user(user_id)
        if active_code is None or ensure_aware(active_code.expires_at) < datetime.now(UTC):
            raise InvalidOtpError(attempts_remaining=0)

        if active_code.attempt_count >= self._settings.otp_max_attempts:
            raise OtpAttemptsExceededError()

        if not verify_password(code, active_code.code_hash):
            updated = await self._code_repo.increment_attempt_count(active_code.id)
            if updated is None:
                raise UserNotFoundError(str(user_id))
            attempts_remaining = max(
                0, self._settings.otp_max_attempts - updated.attempt_count
            )
            if attempts_remaining == 0:
                raise OtpAttemptsExceededError()
            raise InvalidOtpError(attempts_remaining=attempts_remaining)

        await self._code_repo.mark_used(active_code.id)
        user = await self._user_repo.mark_verified(user_id)
        if user is None:
            raise UserNotFoundError(str(user_id))
        log_audit_event(AuditEventType.EMAIL_VERIFIED.value, user_id=str(user_id))

    async def resend(self, user_id: str | uuid.UUID) -> None:
        """Issue a fresh OTP, subject to the resend cooldown."""
        if await self._redis.get(self._cooldown_key(user_id)):
            ttl = await self._redis.ttl(self._cooldown_key(user_id))
            raise OtpResendCooldownError(retry_after_seconds=max(ttl, 0))

        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(str(user_id))
        await self.issue(user)
