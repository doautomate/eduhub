"""Redis client accessor used for refresh-token revocation and login-failure counters."""

from __future__ import annotations

from functools import lru_cache

import redis.asyncio as redis

from src.core.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    """Return a process-wide async Redis client built from REDIS_URL."""
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)
