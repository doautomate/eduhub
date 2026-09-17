"""Contract tests: GET /api/v1/locations/countries and .../states (contracts/locations-api.md)."""

from __future__ import annotations


def test_list_countries_returns_curated_six(test_client) -> None:
    response = test_client.get("/api/v1/locations/countries")
    assert response.status_code == 200
    body = response.json()
    codes = {c["country_code"] for c in body["countries"]}
    assert codes == {"IN", "US", "GB", "CA", "AU", "DE"}


def test_list_states_for_valid_country_returns_states(test_client) -> None:
    response = test_client.get("/api/v1/locations/countries/IN/states")
    assert response.status_code == 200
    body = response.json()
    assert body["country_code"] == "IN"
    codes = {s["state_code"] for s in body["states"]}
    assert "KA" in codes


def test_list_states_is_case_insensitive(test_client) -> None:
    response = test_client.get("/api/v1/locations/countries/in/states")
    assert response.status_code == 200
    assert response.json()["country_code"] == "IN"


def test_list_states_for_unsupported_country_returns_404(test_client) -> None:
    response = test_client.get("/api/v1/locations/countries/ZZ/states")
    assert response.status_code == 404
