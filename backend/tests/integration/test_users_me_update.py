"""Integration test: register -> login -> PATCH /users/me -> GET /users/me reflects update (US5)."""

from __future__ import annotations

from tests.conftest import get_captured_profile_change_emails, register_and_verify


def test_register_login_patch_get_reflects_updated_address(test_client) -> None:
    register_and_verify(test_client, email="edit-flow@example.com", mobile_number="+15550101101")

    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "edit-flow@example.com", "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    patch_response = test_client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"country": "GB", "state_province": "ENG", "pin_code": "SW1A 1AA"},
    )
    assert patch_response.status_code == 200

    get_response = test_client.get("/api/v1/users/me", headers=headers)
    assert get_response.status_code == 200
    body = get_response.json()
    assert body["country"] == "GB"
    assert body["state_province"] == "ENG"
    assert body["pin_code"] == "SW1A 1AA"


def test_patch_address_records_one_audit_event_per_changed_field_and_notifies(
    test_client, db_engine
) -> None:
    register_and_verify(
        test_client, email="edit-flow-audit@example.com", mobile_number="+15550101102"
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "edit-flow-audit@example.com", "password": "Passw0rd"},
    )
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    patch_response = test_client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={
            "country": "IN",
            "state_province": "KA",
            "pin_code": "560002",
            "house_number": "9A",
            "apartment_building": "Palm Residency",
        },
    )
    assert patch_response.status_code == 200
    user_id = patch_response.json()["id"]

    async def _load_events():
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import async_sessionmaker

        from src.models.audit import AuditEvent, AuditEventType

        session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
        async with session_factory() as session:
            result = await session.execute(
                select(AuditEvent).where(
                    AuditEvent.event_type == AuditEventType.PROFILE_ADDRESS_CHANGED
                )
            )
            return result.scalars().all()

    import asyncio

    events = asyncio.run(_load_events())
    matching = [e for e in events if str(e.user_id) == user_id]
    changed_fields = {e.event_metadata["field"] for e in matching}
    # pin_code/house_number/apartment_building changed; country/state_province did not.
    assert changed_fields == {"pin_code", "house_number", "apartment_building"}

    assert get_captured_profile_change_emails("edit-flow-audit@example.com") == ["address"]
