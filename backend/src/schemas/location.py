"""Pydantic v2 response schemas for the location reference-data API (contracts/locations-api.md)."""

from __future__ import annotations

from pydantic import BaseModel


class CountrySummary(BaseModel):
    country_code: str
    country_name: str


class CountriesListResponse(BaseModel):
    countries: list[CountrySummary]


class StateSummary(BaseModel):
    state_code: str
    state_name: str


class StatesListResponse(BaseModel):
    country_code: str
    states: list[StateSummary]
