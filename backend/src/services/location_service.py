"""Location reference-data service (curated countries/states, FR-010/FR-011/FR-012)."""

from __future__ import annotations

from src.core.exceptions import CountryNotFoundError
from src.data.locations import CountryEntry, StateEntry
from src.repositories.location_repository import LocationRepository


class LocationService:
    def __init__(self) -> None:
        self._repo = LocationRepository()

    def list_countries(self) -> list[CountryEntry]:
        return self._repo.list_countries()

    def list_states(self, country_code: str) -> list[StateEntry]:
        country = self._repo.get_country(country_code)
        if country is None:
            raise CountryNotFoundError(country_code)
        return country["states"]

    def is_valid_country(self, country_code: str) -> bool:
        return self._repo.get_country(country_code) is not None

    def is_valid_state_for_country(self, country_code: str, state_code: str) -> bool:
        """True only if `state_code` belongs to `country_code`'s curated state list (FR-012)."""
        country = self._repo.get_country(country_code)
        if country is None:
            return False
        normalized_state = state_code.strip().upper()
        return any(state["state_code"] == normalized_state for state in country["states"])
