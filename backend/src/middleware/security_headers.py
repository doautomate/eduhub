"""Adds standard security response headers to every response (Secure by Default).

Findings from the 2026-09-14 manual pen-test pass against the local dev stack:
this API previously returned no `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, or `Strict-Transport-Security` headers,
and no `Content-Security-Policy` at all. This middleware closes that gap.

The interactive API docs (`/docs`, `/redoc`) load their JS/CSS from
`cdn.jsdelivr.net` (Swagger UI / ReDoc) plus Google Fonts and a favicon from
`fastapi.tiangolo.com`, so a single strict CSP for the whole app would either
break the docs or force a much looser policy everywhere else. Instead, the
docs/openapi paths get a CSP scoped to just what they need, and every other
(JSON API) response gets a strict, effectively locked-down CSP - APIs never
render markup, so there's nothing legitimate for a CSP to allow there.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

_DOCS_PATHS = frozenset({"/docs", "/redoc", "/docs/oauth2-redirect"})
_OPENAPI_PATH = "/openapi.json"

_DOCS_CSP = (
    "default-src 'none'; "
    "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net fonts.googleapis.com; "
    "img-src 'self' data: fastapi.tiangolo.com cdn.jsdelivr.net; "
    "font-src 'self' data: fonts.gstatic.com; "
    "connect-src 'self'"
)
_API_CSP = "default-src 'none'; frame-ancestors 'none'"

_COMMON_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    # HSTS is a no-op over plain HTTP (browsers ignore it on non-HTTPS
    # responses) but must be present so it takes effect the moment this API
    # is served over HTTPS in any deployed environment.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attaches baseline security headers, including a route-appropriate CSP,
    to every response this app returns."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        for name, value in _COMMON_HEADERS.items():
            response.headers.setdefault(name, value)
        if request.url.path in _DOCS_PATHS or request.url.path == _OPENAPI_PATH:
            response.headers.setdefault("Content-Security-Policy", _DOCS_CSP)
        else:
            response.headers.setdefault("Content-Security-Policy", _API_CSP)
        return response
