"""Structured audit-event logging helper.

MUST NOT log passwords, raw JWTs, or CAPTCHA tokens (spec: FR-011, Audit Event entity).
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("auth.audit")

_SENSITIVE_KEYS = {"password", "access_token", "refresh_token", "captcha_token", "jwt"}


def log_audit_event(event_type: str, user_id: str | None = None, **metadata: Any) -> None:
    """Emit a structured audit log line, stripping any accidentally-included sensitive fields."""
    safe_metadata = {k: v for k, v in metadata.items() if k not in _SENSITIVE_KEYS}
    logger.info(
        "audit_event",
        extra={"event_type": event_type, "user_id": user_id, "metadata": safe_metadata},
    )
