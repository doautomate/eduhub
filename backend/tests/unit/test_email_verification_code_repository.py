"""Testcontainer-backed Postgres tests for EmailVerificationCodeRepository (T013a).

Runs against a real Postgres instance (not mocks) to exercise create/invalidate/
attempt-count/mark-used against actual DB semantics.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.encryption import blind_index, encrypt_field
from src.repositories.email_verification_code_repository import EmailVerificationCodeRepository
from src.repositories.user_repository import UserRepository


async def _create_test_user(session_factory, email: str, mobile_number: str):
    async with session_factory() as session:
        repo = UserRepository(session)
        return await repo.create(
            email=email,
            password_hash="hashed-value",
            first_name="Ada",
            last_name="Lovelace",
            mobile_number_encrypted=encrypt_field(mobile_number),
            mobile_number_lookup_hash=blind_index(mobile_number),
            country="IN",
            state_province="KA",
            pin_code="560001",
            date_of_birth_encrypted=encrypt_field("1990-01-01"),
            security_question_code="FIRST_PET",
            security_answer_hash="hashed-answer",
        )


@pytest.mark.asyncio
async def test_create_and_get_latest_active_for_user(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    user = await _create_test_user(session_factory, "otp-create@example.com", "+15550133001")
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        created = await repo.create(user_id=user.id, code_hash="hashed-otp", expires_at=expires_at)
        assert created.id is not None
        assert created.attempt_count == 0
        assert created.is_used is False

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        latest = await repo.get_latest_active_for_user(user.id)
        assert latest is not None
        assert latest.id == created.id


@pytest.mark.asyncio
async def test_get_latest_active_for_user_returns_none_when_absent(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    user = await _create_test_user(session_factory, "otp-none@example.com", "+15550133002")

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        latest = await repo.get_latest_active_for_user(user.id)
        assert latest is None


@pytest.mark.asyncio
async def test_increment_attempt_count(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    user = await _create_test_user(session_factory, "otp-attempts@example.com", "+15550133003")
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        created = await repo.create(user_id=user.id, code_hash="hashed-otp", expires_at=expires_at)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        updated = await repo.increment_attempt_count(created.id)
        assert updated is not None
        assert updated.attempt_count == 1

        updated_again = await repo.increment_attempt_count(created.id)
        assert updated_again.attempt_count == 2


@pytest.mark.asyncio
async def test_increment_attempt_count_returns_none_when_absent(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        result = await repo.increment_attempt_count("11111111-1111-1111-1111-111111111111")
        assert result is None


@pytest.mark.asyncio
async def test_mark_used(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    user = await _create_test_user(session_factory, "otp-used@example.com", "+15550133004")
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        created = await repo.create(user_id=user.id, code_hash="hashed-otp", expires_at=expires_at)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        updated = await repo.mark_used(created.id)
        assert updated is not None
        assert updated.is_used is True

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        latest_active = await repo.get_latest_active_for_user(user.id)
        # A used code is no longer "active".
        assert latest_active is None


@pytest.mark.asyncio
async def test_invalidate_active_for_user(postgres_engine):
    session_factory = async_sessionmaker(bind=postgres_engine, expire_on_commit=False)
    user = await _create_test_user(session_factory, "otp-invalidate@example.com", "+15550133005")
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        await repo.create(user_id=user.id, code_hash="hashed-otp-1", expires_at=expires_at)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        await repo.invalidate_active_for_user(user.id)

    async with session_factory() as session:
        repo = EmailVerificationCodeRepository(session)
        latest_active = await repo.get_latest_active_for_user(user.id)
        assert latest_active is None
