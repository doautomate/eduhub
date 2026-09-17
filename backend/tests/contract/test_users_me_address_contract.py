"""Contract test: GET/PATCH /api/v1/users/me address fields (contracts/users-me-api.md)."""

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


def test_get_me_includes_address_fields(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr@example.com", mobile_number="+15550101001"
    )
    response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["country"] == "IN"
    assert body["state_province"] == "KA"
    assert body["pin_code"] == "560001"
    # 009-profile-onboarding-setup: additive fields, not yet set for a brand-new user.
    assert body["board"] is None
    assert body["standard"] is None
    assert body["academic_profile_complete"] is False


def test_patch_me_updates_address_and_returns_updated_profile(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-patch@example.com", mobile_number="+15550101002"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"country": "US", "state_province": "CA", "pin_code": "94105"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["country"] == "US"
    assert body["state_province"] == "CA"
    assert body["pin_code"] == "94105"


def test_patch_me_missing_field_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-missing@example.com", mobile_number="+15550101003"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"country": "US", "pin_code": "94105"},
    )
    assert response.status_code == 422


def test_patch_me_mismatched_state_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-mismatch@example.com", mobile_number="+15550101004"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"country": "IN", "state_province": "CA", "pin_code": "560001"},
    )
    assert response.status_code == 422


def test_patch_me_without_token_returns_401(test_client) -> None:
    response = test_client.patch(
        "/api/v1/users/me",
        json={"country": "IN", "state_province": "KA", "pin_code": "560001"},
    )
    assert response.status_code == 401


# --- 013-profile-popover-management: house_number/apartment_building extensions ---


def test_get_me_for_pre_existing_user_returns_null_for_new_fields(test_client) -> None:
    """Backward-compatibility (FR-019/SC-005): a user created before this feature (i.e.
    one who has never set house_number/apartment_building) must still resolve cleanly via
    GET /me, with the two new fields returned as null rather than raising or omitting the
    keys."""
    _register_and_login(
        test_client, email="me-addr-legacy@example.com", mobile_number="+15550101005"
    )
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": "me-addr-legacy@example.com", "password": "Passw0rd"},
    )
    access_token = login_response.json()["access_token"]
    response = test_client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "house_number" in body
    assert "apartment_building" in body
    assert body["house_number"] is None
    assert body["apartment_building"] is None


def test_patch_me_persists_house_number_and_apartment_building(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-extended@example.com", mobile_number="+15550101006"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "country": "IN",
            "state_province": "KA",
            "pin_code": "560001",
            "house_number": "12B",
            "apartment_building": "Sunrise Apartments",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["house_number"] == "12B"
    assert body["apartment_building"] == "Sunrise Apartments"


def test_patch_me_omitting_new_fields_stores_null(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-omit@example.com", mobile_number="+15550101007"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"country": "IN", "state_province": "KA", "pin_code": "560001"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["house_number"] is None
    assert body["apartment_building"] is None


def test_patch_me_house_number_exceeding_max_length_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="me-addr-toolong@example.com", mobile_number="+15550101008"
    )
    response = test_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "country": "IN",
            "state_province": "KA",
            "pin_code": "560001",
            "house_number": "X" * 51,
        },
    )
    assert response.status_code == 422
