"""Persistence for `AuditEvent` rows.

This is the first repository in the codebase that actually writes `AuditEvent` rows to
the database. The pre-existing `log_audit_event()` helper (`src/core/logging.py`), used
by registration/login/recovery flows, only emits a structured log line via the stdlib
`logging` module - it never persists to the `audit_events` table, despite the table/model
already existing. A log line alone does not satisfy the "retrievable later" / queryable
change-history requirement of FR-021 (013-profile-popover-management), so this repository
adds the first real DB-writing path for `AuditEvent`, scoped to the three new
`PROFILE_*` event types. The existing 13 log-only call sites for auth events are
out of scope and are left unchanged.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.audit import AuditEvent, AuditEventType


class AuditEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record_change(
        self,
        *,
        user_id: str | uuid.UUID,
        event_type: AuditEventType,
        field: str,
        old_value: str | None,
        new_value: str | None,
    ) -> AuditEvent:
        """Persist one change-history row for a single changed field (FR-021).

        Callers MUST NOT pass a plaintext value for a field that is stored encrypted at
        rest (e.g. `mobile_number`) - pass the same encrypted representation instead, so
        this audit trail doesn't become a weaker side-channel for recovering the original
        value (data-model.md "Note on mobile_number history values").
        """
        normalized_user_id = (
            user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
        )
        event = AuditEvent(
            event_type=event_type,
            user_id=normalized_user_id,
            event_metadata={
                "field": field,
                "old_value": old_value,
                "new_value": new_value,
            },
        )
        self._session.add(event)
        await self._session.commit()
        await self._session.refresh(event)
        return event
