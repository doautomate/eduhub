"""Location reference-data endpoints (contracts/locations-api.md, FR-010/FR-011)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.deps import get_location_service_dep
from src.core.exceptions import CountryNotFoundError
from src.schemas.location import (
    CountriesListResponse,
    CountrySummary,
    StatesListResponse,
    StateSummary,
)
from src.services.location_service import LocationService

router = APIRouter()


@router.get("/countries", response_model=CountriesListResponse)
async def list_countries(
    location_service: LocationService = Depends(get_location_service_dep),
) -> CountriesListResponse:
    countries = location_service.list_countries()
    return CountriesListResponse(
        countries=[
            CountrySummary(country_code=c["country_code"], country_name=c["country_name"])
            for c in countries
        ]
    )


@router.get("/countries/{country_code}/states", response_model=StatesListResponse)
async def list_states(
    country_code: str,
    location_service: LocationService = Depends(get_location_service_dep),
) -> StatesListResponse:
    try:
        states = location_service.list_states(country_code)
    except CountryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unsupported country code. Supported: IN, US, GB, CA, AU, DE.",
        ) from exc
    return StatesListResponse(
        country_code=country_code.strip().upper(),
        states=[
            StateSummary(state_code=s["state_code"], state_name=s["state_name"]) for s in states
        ],
    )
