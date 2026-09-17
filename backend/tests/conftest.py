"""Shared pytest fixtures: isolated SQLite DB + fakeredis-backed app for auth tests."""

from __future__ import annotations

import os

# testcontainers' Ryuk reaper sidecar mounts the host docker socket, which some local
# Docker setups (e.g. Colima) reject; disabling it is safe for short-lived test runs
# since each fixture explicitly stops/drops its own container/tables.
os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")

import pytest
import pytest_asyncio
from fakeredis.aioredis import FakeRedis
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.api.deps import get_redis_dep
from src.app import app
from src.db.base import Base
from src.db.session import get_db
from src.models import (  # noqa: F401 - registers tables on Base.metadata
    audit,
    email_verification_code,
    user,
)

client = TestClient(app, base_url="https://testserver")


def register_payload(
    email: str,
    password: str = "Passw0rd",
    first_name: str = "Test",
    last_name: str = "User",
    mobile_number: str = "+15550100001",
    country: str = "IN",
    state_province: str = "KA",
    pin_code: str = "560001",
    date_of_birth: str = "1995-06-15",
    security_question_code: str = "FIRST_PET",
    security_answer: str = "Rex",
) -> dict:
    """Build a valid /register request body, overriding only what a test cares about."""
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "mobile_number": mobile_number,
        "password": password,
        "country": country,
        "state_province": state_province,
        "pin_code": pin_code,
        "date_of_birth": date_of_birth,
        "security_question_code": security_question_code,
        "security_answer": security_answer,
    }


# OTP codes are emailed, never returned by the API (FR-018) - this capture hook lets
# tests that only care about post-verification behavior (login/logout/profile), not the
# OTP flow itself, retrieve the code that was "sent" without crossing event loops or
# reaching into the DB directly.
_captured_otp_codes: dict[str, str] = {}


@pytest.fixture(autouse=True)
def _capture_otp_codes(monkeypatch):
    def _fake_dispatch(to_email: str, code: str) -> None:
        _captured_otp_codes[to_email.strip().lower()] = code

    monkeypatch.setattr("src.services.otp_service.dispatch_otp_email", _fake_dispatch)
    yield
    _captured_otp_codes.clear()


def get_captured_otp_code(email: str) -> str:
    return _captured_otp_codes[email.strip().lower()]


# Profile-change notification emails (013-profile-popover-management, FR-022) are
# dispatched fire-and-forget via `dispatch_profile_change_email` - capture them the same
# way as OTP codes so integration tests can assert a notification was (or wasn't) sent
# without racing the background asyncio task.
_captured_profile_change_emails: list[tuple[str, str]] = []


@pytest.fixture(autouse=True)
def _capture_profile_change_emails(monkeypatch):
    def _fake_dispatch(to_email: str, *, changed_section: str) -> None:
        _captured_profile_change_emails.append((to_email.strip().lower(), changed_section))

    monkeypatch.setattr(
        "src.services.user_service.dispatch_profile_change_email", _fake_dispatch
    )
    yield
    _captured_profile_change_emails.clear()


def get_captured_profile_change_emails(email: str) -> list[str]:
    """Return the list of `changed_section` values notified for `email`, in call order."""
    normalized = email.strip().lower()
    return [section for sent_email, section in _captured_profile_change_emails if sent_email == normalized]


def register_and_verify(client: TestClient, **kwargs) -> dict:
    """Register via the real API, then immediately verify using the captured OTP code.

    Returns the `RegisterResponse` body. Used by tests exercising login/logout/profile
    behavior that requires an already-verified account, without duplicating the OTP flow.
    """
    payload = register_payload(**kwargs)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    code = get_captured_otp_code(payload["email"])
    verify_response = client.post(
        "/api/v1/auth/otp/verify", json={"user_id": body["id"], "code": code}
    )
    assert verify_response.status_code == 200, verify_response.text
    return body


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
def postgres_container():
    """Session-scoped real Postgres container (T013a): repository tests that rely on
    Postgres-only semantics (e.g. unique constraints, server-side defaults) must run
    against a real engine rather than the SQLite fallback used by `db_engine`."""
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as container:
        yield container


@pytest_asyncio.fixture
async def postgres_engine(postgres_container):
    url = postgres_container.get_connection_url().replace(
        "postgresql+psycopg2://", "postgresql+asyncpg://"
    )
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def fake_redis():
    return FakeRedis(decode_responses=True)


@pytest.fixture
def test_client(db_engine, fake_redis):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)

    async def _get_db_override():
        async with session_factory() as session:
            yield session

    async def _get_redis_override():
        yield fake_redis

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_redis_dep] = _get_redis_override
    with TestClient(app, base_url="https://testserver") as c:
        yield c
    app.dependency_overrides.clear()
