"""Audit event ORM model (spec: FR-011 authentication event logging)."""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base
from src.models.user import GUID


class AuditEventType(str, enum.Enum):
    REGISTRATION = "registration"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    EMAIL_VERIFICATION_SENT = "email_verification_sent"
    EMAIL_VERIFIED = "email_verified"
    RECOVERY_STARTED = "recovery_started"
    RECOVERY_SUCCEEDED = "recovery_succeeded"
    RECOVERY_LOCKED = "recovery_locked"
    # 013-profile-popover-management (FR-021): one event per changed field, recorded via
    # AuditEventRepository.record_change() - the first real DB-writing path for this model
    # (see audit_event_repository.py docstring).
    PROFILE_MOBILE_NUMBER_CHANGED = "profile_mobile_number_changed"
    PROFILE_ADDRESS_CHANGED = "profile_address_changed"
    PROFILE_ACADEMIC_PROFILE_CHANGED = "profile_academic_profile_changed"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class AuditEvent(Base):
    """A recorded authentication-related security event."""

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[AuditEventType] = mapped_column(Enum(AuditEventType), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
