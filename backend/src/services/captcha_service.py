"""Server-side reCAPTCHA v2 verification."""

from __future__ import annotations

import httpx

from src.core.config import get_settings

_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_captcha(token: str | None) -> bool:
    """Verify a reCAPTCHA token server-side. Returns False if missing/invalid."""
    settings = get_settings()
    if not token:
        return False
    if not settings.recaptcha_secret_key:
        # No secret configured (e.g. local/dev/test) - treat any non-empty token as valid.
        return True
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            _VERIFY_URL, data={"secret": settings.recaptcha_secret_key, "response": token}
        )
        data = response.json()
        return bool(data.get("success"))
