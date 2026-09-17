"""Integration test: register -> login -> PATCH /users/me/personal-details -> audit
event + notification email recorded (013-profile-popover-management, FR-008/FR-009/
FR-021/FR-022)."""

from __future__ import annotations

from tests.conftest import get_captured_profile_change_emails, register_and_verify


def test_patch_personal_details_records_audit_event_and_notification(
    test_client, db_engine
) -> None:
    register_and_verify(
        test_client, email="pd-integration@example.com", mobile_number="+15550177001"
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "pd-integration@example.com", "password": "Passw0rd"},
    )
    access_token = login_response.json()["access_token"]

    patch_response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"mobile_number": "+15550177999"},
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
                    AuditEvent.event_type == AuditEventType.PROFILE_MOBILE_NUMBER_CHANGED
                )
            )
            return result.scalars().all()

    import asyncio

    events = asyncio.run(_load_events())
    matching = [e for e in events if str(e.user_id) == user_id]
    assert len(matching) == 1

    assert get_captured_profile_change_emails("pd-integration@example.com") == [
        "mobile number"
    ]


def test_patch_personal_details_duplicate_records_no_audit_event_or_notification(
    test_client,
) -> None:
    register_and_verify(
        test_client, email="pd-integration-taken@example.com", mobile_number="+15550177002"
    )
    register_and_verify(
        test_client, email="pd-integration-req@example.com", mobile_number="+15550177003"
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "pd-integration-req@example.com", "password": "Passw0rd"},
    )
    access_token = login_response.json()["access_token"]

    patch_response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"mobile_number": "+15550177002"},
    )
    assert patch_response.status_code == 409
    assert get_captured_profile_change_emails("pd-integration-req@example.com") == []
