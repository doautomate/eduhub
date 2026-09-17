"""Read-only lookup over the curated static location dataset (data-model.md).

Not a database-backed repository - the curated country/state list is small and
static for this feature's scope (FR-010), so it is served directly from
`src/data/locations.py` rather than a mutable table.
"""

from __future__ import annotations

from src.data.locations import CURATED_COUNTRIES, CountryEntry


class LocationRepository:
    def list_countries(self) -> list[CountryEntry]:
        return CURATED_COUNTRIES

    def get_country(self, country_code: str) -> CountryEntry | None:
        normalized = country_code.strip().upper()
        for country in CURATED_COUNTRIES:
            if country["country_code"] == normalized:
                return country
        return None
