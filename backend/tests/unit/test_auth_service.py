"""Direct unit tests for AuthService covering branches not fully exercised via HTTP tests:
refresh() with an unknown/invalid token, logout() token revocation, and the private
failure-counter helpers (_record_failure / _reset_failures / get_failure_count).
"""

from __future__ import annotations

from datetime import date

import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.exceptions import (
    EmailAlreadyRegisteredError,
    InvalidRefreshTokenError,
    MobileNumberAlreadyRegisteredError,
)
from src.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_register_duplicate_email_raises(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = AuthService(session=session, redis=FakeRedis(decode_responses=True))
        await service.register(
            "dup@example.com", "Sup3rSecret!", "Ada", "Lovelace", "+15550120001", "IN", "KA", "560001", date(1995, 6, 15), "FIRST_PET", "Rex"
        )
        with pytest.raises(EmailAlreadyRegisteredError):
            await service.register(
                "dup@example.com", "Sup3rSecret!", "Ada", "Lovelace", "+15550120002", "IN", "KA", "560001", date(1995, 6, 15), "FIRST_PET", "Rex"
            )


@pytest.mark.asyncio
async def test_register_duplicate_mobile_number_raises_even_with_different_email(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = AuthService(session=session, redis=FakeRedis(decode_responses=True))
        await service.register(
            "first-owner@example.com", "Sup3rSecret!", "Ada", "Lovelace", "+15550120003", "IN", "KA", "560001", date(1995, 6, 15), "FIRST_PET", "Rex"
        )
        with pytest.raises(MobileNumberAlreadyRegisteredError):
            await service.register(
                "different-email@example.com",
                "Sup3rSecret!",
                "Grace",
                "Hopper",
                "+15550120003",
                "IN",
                "KA",
                "560001",
                date(1995, 6, 15),
                "FIRST_PET",
                "Rex",
            )


@pytest.mark.asyncio
async def test_refresh_with_unknown_token_raises_invalid_refresh_token_error(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = AuthService(session=session, redis=FakeRedis(decode_responses=True))
        with pytest.raises(InvalidRefreshTokenError):
            await service.refresh("no-such-refresh-token-id")


@pytest.mark.asyncio
async def test_logout_deletes_refresh_token_so_future_refresh_fails(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        redis = FakeRedis(decode_responses=True)
        service = AuthService(session=session, redis=redis)
        user = await service.register(
            "logout-user@example.com",
            "Sup3rSecret!",
            "Ada",
            "Lovelace",
            "+15550120004",
            "IN",
            "KA",
            "560001",
            date(1995, 6, 15),
            "FIRST_PET",
            "Rex",
        )
        await service._repo.mark_verified(str(user.id))
        _, _, refresh_token_id = await service.login(
            "logout-user@example.com", "Sup3rSecret!", captcha_token=None
        )

        # Sanity check: token works before logout.
        await service.refresh(refresh_token_id)

        await service.logout(refresh_token_id, user_id=str(user.id))

        with pytest.raises(InvalidRefreshTokenError):
            await service.refresh(refresh_token_id)


@pytest.mark.asyncio
async def test_failure_counter_increments_sets_ttl_once_and_resets(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        redis = FakeRedis(decode_responses=True)
        service = AuthService(session=session, redis=redis)
        email = "flaky@example.com"

        assert await service.get_failure_count(email) == 0

        await service._record_failure(email)
        assert await service.get_failure_count(email) == 1
        ttl_after_first = await redis.ttl(await service._failure_key(email))
        assert ttl_after_first > 0

        await service._record_failure(email)
        assert await service.get_failure_count(email) == 2

        await service._reset_failures(email)
        assert await service.get_failure_count(email) == 0
