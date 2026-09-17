"""Contract test: POST /api/v1/auth/register with country/state/pin (contracts/registration-api.md)."""

from __future__ import annotations

from tests.conftest import register_payload


def test_register_with_address_returns_201_with_address_fields(test_client) -> None:
    payload = register_payload(email="addr-ok@example.com", mobile_number="+15550100201")
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["country"] == "IN"
    assert body["state_province"] == "KA"
    assert body["pin_code"] == "560001"


def test_register_missing_country_returns_422(test_client) -> None:
    payload = register_payload(email="addr-missing-country@example.com", mobile_number="+15550100202")
    del payload["country"]
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_missing_state_province_returns_422(test_client) -> None:
    payload = register_payload(email="addr-missing-state@example.com", mobile_number="+15550100203")
    del payload["state_province"]
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_missing_pin_code_returns_422(test_client) -> None:
    payload = register_payload(email="addr-missing-pin@example.com", mobile_number="+15550100204")
    del payload["pin_code"]
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_unsupported_country_returns_422(test_client) -> None:
    payload = register_payload(email="addr-bad-country@example.com", mobile_number="+15550100205")
    payload["country"] = "ZZ"
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_register_state_not_belonging_to_country_returns_422(test_client) -> None:
    payload = register_payload(email="addr-mismatch@example.com", mobile_number="+15550100206")
    payload["country"] = "IN"
    payload["state_province"] = "CA"  # CA belongs to US, not IN
    response = test_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
