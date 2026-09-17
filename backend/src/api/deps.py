"""Shared FastAPI dependencies."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.cache import get_redis
from src.db.session import get_db
from src.services.auth_service import AuthService
from src.services.location_service import LocationService
from src.services.otp_service import OtpService
from src.services.recovery_service import RecoveryService
from src.services.user_service import UserService

__all__ = [
    "get_db",
    "get_redis_dep",
    "get_auth_service_dep",
    "get_user_service_dep",
    "get_location_service_dep",
    "get_otp_service_dep",
    "get_recovery_service_dep",
]


async def get_redis_dep() -> AsyncGenerator[Redis, None]:
    yield get_redis()


async def get_auth_service_dep(
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_dep),
) -> AuthService:
    return AuthService(session=session, redis=redis)


async def get_user_service_dep(session: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(session=session)


async def get_location_service_dep() -> LocationService:
    return LocationService()


async def get_otp_service_dep(
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_dep),
) -> OtpService:
    return OtpService(session=session, redis=redis)


async def get_recovery_service_dep(
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis_dep),
) -> RecoveryService:
    return RecoveryService(session=session, redis=redis)
