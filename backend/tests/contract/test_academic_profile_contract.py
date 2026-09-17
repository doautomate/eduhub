"""Contract test: PATCH /api/v1/users/me/academic-profile (contracts/academic-profile-contract.md)."""

from __future__ import annotations

from tests.conftest import register_and_verify


def _auth_headers(access_token: str) -> dict:
    return {"Authorization": "Bearer " + access_token}


def _register_and_login(test_client, email: str, mobile_number: str) -> str:
    register_and_verify(test_client, email=email, mobile_number=mobile_number)
    login_response = test_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Passw0rd"},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


def test_patch_academic_profile_with_valid_board_and_standard_returns_200(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-valid@example.com", mobile_number="+15550102001"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "CBSE", "standard": "VIII"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "CBSE"
    assert body["standard"] == "VIII"
    assert body["board_other"] is None
    assert body["academic_profile_complete"] is True


def test_patch_academic_profile_missing_board_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-missing-board@example.com", mobile_number="+15550102002"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"standard": "VIII"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_missing_standard_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-missing-standard@example.com", mobile_number="+15550102003"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "CBSE"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_invalid_board_enum_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-invalid-board@example.com", mobile_number="+15550102004"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "NOT_A_BOARD", "standard": "VIII"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_invalid_standard_enum_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-invalid-standard@example.com", mobile_number="+15550102005"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "CBSE", "standard": "3"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_other_board_without_free_text_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-other-missing-text@example.com", mobile_number="+15550102006"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "OTHER", "standard": "VIII"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_other_board_with_free_text_returns_200(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-other-with-text@example.com", mobile_number="+15550102007"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "OTHER", "standard": "VIII", "board_other": "Cambridge Assessment"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["board"] == "OTHER"
    assert body["board_other"] == "Cambridge Assessment"


def test_patch_academic_profile_non_other_board_with_free_text_returns_422(test_client) -> None:
    access_token = _register_and_login(
        test_client, email="acad-non-other-with-text@example.com", mobile_number="+15550102008"
    )
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        headers=_auth_headers(access_token),
        json={"board": "CBSE", "standard": "VIII", "board_other": "Should not be allowed"},
    )
    assert response.status_code == 422


def test_patch_academic_profile_without_token_returns_401(test_client) -> None:
    response = test_client.patch(
        "/api/v1/users/me/academic-profile",
        json={"board": "CBSE", "standard": "VIII"},
    )
    assert response.status_code == 401
