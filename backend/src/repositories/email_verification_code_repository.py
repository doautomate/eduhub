"""Email verification code (OTP) persistence (async SQLAlchemy)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.email_verification_code import EmailVerificationCode


class EmailVerificationCodeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        user_id: str | uuid.UUID,
        code_hash: str,
        expires_at: datetime,
    ) -> EmailVerificationCode:
        record = EmailVerificationCode(
            user_id=user_id,
            code_hash=code_hash,
            expires_at=expires_at,
        )
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return record

    async def get_latest_active_for_user(
        self, user_id: str | uuid.UUID
    ) -> EmailVerificationCode | None:
        """Return the most recently issued, not-yet-used, not-invalidated code for a user."""
        result = await self._session.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.user_id == user_id,
                EmailVerificationCode.is_used.is_(False),
                EmailVerificationCode.invalidated_at.is_(None),
            )
            .order_by(EmailVerificationCode.created_at.desc())
        )
        return result.scalars().first()

    async def increment_attempt_count(self, code_id: str | uuid.UUID) -> EmailVerificationCode | None:
        result = await self._session.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.id == code_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            return None
        record.attempt_count += 1
        await self._session.commit()
        await self._session.refresh(record)
        return record

    async def mark_used(self, code_id: str | uuid.UUID) -> EmailVerificationCode | None:
        result = await self._session.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.id == code_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            return None
        record.is_used = True
        await self._session.commit()
        await self._session.refresh(record)
        return record

    async def invalidate_active_for_user(self, user_id: str | uuid.UUID) -> None:
        """Invalidate any still-active codes for a user (e.g. before issuing a new one)."""
        result = await self._session.execute(
            select(EmailVerificationCode).where(
                EmailVerificationCode.user_id == user_id,
                EmailVerificationCode.is_used.is_(False),
                EmailVerificationCode.invalidated_at.is_(None),
            )
        )
        now = datetime.now(UTC)
        for record in result.scalars():
            record.invalidated_at = now
        await self._session.commit()
