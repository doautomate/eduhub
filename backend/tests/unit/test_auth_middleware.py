"""Unit test: access-JWT verification dependency for protected routes."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.core.security import create_access_token
from src.middleware.auth_middleware import get_current_user_id


@pytest.mark.asyncio
async def test_valid_token_resolves_user_id() -> None:
    token, _ = create_access_token(subject="user-123")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    assert await get_current_user_id(creds) == "user-123"


@pytest.mark.asyncio
async def test_missing_credentials_raises_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_id(None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_raises_401() -> None:
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-valid-jwt")
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_id(creds)
    assert exc_info.value.status_code == 401
