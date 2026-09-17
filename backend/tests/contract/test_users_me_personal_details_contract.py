"""Contract test: PATCH /api/v1/users/me/personal-details
(specs/013-profile-popover-management/contracts/users-me-personal-details.md)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def _register_and_login(test_client, email: str, mobile_number: str) -> str:
    register_and_verify(test_client, email=email, mobile_number=mobile_number)
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def test_patch_personal_details_updates_mobile_number_and_returns_full_profile(
    test_client,
) -> None:
    access_token = _register_and_login(
        test_client, email="pd-success@example.com", mobile_number="+15550166001"
    )
    response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"mobile_number": "+15550166999"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mobile_number"] == "+15550166999"
    # Full profile shape, per contract - not just the changed field.
    for field in (
        "id",
        "first_name",
        "last_name",
        "email",
        "country",
        "state_province",
        "pin_code",
        "house_number",
        "apartment_building",
        "is_verified",
        "created_at",
        "board",
        "standard",
        "academic_profile_complete",
    ):
        assert field in body


def test_patch_personal_details_without_token_returns_401(test_client) -> None:
    response = test_client.patch(
        "/api/v1/users/me/personal-details",
        json={"mobile_number": "+15550166002"},
    )
    assert response.status_code == 401


def test_patch_personal_details_with_expired_or_invalid_token_returns_401(test_client) -> None:
    """G3: an expired/invalid access token (distinct from a missing one) must also be
    rejected with 401, so a session that expires mid-edit surfaces a clean re-auth
    prompt rather than a 500 or a silently-accepted request."""
    response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
        json={"mobile_number": "+15550166006"},
    )
    assert response.status_code == 401


def test_patch_personal_details_invalid_format_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="pd-invalid@example.com", mobile_number="+15550166003"
    )
    response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"mobile_number": "abc123"},
    )
    assert response.status_code == 422


def test_patch_personal_details_duplicate_number_returns_409(test_client) -> None:
    register_and_verify(
        test_client, email="pd-taken@example.com", mobile_number="+15550166004"
    )
    access_token = _register_and_login(
        test_client, email="pd-requester@example.com", mobile_number="+15550166005"
    )
    response = test_client.patch(
        "/api/v1/users/me/personal-details",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"mobile_number": "+15550166004"},
    )
    assert response.status_code == 409
