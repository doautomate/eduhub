"""Curated static country -> state/province reference dataset (FR-010).

Scope resolved in /speckit-clarify: exactly six currently-supported countries
(India, United States, United Kingdom, Canada, Australia, Germany), not a
comprehensive worldwide list. Each state/province list is representative
(first-level administrative divisions), not necessarily exhaustive.
"""

from __future__ import annotations

from typing import TypedDict


class StateEntry(TypedDict):
    state_code: str
    state_name: str


class CountryEntry(TypedDict):
    country_code: str
    country_name: str
    states: list[StateEntry]


CURATED_COUNTRIES: list[CountryEntry] = [
    {
        "country_code": "IN",
        "country_name": "India",
        "states": [
            {"state_code": "AP", "state_name": "Andhra Pradesh"},
            {"state_code": "DL", "state_name": "Delhi"},
            {"state_code": "GJ", "state_name": "Gujarat"},
            {"state_code": "KA", "state_name": "Karnataka"},
            {"state_code": "MH", "state_name": "Maharashtra"},
            {"state_code": "TN", "state_name": "Tamil Nadu"},
            {"state_code": "TG", "state_name": "Telangana"},
            {"state_code": "UP", "state_name": "Uttar Pradesh"},
            {"state_code": "WB", "state_name": "West Bengal"},
        ],
    },
    {
        "country_code": "US",
        "country_name": "United States",
        "states": [
            {"state_code": "CA", "state_name": "California"},
            {"state_code": "FL", "state_name": "Florida"},
            {"state_code": "IL", "state_name": "Illinois"},
            {"state_code": "NY", "state_name": "New York"},
            {"state_code": "TX", "state_name": "Texas"},
            {"state_code": "WA", "state_name": "Washington"},
        ],
    },
    {
        "country_code": "GB",
        "country_name": "United Kingdom",
        "states": [
            {"state_code": "ENG", "state_name": "England"},
            {"state_code": "NIR", "state_name": "Northern Ireland"},
            {"state_code": "SCT", "state_name": "Scotland"},
            {"state_code": "WLS", "state_name": "Wales"},
        ],
    },
    {
        "country_code": "CA",
        "country_name": "Canada",
        "states": [
            {"state_code": "AB", "state_name": "Alberta"},
            {"state_code": "BC", "state_name": "British Columbia"},
            {"state_code": "ON", "state_name": "Ontario"},
            {"state_code": "QC", "state_name": "Quebec"},
        ],
    },
    {
        "country_code": "AU",
        "country_name": "Australia",
        "states": [
            {"state_code": "NSW", "state_name": "New South Wales"},
            {"state_code": "QLD", "state_name": "Queensland"},
            {"state_code": "VIC", "state_name": "Victoria"},
            {"state_code": "WA", "state_name": "Western Australia"},
        ],
    },
    {
        "country_code": "DE",
        "country_name": "Germany",
        "states": [
            {"state_code": "BY", "state_name": "Bavaria"},
            {"state_code": "BE", "state_name": "Berlin"},
            {"state_code": "HE", "state_name": "Hesse"},
            {"state_code": "NW", "state_name": "North Rhine-Westphalia"},
        ],
    },
]
