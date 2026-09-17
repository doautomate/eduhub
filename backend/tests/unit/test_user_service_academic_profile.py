"""Direct unit tests for UserService.update_academic_profile and the request schema's
validation rules that back it (partial-submission rejection, "Other" free-text rule).
"""

from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import UserNotFoundError
from src.repositories.user_repository import UserRepository
from src.schemas.user import UpdateAcademicProfileRequest
from src.services.user_service import UserService


def _new_user_kwargs(email: str, mobile_number: str) -> dict:
    return {
        "email": email,
        "password_hash": "hashed-value",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "mobile_number_encrypted": encrypt_field(mobile_number),
        "mobile_number_lookup_hash": blind_index(mobile_number),
        "country": "IN",
        "state_province": "KA",
        "pin_code": "560001",
        "date_of_birth_encrypted": encrypt_field("1990-01-01"),
        "security_question_code": "FIRST_PET",
        "security_answer_hash": "hashed-answer",
    }


@pytest.mark.asyncio
async def test_update_academic_profile_persists_board_and_standard(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="svc-acad@example.com", mobile_number="+15550111096")
        )

        service = UserService(session)
        updated = await service.update_academic_profile(
            str(created.id), board="CBSE", standard="VIII", board_other=None
        )
        assert updated.board == "CBSE"
        assert updated.standard == "VIII"
        assert updated.board_other is None


@pytest.mark.asyncio
async def test_update_academic_profile_persists_other_board_free_text(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="svc-acad-other@example.com", mobile_number="+15550111095")
        )

        service = UserService(session)
        updated = await service.update_academic_profile(
            str(created.id), board="OTHER", standard="X", board_other="Cambridge Assessment"
        )
        assert updated.board == "OTHER"
        assert updated.board_other == "Cambridge Assessment"


@pytest.mark.asyncio
async def test_update_academic_profile_raises_when_user_not_found(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = UserService(session)
        with pytest.raises(UserNotFoundError):
            await service.update_academic_profile(
                str(uuid.uuid4()), board="CBSE", standard="VIII", board_other=None
            )


@pytest.mark.asyncio
async def test_update_academic_profile_records_audit_event_without_notification(db_engine, monkeypatch):
    """FR-021/G2: academic-profile changes MUST produce a change-history AuditEvent row.
    FR-022/I1: unlike mobile/address changes, academic changes do NOT trigger a
    notification email - FR-022 scopes the security-notification email to
    mobile-number/address changes only."""
    from sqlalchemy import select

    from src.models.audit import AuditEvent, AuditEventType

    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "src.services.user_service.dispatch_profile_change_email",
        lambda to_email, *, changed_section: calls.append((to_email, changed_section)),
    )

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="svc-acad-audit@example.com", mobile_number="+15550111094")
        )

        service = UserService(session)
        await service.update_academic_profile(
            str(created.id), board="CBSE", standard="X", board_other=None
        )

        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.user_id == created.id,
                AuditEvent.event_type == AuditEventType.PROFILE_ACADEMIC_PROFILE_CHANGED,
            )
        )
        events = result.scalars().all()
        changed_fields = {e.event_metadata["field"] for e in events}
        assert changed_fields == {"board", "standard"}

    # No notification email is sent for academic-profile changes (FR-022 scope).
    assert calls == []


@pytest.mark.asyncio
async def test_update_academic_profile_with_no_changes_records_no_audit_event(db_engine):
    from sqlalchemy import select

    from src.models.audit import AuditEvent, AuditEventType

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="svc-acad-noop@example.com", mobile_number="+15550111093")
        )

        service = UserService(session)
        # First call establishes CBSE/X; second call resubmits identical values (no-op).
        await service.update_academic_profile(
            str(created.id), board="CBSE", standard="X", board_other=None
        )
        await service.update_academic_profile(
            str(created.id), board="CBSE", standard="X", board_other=None
        )

        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.user_id == created.id,
                AuditEvent.event_type == AuditEventType.PROFILE_ACADEMIC_PROFILE_CHANGED,
            )
        )
        # Only the first call's genuine changes (board, standard) produced events.
        assert len(result.scalars().all()) == 2


def test_request_schema_rejects_missing_board():
    with pytest.raises(ValidationError):
        UpdateAcademicProfileRequest(standard="VIII")


def test_request_schema_rejects_missing_standard():
    with pytest.raises(ValidationError):
        UpdateAcademicProfileRequest(board="CBSE")


def test_request_schema_rejects_other_without_free_text():
    with pytest.raises(ValidationError):
        UpdateAcademicProfileRequest(board="OTHER", standard="VIII")


def test_request_schema_rejects_other_with_blank_free_text():
    with pytest.raises(ValidationError):
        UpdateAcademicProfileRequest(board="OTHER", standard="VIII", board_other="   ")


def test_request_schema_rejects_non_other_board_with_free_text():
    with pytest.raises(ValidationError):
        UpdateAcademicProfileRequest(board="CBSE", standard="VIII", board_other="Some Board")


def test_request_schema_accepts_other_with_trimmed_free_text():
    request = UpdateAcademicProfileRequest(
        board="OTHER", standard="VIII", board_other="  Cambridge Assessment  "
    )
    assert request.board_other == "Cambridge Assessment"
