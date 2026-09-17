"""Simple Redis-backed rate limiting for auth endpoints (Secure-by-Default)."""

from __future__ import annotations

from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from src.core.cache import get_redis

_WINDOW_SECONDS = 60
_MAX_REQUESTS = 30
_PROTECTED_PREFIX = "/api/v1/auth/"


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Limits each client IP to _MAX_REQUESTS requests per _WINDOW_SECONDS on auth endpoints."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not request.url.path.startswith(_PROTECTED_PREFIX):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:auth:{client_ip}"
        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, _WINDOW_SECONDS)
        if count > _MAX_REQUESTS:
            # Note: BaseHTTPMiddleware.dispatch() runs outside FastAPI's exception-handler
            # scope, so raising HTTPException here would surface as an unhandled 500
            # instead of a clean 429. Returning a Response directly avoids that pitfall.
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
            )
        return await call_next(request)
