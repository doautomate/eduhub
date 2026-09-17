"""Integration tests: academic-profile lifecycle across GET/PATCH /api/v1/users/me(/academic-profile).

Covers User Stories 1-3 (009-profile-onboarding-setup):
- US1 (T007): a new user has no academic profile until first-login setup completes.
- US2 (T019): a user who already completed setup is not asked again; saved values persist.
- US3 (T024): editing an already-complete profile replaces the prior values, and the
  change is reflected on a subsequent GET (simulating the next login) - closes SC-004/FR-010.
- T007b: a pre-existing user with NULL board/standard (simulating a pre-migration
  account) is treated identically to a brand-new user (FR-012).
"""

from __future__ import annotations

from sqlalchemy import select

from src.models.user import User
from tests.conftest import register_and_verify


def _register_and_login(test_client, email: str, mobile_number: str) -> str:
    register_and_verify(test_client, email=email, mobile_number=mobile_number)
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def _auth_headers(access_token: str) -> dict:
    return {"Authorization": "Bearer " + access_token}


def test_new_user_has_incomplete_academic_profile_until_patch(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-new-user@example.com", mobile_number="+15550103001"
    )
    headers = _auth_headers(access_token)

    before = test_client.get("/api/v1/users/me", headers=headers)
    assert before.status_code == 200
    before_body = before.json()
    assert before_body["board"] is None
    assert before_body["standard"] is None
    assert before_body["academic_profile_complete"] is False

    patch_response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=headers,
        json={"board": "ICSE", "standard": "IX"},
    )
    assert patch_response.status_code == 200

    after = test_client.get("/api/v1/users/me", headers=headers)
    assert after.status_code == 200
    after_body = after.json()
    assert after_body["board"] == "ICSE"
    assert after_body["standard"] == "IX"
    assert after_body["academic_profile_complete"] is True


def test_returning_user_with_complete_profile_is_not_reprompted(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-returning@example.com", mobile_number="+15550103002"
    )
    headers = _auth_headers(access_token)
    setup_response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=headers,
        json={"board": "IB", "standard": "XI"},
    )
    assert setup_response.status_code == 200

    # Simulate a later login: fetch the profile again without re-submitting anything.
    relogin_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "acad-returning@example.com", "password": "Passw0rd"},
    )
    assert relogin_response.status_code == 200
    new_access_token = relogin_response.json()["access_token"]
    get_response = test_client.get(
        "/api/v1/users/me", headers=_auth_headers(new_access_token)
    )
    assert get_response.status_code == 200
    body = get_response.json()
    assert body["board"] == "IB"
    assert body["standard"] == "XI"
    assert body["academic_profile_complete"] is True


def test_editing_academic_profile_replaces_values_and_persists_on_next_login(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-edit@example.com", mobile_number="+15550103003"
    )
    headers = _auth_headers(access_token)
    setup_response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=headers,
        json={"board": "CBSE", "standard": "VIII"},
    )
    assert setup_response.status_code == 200

    edit_response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=headers,
        json={"board": "CBSE", "standard": "IX"},
    )
    assert edit_response.status_code == 200
    edit_body = edit_response.json()
    assert edit_body["standard"] == "IX"

    # SC-004/FR-010: the edit must be what's returned on the very next login, not the
    # stale pre-edit value.
    relogin_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "acad-edit@example.com", "password": "Passw0rd"},
    )
    assert relogin_response.status_code == 200
    new_access_token = relogin_response.json()["access_token"]
    get_response = test_client.get(
        "/api/v1/users/me", headers=_auth_headers(new_access_token)
    )
    assert get_response.status_code == 200
    body = get_response.json()
    assert body["board"] == "CBSE"
    assert body["standard"] == "IX"


async def _seed_pre_migration_user(test_client, db_engine, email: str) -> None:
    """Directly clear board/standard on an already-registered user's row to simulate a
    pre-migration account (FR-012) - i.e. a user whose row predates this feature and
    was never given a value by any backfill."""
    from sqlalchemy.ext.asyncio import async_sessionmaker

    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one()
        user.board = None
        user.standard = None
        user.board_other = None
        await session.commit()


async def test_pre_existing_user_with_no_academic_profile_is_gated_like_new_user(
    test_client, db_engine
) -> None:
    email = "acad-pre-existing@example.com"
    access_token = _register_and_login(test_client, email=email, mobile_number="+15550103004")

    # Registration itself never sets board/standard, so the freshly-registered row is
    # already NULL/NULL - this explicitly re-asserts that state to make the "pre-existing
    # user" scenario unambiguous and independent of any future registration change.
    await _seed_pre_migration_user(test_client, db_engine, email)

    response = test_client.get(
        "/api/v1/users/me", headers=_auth_headers(access_token)
    )
    assert response.status_code == 200
    body = response.json()
    assert body["board"] is None
    assert body["standard"] is None
    assert body["academic_profile_complete"] is False
