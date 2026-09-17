"""User ORM model."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import cast

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import CHAR, TypeDecorator, TypeEngine

from src.db.base import Base


class GUID(TypeDecorator[uuid.UUID]):
    """Platform-independent UUID type: uses PostgreSQL's UUID type, falls back to CHAR(36)."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> TypeEngine[object]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(cast("TypeEngine[object]", PG_UUID()))
        return dialect.type_descriptor(cast("TypeEngine[object]", CHAR(36)))

    def process_bind_param(self, value: uuid.UUID | None, dialect: Dialect) -> str | None:
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value: object | None, dialect: Dialect) -> uuid.UUID | None:
        if value is None:
            return value
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    """A registered account (spec: User Account entity)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    # Fernet-encrypted at rest (FR-017); a plaintext value can no longer be searched/indexed
    # directly, so lookups/uniqueness go through `mobile_number_lookup_hash` instead.
    mobile_number: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile_number_lookup_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    state_province: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(12), nullable=False)
    # Fernet-encrypted ISO date string (FR-017); decrypted only for the one-time age check
    # at registration and for authorized profile reads (never returned by any API response).
    date_of_birth_encrypted: Mapped[str] = mapped_column(String(255), nullable=False)
    security_question_code: Mapped[str] = mapped_column(String(50), nullable=False)
    # Argon2 hash of the normalized (trimmed, lowercased) answer - one-way, like the
    # password, so it can never be revealed (FR-018).
    security_answer_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # OTP-confirmed state (FR-011/012). Sign-in requires `is_active AND is_verified`.
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recovery_locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Academic Profile (009-profile-onboarding-setup, FR-001-FR-012): nullable until the
    # user completes first-login setup - NOT backfilled for pre-existing users (FR-012),
    # so a NULL board/standard is the signal that setup is still required.
    board: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Free-text Board name, populated only when board == "OTHER" (FR-005a).
    board_other: Mapped[str | None] = mapped_column(String(100), nullable=True)
    standard: Mapped[str | None] = mapped_column(String(4), nullable=True)
    # Address Details expansion (013-profile-popover-management, FR-011): both optional,
    # plain text (not Fernet-encrypted, unlike mobile_number/date_of_birth) - consistent
    # with the existing plain-text country/state_province/pin_code columns. NULL/absent
    # for pre-existing rows and any user who hasn't supplied one (FR-019).
    house_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    apartment_building: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
