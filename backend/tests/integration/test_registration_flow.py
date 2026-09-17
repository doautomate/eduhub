"""Integration test: registration flow (TS-001, TS-002, TS-003)."""

from __future__ import annotations

from tests.conftest import register_payload


def test_ts001_register_creates_account_no_plaintext_leak(test_client) -> None:
    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="new-user@example.com", mobile_number="+15550100801"),
    )
    assert response.status_code == 201
    body = response.json()
    assert "password" not in body
    assert "password_hash" not in body


def test_ts002_duplicate_registration_rejected_no_duplicate_account(test_client) -> None:
    payload = register_payload(email="existing-user@example.com", mobile_number="+15550100802")
    test_client.post("/api/v1/auth/register", json=payload)
    second = test_client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"]


def test_ts002b_duplicate_mobile_number_rejected_across_different_emails(test_client) -> None:
    test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="owner@example.com", mobile_number="+15550100803"),
    )
    second = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="someone-else@example.com", mobile_number="+15550100803"),
    )
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"]


def test_ts003_invalid_inputs_rejected_no_account_created(test_client) -> None:
    cases = [
        register_payload(email="", mobile_number="+15550100804"),
        register_payload(email="not-an-email", mobile_number="+15550100804"),
        register_payload(email="valid@example.com", password="", mobile_number="+15550100804"),
        register_payload(email="valid2@example.com", password="short1", mobile_number="+15550100804"),
        register_payload(email="valid3@example.com", mobile_number="not-a-valid-number"),
    ]
    for case in cases:
        response = test_client.post("/api/v1/auth/register", json=case)
        assert response.status_code == 422


def test_register_persists_encrypted_dob_and_hashed_security_answer(test_client, db_engine) -> None:
    from sqlalchemy.ext.asyncio import async_sessionmaker

    response = test_client.post(
        "/api/v1/auth/register",
        json=register_payload(email="encrypted-dob@example.com", mobile_number="+15550100805"),
    )
    assert response.status_code == 201
    user_id = response.json()["id"]

    async def _load_user():
        from src.repositories.user_repository import UserRepository

        session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
        async with session_factory() as session:
            return await UserRepository(session).get_by_id(user_id)

    import asyncio

    user = asyncio.run(_load_user())
    # DOB must never be stored in plaintext (FR-017): the encrypted column value should
    # not literally contain the plaintext date string.
    assert "1995-06-15" not in user.date_of_birth_encrypted
    # The security answer must be one-way hashed, never stored/compared in plaintext.
    assert user.security_answer_hash != "rex"
    assert "rex" not in user.security_answer_hash.lower()
