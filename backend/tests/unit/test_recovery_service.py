"""Unit tests for RecoveryService lockout threshold behavior (T061)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.config import get_settings
from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import (
    InvalidResetTokenError,
    InvalidSecurityAnswerError,
    RecoveryLockedError,
)
from src.core.security import hash_password
from src.repositories.user_repository import UserRepository
from src.services.recovery_service import RecoveryService


def _new_user_kwargs(email: str, mobile_number: str, security_answer: str = "Rex") -> dict:
    return {
        "email": email,
        "password_hash": hash_password("Passw0rd"),
        "first_name": "Ada",
        "last_name": "Lovelace",
        "mobile_number_encrypted": encrypt_field(mobile_number),
        "mobile_number_lookup_hash": blind_index(mobile_number),
        "country": "IN",
        "state_province": "KA",
        "pin_code": "560001",
        "date_of_birth_encrypted": encrypt_field("1990-01-01"),
        "security_question_code": "FIRST_PET",
        "security_answer_hash": hash_password(security_answer.strip().lower()),
    }


@pytest.mark.asyncio
async def test_start_with_unknown_email_does_not_reveal_account_existence(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = RecoveryService(session, FakeRedis(decode_responses=True))
        user_id, question_text = await service.start("nobody@example.com")
        assert user_id  # a random placeholder id, not a real user's
        assert question_text


@pytest.mark.asyncio
async def test_answer_with_correct_answer_returns_reset_token(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("recovery-ok@example.com", "+15550150001")
        )
        service = RecoveryService(session, FakeRedis(decode_responses=True))
        token = await service.answer(str(user.id), "Rex")
        assert token


@pytest.mark.asyncio
async def test_answer_with_wrong_answer_raises_invalid_security_answer(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("recovery-wrong@example.com", "+15550150002")
        )
        service = RecoveryService(session, FakeRedis(decode_responses=True))
        with pytest.raises(InvalidSecurityAnswerError):
            await service.answer(str(user.id), "not-the-answer")


@pytest.mark.asyncio
async def test_answer_locks_account_after_max_failures(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("recovery-lockout@example.com", "+15550150003")
        )
        redis = FakeRedis(decode_responses=True)
        service = RecoveryService(session, redis)
        max_failures = get_settings().recovery_max_failures

        for _ in range(max_failures - 1):
            with pytest.raises(InvalidSecurityAnswerError):
                await service.answer(str(user.id), "wrong")

        with pytest.raises(RecoveryLockedError):
            await service.answer(str(user.id), "wrong")

        # Even the correct answer is now rejected while locked.
        with pytest.raises(RecoveryLockedError):
            await service.answer(str(user.id), "Rex")


@pytest.mark.asyncio
async def test_start_raises_recovery_locked_error_while_locked(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.create(**_new_user_kwargs("recovery-start-locked@example.com", "+15550150004"))
        await repo.set_recovery_lock(str(user.id), datetime.now(UTC) + timedelta(minutes=15))

        service = RecoveryService(session, FakeRedis(decode_responses=True))
        with pytest.raises(RecoveryLockedError):
            await service.start("recovery-start-locked@example.com")


@pytest.mark.asyncio
async def test_reset_with_invalid_token_raises_invalid_reset_token_error(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = RecoveryService(session, FakeRedis(decode_responses=True))
        with pytest.raises(InvalidResetTokenError):
            await service.reset("no-such-token", "NewPassw0rd")


@pytest.mark.asyncio
async def test_reset_with_valid_token_updates_password_and_clears_lock(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.create(**_new_user_kwargs("recovery-reset@example.com", "+15550150005"))
        redis = FakeRedis(decode_responses=True)
        service = RecoveryService(session, redis)
        original_password_hash = user.password_hash

        token = await service.answer(str(user.id), "Rex")
        await service.reset(token, "NewPassw0rd")

        refreshed = await repo.get_by_id(str(user.id))
        assert refreshed.password_hash != original_password_hash
        assert refreshed.recovery_locked_until is None

        # The reset token is single-use.
        with pytest.raises(InvalidResetTokenError):
            await service.reset(token, "AnotherPassw0rd")
