"""Outbound user notifications (OTP emails), sent over SMTP (stdlib `smtplib`, run in a
worker thread so the blocking network I/O never stalls the asyncio event loop). Defaults
target the local Mailhog dev SMTP server (see docker-compose.dev.yml / core/config.py);
point `smtp_*` settings at a real provider (SES/SendGrid/etc. via their SMTP relay) for
other environments without changing the calling contract from `email_tasks.py`.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from src.core.config import get_settings

logger = logging.getLogger("services.notification")


def _build_message(to_email: str, code: str) -> EmailMessage:
    settings = get_settings()
    message = EmailMessage()
    message["Subject"] = "Verify your email address"
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(
        "Welcome!\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code expires in {settings.otp_expiry_minutes} minutes. "
        "If you did not request this, you can safely ignore this email."
    )
    return message


def _send_sync(message: EmailMessage) -> None:
    settings = get_settings()
    smtp_cls = smtplib.SMTP_SSL if settings.smtp_use_tls else smtplib.SMTP
    with smtp_cls(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


def _build_profile_change_message(to_email: str, *, changed_section: str) -> EmailMessage:
    settings = get_settings()
    message = EmailMessage()
    message["Subject"] = "Your account details were changed"
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(
        "Hello,\n\n"
        f"Your {changed_section} was just updated on your account.\n\n"
        "If you made this change, no action is needed. If you did not make this change, "
        "please secure your account immediately."
    )
    return message


async def send_otp_email(to_email: str, code: str) -> None:
    """Send a verification-code email to `to_email`.

    The raw `code` is intentionally never logged (FR-018/SC-006) - only that a send was
    attempted/succeeded/failed. The code is embedded in the outgoing message body, which
    is not logged either.
    """
    message = _build_message(to_email, code)
    try:
        await asyncio.to_thread(_send_sync, message)
    except Exception:
        logger.exception("otp_email_dispatch_failed", extra={"to_email": to_email})
        raise
    logger.info("otp_email_dispatched", extra={"to_email": to_email})


async def send_profile_change_email(to_email: str, *, changed_section: str) -> None:
    """Send a security-notification email after a successful profile field change
    (013-profile-popover-management, FR-022).

    Unlike `send_otp_email`, failures here are caught and logged, never re-raised - a
    notification-delivery failure MUST NOT roll back or block the profile change that
    already succeeded (Edge Cases: "notification email fails to send").
    """
    message = _build_profile_change_message(to_email, changed_section=changed_section)
    try:
        await asyncio.to_thread(_send_sync, message)
    except Exception:
        logger.exception(
            "profile_change_email_dispatch_failed",
            extra={"to_email": to_email, "changed_section": changed_section},
        )
        return
    logger.info(
        "profile_change_email_dispatched",
        extra={"to_email": to_email, "changed_section": changed_section},
    )
