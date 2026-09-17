"""Direct unit tests for UserService (bypassing the HTTP layer)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import StateProvinceMismatchError, UserNotFoundError
from src.repositories.user_repository import UserRepository
from src.services.user_service import UserService


def _new_user_kwargs(
    email: str,
    mobile_number: str,
    password_hash: str = "hashed-value",
    first_name: str = "Ada",
    last_name: str = "Lovelace",
    country: str = "IN",
    state_province: str = "KA",
    pin_code: str = "560001",
) -> dict:
    """Build kwargs for `UserRepository.create`, performing the encryption/hashing a
    caller (AuthService) is responsible for before persisting a new user."""
    return {
        "email": email,
        "password_hash": password_hash,
        "first_name": first_name,
        "last_name": last_name,
        "mobile_number_encrypted": encrypt_field(mobile_number),
        "mobile_number_lookup_hash": blind_index(mobile_number),
        "country": country,
        "state_province": state_province,
        "pin_code": pin_code,
        "date_of_birth_encrypted": encrypt_field("1990-01-01"),
        "security_question_code": "FIRST_PET",
        "security_answer_hash": "hashed-answer",
    }


@pytest.mark.asyncio
async def test_get_profile_returns_user_when_found(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(
                email="service-profile@example.com",
                mobile_number="+15550111099",
                first_name="Grace",
                last_name="Hopper",
            )
        )

        service = UserService(session)
        found = await service.get_profile(str(created.id))
        assert found.id == created.id
        assert found.first_name == "Grace"


@pytest.mark.asyncio
async def test_get_profile_raises_when_user_not_found(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = UserService(session)
        with pytest.raises(UserNotFoundError):
            await service.get_profile(str(uuid.uuid4()))


@pytest.mark.asyncio
async def test_update_address_updates_and_returns_user(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="update-address@example.com", mobile_number="+15550111098")
        )

        service = UserService(session)
        updated = await service.update_address(str(created.id), "US", "CA", "94105")
        assert updated.country == "US"
        assert updated.state_province == "CA"
        assert updated.pin_code == "94105"


@pytest.mark.asyncio
async def test_update_address_raises_when_state_does_not_belong_to_country(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="mismatch-address@example.com", mobile_number="+15550111097")
        )

        service = UserService(session)
        with pytest.raises(StateProvinceMismatchError):
            await service.update_address(str(created.id), "IN", "ZZ", "560001")


@pytest.mark.asyncio
async def test_update_address_raises_when_user_not_found(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = UserService(session)
        with pytest.raises(UserNotFoundError):
            await service.update_address(str(uuid.uuid4()), "IN", "KA", "560001")


# --- 013-profile-popover-management: personal-details/address audit + notification ---


@pytest.fixture(autouse=True)
def _capture_profile_change_emails(monkeypatch):
    """Replace the fire-and-forget email dispatcher with a synchronous fake so tests can
    assert on notification calls deterministically, without waiting on a background
    asyncio task (mirrors conftest.py's `_capture_otp_codes` pattern for OTP emails)."""
    calls: list[tuple[str, str]] = []

    def _fake_dispatch(to_email: str, *, changed_section: str) -> None:
        calls.append((to_email, changed_section))

    monkeypatch.setattr(
        "src.services.user_service.dispatch_profile_change_email", _fake_dispatch
    )
    yield calls


@pytest.mark.asyncio
async def test_update_personal_details_updates_mobile_number(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="personal-details@example.com", mobile_number="+15550144001")
        )
        service = UserService(session)
        updated = await service.update_personal_details(str(created.id), "+15550144999")
        assert updated.id == created.id
        found = await repo.get_by_mobile_number("+15550144999")
        assert found is not None
        assert found.id == created.id


@pytest.mark.asyncio
async def test_update_personal_details_records_audit_event_and_notifies(
    db_engine, _capture_profile_change_emails
):
    from sqlalchemy import select

    from src.models.audit import AuditEvent, AuditEventType

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="personal-details-audit@example.com", mobile_number="+15550144002")
        )
        service = UserService(session)
        await service.update_personal_details(str(created.id), "+15550144998")

        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.user_id == created.id,
                AuditEvent.event_type == AuditEventType.PROFILE_MOBILE_NUMBER_CHANGED,
            )
        )
        events = result.scalars().all()
        assert len(events) == 1
        assert events[0].event_metadata["field"] == "mobile_number"
        # old/new values must be the encrypted representation, never raw plaintext.
        assert "+15550144002" not in str(events[0].event_metadata["old_value"])
        assert "+15550144998" not in str(events[0].event_metadata["new_value"])

    assert ("personal-details-audit@example.com", "mobile number") in _capture_profile_change_emails


@pytest.mark.asyncio
async def test_update_personal_details_raises_on_duplicate_and_records_no_audit_event(
    db_engine, _capture_profile_change_emails
):
    from sqlalchemy import select

    from src.core.exceptions import MobileNumberAlreadyRegisteredError
    from src.models.audit import AuditEvent, AuditEventType

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        await repo.create(
            **_new_user_kwargs(email="dupe-1@example.com", mobile_number="+15550144003")
        )
        second = await repo.create(
            **_new_user_kwargs(email="dupe-2@example.com", mobile_number="+15550144004")
        )
        service = UserService(session)
        with pytest.raises(MobileNumberAlreadyRegisteredError):
            await service.update_personal_details(str(second.id), "+15550144003")

        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.event_type == AuditEventType.PROFILE_MOBILE_NUMBER_CHANGED
            )
        )
        assert result.scalars().all() == []
    assert _capture_profile_change_emails == []


@pytest.mark.asyncio
async def test_update_address_records_one_audit_event_per_changed_field_and_notifies(
    db_engine, _capture_profile_change_emails
):
    from sqlalchemy import select

    from src.models.audit import AuditEvent, AuditEventType

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="address-audit@example.com", mobile_number="+15550144005")
        )
        service = UserService(session)
        await service.update_address(
            str(created.id),
            "IN",
            "KA",
            "560002",
            house_number="12B",
            apartment_building="Sunrise Apartments",
        )
        # pin_code, house_number, apartment_building changed (country/state unchanged) = 3 events
        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.user_id == created.id,
                AuditEvent.event_type == AuditEventType.PROFILE_ADDRESS_CHANGED,
            )
        )
        events = result.scalars().all()
        changed_fields = {e.event_metadata["field"] for e in events}
        assert changed_fields == {"pin_code", "house_number", "apartment_building"}

    assert ("address-audit@example.com", "address") in _capture_profile_change_emails


@pytest.mark.asyncio
async def test_update_address_with_no_changes_records_no_audit_event_or_notification(
    db_engine, _capture_profile_change_emails
):
    from sqlalchemy import select

    from src.models.audit import AuditEvent, AuditEventType

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="address-noop@example.com", mobile_number="+15550144006")
        )
        service = UserService(session)
        # Same values as already stored - no actual change.
        await service.update_address(str(created.id), "IN", "KA", "560001")

        result = await session.execute(
            select(AuditEvent).where(
                AuditEvent.user_id == created.id,
                AuditEvent.event_type == AuditEventType.PROFILE_ADDRESS_CHANGED,
            )
        )
        assert result.scalars().all() == []
    assert _capture_profile_change_emails == []


