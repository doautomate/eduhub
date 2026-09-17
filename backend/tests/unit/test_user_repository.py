"""Direct unit tests for UserRepository (bypassing the HTTP/service layers).

Uses the SQLite in-memory `db_engine` fixture for fast logic checks, and the real
Postgres `postgres_engine` fixture (T013a) for the methods added alongside the
encryption/verification/recovery fields (T012), where testing against a real DB (unique
constraint enforcement, etc.) rather than a SQLite mock matters.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.encryption import blind_index, encrypt_field
from src.repositories.user_repository import UserRepository


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
async def test_get_by_email_returns_none_when_absent(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        found = await repo.get_by_email("nobody@example.com")
        assert found is None


@pytest.mark.asyncio
async def test_get_by_mobile_number_returns_none_when_absent(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        found = await repo.get_by_mobile_number("+15559999999")
        assert found is None


@pytest.mark.asyncio
async def test_create_and_get_by_email_is_case_insensitive(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="MixedCase@Example.com", mobile_number="+15550111001")
        )
        assert created.email == "mixedcase@example.com"
        assert created.first_name == "Ada"
        assert created.last_name == "Lovelace"
        # mobile_number is stored Fernet-encrypted at rest (FR-017): never the raw digits.
        assert created.mobile_number != "+15550111001"

        found_lower = await repo.get_by_email("mixedcase@example.com")
        found_exact = await repo.get_by_email("MixedCase@Example.com")
        assert found_lower is not None
        assert found_lower.id == created.id
        assert found_exact is not None
        assert found_exact.id == created.id


@pytest.mark.asyncio
async def test_get_by_mobile_number_finds_created_user(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="mobile-lookup@example.com", mobile_number="+15550111002")
        )
        found = await repo.get_by_mobile_number("+15550111002")
        assert found is not None
        assert found.id == created.id


@pytest.mark.asyncio
async def test_get_by_id_finds_created_user(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="by-id@example.com", mobile_number="+15550111003")
        )
        found = await repo.get_by_id(created.id)
        assert found is not None
        assert found.email == "by-id@example.com"

        found_by_str = await repo.get_by_id(str(created.id))
        assert found_by_str is not None
        assert found_by_str.id == created.id


@pytest.mark.asyncio
async def test_get_by_id_returns_none_for_malformed_id(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        found = await repo.get_by_id("not-a-uuid")
        assert found is None


@pytest.mark.asyncio
async def test_get_by_id_returns_none_when_absent(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        found = await repo.get_by_id("11111111-1111-1111-1111-111111111111")
        assert found is None


# --- Testcontainer-backed tests (T013a): real Postgres, not a SQLite mock. ---


@pytest.mark.asyncio
async def test_mobile_number_lookup_hash_unique_constraint_enforced_on_postgres(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        await repo.create(
            **_new_user_kwargs(email="dupe-mobile-1@example.com", mobile_number="+15550122001")
        )
    async with session_factory() as session:
        repo = UserRepository(session)
        with pytest.raises(IntegrityError):
            await repo.create(
                **_new_user_kwargs(
                    email="dupe-mobile-2@example.com", mobile_number="+15550122001"
                )
            )


@pytest.mark.asyncio
async def test_mark_verified_sets_is_verified_true(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="verify-me@example.com", mobile_number="+15550122002")
        )
        assert created.is_verified is False

        updated = await repo.mark_verified(created.id)
        assert updated is not None
        assert updated.is_verified is True

    async with session_factory() as session:
        repo = UserRepository(session)
        reloaded = await repo.get_by_id(created.id)
        assert reloaded.is_verified is True


@pytest.mark.asyncio
async def test_mark_verified_returns_none_when_absent(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        result = await repo.mark_verified("11111111-1111-1111-1111-111111111111")
        assert result is None


@pytest.mark.asyncio
async def test_set_and_clear_recovery_lock(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="recovery-lock@example.com", mobile_number="+15550122003")
        )
        lock_until = datetime.now(UTC) + timedelta(minutes=30)

        locked = await repo.set_recovery_lock(created.id, lock_until)
        assert locked is not None
        assert locked.recovery_locked_until is not None

        cleared = await repo.clear_recovery_lock(created.id)
        assert cleared is not None
        assert cleared.recovery_locked_until is None


@pytest.mark.asyncio
async def test_update_password_hash_persists_new_hash(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="reset-password@example.com", mobile_number="+15550122004")
        )
        updated = await repo.update_password_hash(created.id, "new-hashed-value")
        assert updated is not None
        assert updated.password_hash == "new-hashed-value"

    async with session_factory() as session:
        repo = UserRepository(session)
        reloaded = await repo.get_by_id(created.id)
        assert reloaded.password_hash == "new-hashed-value"


# --- 013-profile-popover-management: update_mobile_number(), extended update_address() ---


@pytest.mark.asyncio
async def test_update_mobile_number_persists_new_encrypted_value(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="mobile-update@example.com", mobile_number="+15550133001")
        )
        updated = await repo.update_mobile_number(created.id, "+15550133999")
        assert updated is not None
        found = await repo.get_by_mobile_number("+15550133999")
        assert found is not None
        assert found.id == created.id
        # old number no longer resolves
        assert await repo.get_by_mobile_number("+15550133001") is None


@pytest.mark.asyncio
async def test_update_mobile_number_rejects_duplicate(db_engine):
    from src.core.exceptions import MobileNumberAlreadyRegisteredError

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        first = await repo.create(
            **_new_user_kwargs(email="mobile-dupe-1@example.com", mobile_number="+15550133002")
        )
        second = await repo.create(
            **_new_user_kwargs(email="mobile-dupe-2@example.com", mobile_number="+15550133003")
        )
        with pytest.raises(MobileNumberAlreadyRegisteredError):
            await repo.update_mobile_number(second.id, "+15550133002")
        # first user's number is left intact
        found = await repo.get_by_mobile_number("+15550133002")
        assert found is not None
        assert found.id == first.id


@pytest.mark.asyncio
async def test_update_mobile_number_allows_reassigning_same_number_to_same_user(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="mobile-same@example.com", mobile_number="+15550133004")
        )
        # Saving the same number back (no-op) must not raise a duplicate-conflict error.
        updated = await repo.update_mobile_number(created.id, "+15550133004")
        assert updated is not None


@pytest.mark.asyncio
async def test_update_address_persists_house_number_and_apartment_building(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="address-extended@example.com", mobile_number="+15550133005")
        )
        updated = await repo.update_address(
            created.id,
            country="IN",
            state_province="KA",
            pin_code="560001",
            house_number="12B",
            apartment_building="Sunrise Apartments",
        )
        assert updated is not None
        assert updated.house_number == "12B"
        assert updated.apartment_building == "Sunrise Apartments"


@pytest.mark.asyncio
async def test_update_address_without_new_fields_stores_none(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        created = await repo.create(
            **_new_user_kwargs(email="address-legacy@example.com", mobile_number="+15550133006")
        )
        updated = await repo.update_address(
            created.id, country="IN", state_province="KA", pin_code="560001"
        )
        assert updated is not None
        assert updated.house_number is None
        assert updated.apartment_building is None
