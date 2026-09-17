"""Security-question-based account recovery (US5, FR-015/016).

Uses a Redis `recovery_failures:{user_id}` counter (matching the existing
`login_failures:{email}` pattern) to trip a lockout via `set_recovery_lock` (T012) after
`recovery_max_failures` wrong answers, and a Redis-backed opaque `reset_token` (mirroring
the existing refresh-token-id pattern) to bridge the answer step and the reset step
without a long-lived, guessable credential.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.exceptions import (
    InvalidResetTokenError,
    InvalidSecurityAnswerError,
    RecoveryLockedError,
    UserNotFoundError,
)
from src.core.logging import log_audit_event
from src.core.security import hash_password, verify_password
from src.data.security_questions import get_question_text
from src.models.audit import AuditEventType
from src.repositories.user_repository import UserRepository
from src.util.datetime_utils import ensure_aware

_FAILURE_KEY_PREFIX = "recovery_failures:"
_RESET_TOKEN_KEY_PREFIX = "password_reset:"
_REFRESH_KEY_PREFIX = "refresh:"
_USER_REFRESH_TOKENS_KEY_PREFIX = "user_refresh_tokens:"
_FAILURE_WINDOW_SECONDS = 15 * 60
_NEUTRAL_QUESTION_TEXT = "What was the name of your first pet?"


class RecoveryService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self._session = session
        self._redis = redis
        self._redis_client = redis
        self._settings = get_settings()
        self._repo = UserRepository(session)

    def _failure_key(self, user_id: str | uuid.UUID) -> str:
        return f"{_FAILURE_KEY_PREFIX}{user_id}"

    def _reset_token_key(self, token: str) -> str:
        return f"{_RESET_TOKEN_KEY_PREFIX}{token}"

    async def start(self, email: str) -> tuple[str, str]:
        """Return (user_id, question_text). Never reveals whether `email` exists - an
        unknown email gets a random-looking placeholder id and a neutral question text
        (FR-005-style non-revealing pattern)."""
        user = await self._repo.get_by_email(email)
        if user is None:
            return str(uuid.uuid4()), _NEUTRAL_QUESTION_TEXT

        if user.recovery_locked_until is not None and ensure_aware(
            user.recovery_locked_until
        ) > datetime.now(UTC):
            raise RecoveryLockedError(user.recovery_locked_until)

        question_text = get_question_text(user.security_question_code) or _NEUTRAL_QUESTION_TEXT
        log_audit_event(AuditEventType.RECOVERY_STARTED.value, user_id=str(user.id))
        return str(user.id), question_text

    async def answer(self, user_id: str, answer: str) -> str:
        """Verify the security-question answer and return a short-lived `reset_token`.

        Raises `InvalidSecurityAnswerError` on a wrong answer, or `RecoveryLockedError`
        once `recovery_max_failures` wrong answers have been made.
        """
        user = await self._repo.get_by_id(user_id)
        if user is None:
            # Same generic failure as a wrong answer - do not reveal account existence.
            raise InvalidSecurityAnswerError()

        if user.recovery_locked_until is not None and ensure_aware(
            user.recovery_locked_until
        ) > datetime.now(UTC):
            raise RecoveryLockedError(user.recovery_locked_until)

        normalized_answer = answer.strip().lower()
        if not verify_password(normalized_answer, user.security_answer_hash):
            failure_key = self._failure_key(user_id)
            count = await self._redis.incr(failure_key)
            if count == 1:
                await self._redis.expire(failure_key, _FAILURE_WINDOW_SECONDS)
            if count >= self._settings.recovery_max_failures:
                locked_until = datetime.now(UTC) + timedelta(
                    minutes=self._settings.recovery_lock_minutes
                )
                await self._repo.set_recovery_lock(user_id, locked_until)
                log_audit_event(AuditEventType.RECOVERY_LOCKED.value, user_id=str(user.id))
                raise RecoveryLockedError(locked_until)
            raise InvalidSecurityAnswerError()

        await self._redis.delete(self._failure_key(user_id))
        reset_token = secrets.token_urlsafe(32)
        await self._redis.set(
            self._reset_token_key(reset_token),
            str(user_id),
            ex=timedelta(minutes=self._settings.recovery_reset_token_expire_minutes),
        )
        return reset_token

    async def reset(self, reset_token: str, new_password: str) -> None:
        """Consume `reset_token`, set the new password, clear any lockout, and revoke all
        existing refresh tokens for the user (FR-016 point 3 - forces re-login)."""
        token_key = self._reset_token_key(reset_token)
        redis_user_id = await self._redis.get(token_key)
        if redis_user_id is None:
            raise InvalidResetTokenError()
        await self._redis.delete(token_key)
        user_id = str(redis_user_id)

        user = await self._repo.update_password_hash(user_id, hash_password(new_password))
        if user is None:
            raise UserNotFoundError(user_id)
        await self._repo.clear_recovery_lock(user_id)
        await self._revoke_all_refresh_tokens(user_id)
        log_audit_event(AuditEventType.RECOVERY_SUCCEEDED.value, user_id=str(user.id))

    async def _revoke_all_refresh_tokens(self, user_id: str) -> None:
        """Force re-login everywhere after a password reset (FR-016 point 3)."""
        set_key = f"{_USER_REFRESH_TOKENS_KEY_PREFIX}{user_id}"
        refresh_token_ids = await self._redis.smembers(set_key)
        for refresh_token_id in refresh_token_ids:
            await self._redis.delete(f"{_REFRESH_KEY_PREFIX}{str(refresh_token_id)}")
        await self._redis.delete(set_key)
