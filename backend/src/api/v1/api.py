"""Aggregates all v1 API routers."""

from __future__ import annotations

from fastapi import APIRouter

from src.api.v1.endpoints.auth import router as auth_router
from src.api.v1.endpoints.locations import router as locations_router
from src.api.v1.endpoints.users import router as users_router
from src.api.v1.endpoints.verification import router as verification_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(verification_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(locations_router, prefix="/locations", tags=["locations"])
