"""Direct unit tests for the small real-implementation bodies that FastAPI
dependency overrides normally bypass in the HTTP-level test suite:
core.cache.get_redis, db.session.get_db, and api.deps.get_redis_dep / get_auth_service_dep.
"""

from __future__ import annotations

import pytest
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_auth_service_dep, get_redis_dep
from src.core.cache import get_redis
from src.db import session as session_module
from src.services.auth_service import AuthService


def test_get_redis_returns_cached_redis_client():
    get_redis.cache_clear()
    client_a = get_redis()
    client_b = get_redis()
    assert isinstance(client_a, Redis)
    # lru_cache means repeated calls return the exact same client instance.
    assert client_a is client_b
    get_redis.cache_clear()


@pytest.mark.asyncio
async def test_get_redis_dep_yields_the_cached_redis_client():
    get_redis.cache_clear()
    agen = get_redis_dep()
    yielded = await agen.__anext__()
    assert isinstance(yielded, Redis)
    await agen.aclose()
    get_redis.cache_clear()


@pytest.mark.asyncio
async def test_get_db_yields_a_working_async_session(tmp_path, monkeypatch):
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from src.db.base import Base

    test_db_path = tmp_path / "infra_test.db"
    test_engine = create_async_engine(f"sqlite+aiosqlite:///{test_db_path}")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    test_session_factory = async_sessionmaker(
        bind=test_engine, expire_on_commit=False, class_=AsyncSession
    )

    monkeypatch.setattr(session_module, "AsyncSessionLocal", test_session_factory)

    agen = session_module.get_db()
    got_session = await agen.__anext__()
    assert isinstance(got_session, AsyncSession)
    await agen.aclose()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_get_auth_service_dep_builds_auth_service(db_engine, fake_redis):
    from sqlalchemy.ext.asyncio import async_sessionmaker

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        service = await get_auth_service_dep(session=session, redis=fake_redis)
        assert isinstance(service, AuthService)
