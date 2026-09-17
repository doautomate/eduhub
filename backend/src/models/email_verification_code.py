"""Email verification code (OTP) ORM model (spec: Email Verification Code entity)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base
from src.models.user import GUID


def _utcnow() -> datetime:
    return datetime.now(UTC)


class EmailVerificationCode(Base):
    """A one-time email verification code (OTP) issued for a user (FR-011/013/014).

    Only a hash of the code is stored (`code_hash`), mirroring the password-hash
    precedent - a DB read alone can never reveal a valid code. Rows are retained (not
    deleted) after use/invalidation for audit purposes.
    """

    __tablename__ = "email_verification_codes"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
