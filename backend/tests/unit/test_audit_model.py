"""Direct unit test for the AuditEvent ORM model, exercising the occurred_at
Python-side default (_utcnow) which only fires when a row is persisted without
an explicit occurred_at value.
"""

from __future__ import annotations

import uuid
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.models.audit import AuditEvent, AuditEventType


@pytest.mark.asyncio
async def test_audit_event_persists_with_default_timestamp(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        event = AuditEvent(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user_id=uuid.uuid4(),
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)

        assert isinstance(event.occurred_at, datetime)
        assert event.event_type == AuditEventType.LOGIN_SUCCESS
