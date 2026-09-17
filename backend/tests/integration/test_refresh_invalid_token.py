"""Endpoint-level test for POST /api/v1/auth/refresh when a refresh_token cookie IS
present but does not correspond to any active session in Redis (e.g. expired /
revoked / forged token id) - covers the InvalidRefreshTokenError branch distinct
from the "no cookie at all" branch already covered elsewhere.
"""

from __future__ import annotations


def test_refresh_with_unknown_token_cookie_returns_401_and_clears_cookie(test_client):
    test_client.cookies.set("refresh_token", "some-unknown-refresh-token-id")

    response = test_client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Session expired. Please log in again."
    set_cookie_headers = response.headers.get_list("set-cookie")
    assert any(
        h.startswith("refresh_token=") and ("Max-Age=0" in h or "max-age=0" in h.lower())
        for h in set_cookie_headers
    )
