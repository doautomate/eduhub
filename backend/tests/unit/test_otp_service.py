"""Unit tests for OtpService: issue/verify/resend, expiry, and attempt-limit logic (T045)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import (
    InvalidOtpError,
    OtpAttemptsExceededError,
    OtpResendCooldownError,
)
from src.repositories.user_repository import UserRepository
from src.services import otp_service as otp_service_module
from src.services.otp_service import OtpService

_captured: dict[str, str] = {}


@pytest.fixture(autouse=True)
def _capture_dispatch(monkeypatch):
    def _fake_dispatch(to_email: str, code: str) -> None:
        _captured[to_email.strip().lower()] = code

    monkeypatch.setattr(otp_service_module, "dispatch_otp_email", _fake_dispatch)
    yield
    _captured.clear()


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
async def test_issue_then_verify_with_correct_code_marks_user_verified(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-user@example.com", "+15550140001")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)

        await service.issue(user)
        code = _captured[user.email]

        await service.verify(str(user.id), code)

        refreshed = await UserRepository(session).get_by_id(str(user.id))
        assert refreshed.is_verified is True


@pytest.mark.asyncio
async def test_verify_with_wrong_code_raises_invalid_otp_with_attempts_remaining(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-wrong@example.com", "+15550140002")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)
        await service.issue(user)

        with pytest.raises(InvalidOtpError) as exc_info:
            await service.verify(str(user.id), "000000")
        assert exc_info.value.attempts_remaining == 2  # max_attempts (3) - 1


@pytest.mark.asyncio
async def test_verify_exceeding_attempt_limit_raises_attempts_exceeded(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-exceed@example.com", "+15550140003")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)
        await service.issue(user)

        for _ in range(2):
            with pytest.raises(InvalidOtpError):
                await service.verify(str(user.id), "000000")

        with pytest.raises(OtpAttemptsExceededError):
            await service.verify(str(user.id), "000000")


@pytest.mark.asyncio
async def test_verify_with_expired_code_raises_invalid_otp(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-expired@example.com", "+15550140004")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)
        await service.issue(user)
        code = _captured[user.email]

        # Force the just-issued code to already be expired.
        active = await service._code_repo.get_latest_active_for_user(str(user.id))
        active.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        await session.commit()

        with pytest.raises(InvalidOtpError):
            await service.verify(str(user.id), code)


@pytest.mark.asyncio
async def test_resend_before_cooldown_elapses_raises_cooldown_error(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-resend@example.com", "+15550140005")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)
        await service.issue(user)

        with pytest.raises(OtpResendCooldownError):
            await service.resend(str(user.id))


@pytest.mark.asyncio
async def test_resend_issues_a_new_code_invalidating_the_previous_one(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        user = await UserRepository(session).create(
            **_new_user_kwargs("otp-resend2@example.com", "+15550140006")
        )
        redis = FakeRedis(decode_responses=True)
        service = OtpService(session, redis)
        await service.issue(user)
        first_code = _captured[user.email]

        # Clear the cooldown key directly to simulate it having elapsed.
        await redis.delete(service._cooldown_key(user.id))
        await service.resend(str(user.id))
        second_code = _captured[user.email]

        # The old code must no longer verify; only the freshly issued one should.
        with pytest.raises(InvalidOtpError):
            await service.verify(str(user.id), first_code)
        await service.verify(str(user.id), second_code)
