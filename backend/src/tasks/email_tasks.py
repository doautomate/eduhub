"""Async dispatch of OTP verification emails (T050).

Enqueues the actual send via `background_jobs.enqueue` so callers (e.g.
`OtpService.issue`) are never blocked waiting on email delivery.
"""

from __future__ import annotations

from src.services import notification_service
from src.tasks.background_jobs import enqueue


def dispatch_otp_email(to_email: str, code: str) -> None:
    """Enqueue a background send of the OTP email; returns immediately."""
    enqueue(lambda: notification_service.send_otp_email(to_email, code))


def dispatch_profile_change_email(to_email: str, *, changed_section: str) -> None:
    """Enqueue a background send of the profile-change security-notification email
    (013-profile-popover-management, FR-022); returns immediately. `enqueue()` already
    catches and logs any failure, so a delivery failure never blocks or rolls back the
    profile change that already succeeded (Edge Cases)."""
    enqueue(
        lambda: notification_service.send_profile_change_email(
            to_email, changed_section=changed_section
        )
    )
