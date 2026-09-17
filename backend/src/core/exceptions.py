"""Auth-domain exceptions mapped to HTTP responses by the endpoints layer."""

from __future__ import annotations

from datetime import datetime


class EmailAlreadyRegisteredError(Exception):
    """Raised when registering an email that already has an account."""


class MobileNumberAlreadyRegisteredError(Exception):
    """Raised when registering a mobile number that already has an account."""


class InvalidCredentialsError(Exception):
    """Raised on login with a wrong password or unregistered email (generic, non-revealing)."""


class CaptchaRequiredError(Exception):
    """Raised when the login-failure counter has reached the CAPTCHA threshold."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token is missing, expired, or revoked."""


class NotAuthenticatedError(Exception):
    """Raised when no valid session exists for an action that requires one (e.g. logout)."""


class UserNotFoundError(Exception):
    """Raised when the JWT subject no longer maps to an existing user (e.g. deleted account)."""


class CountryNotFoundError(Exception):
    """Raised when a country code is not one of the curated, supported countries (FR-010)."""

    def __init__(self, country_code: str) -> None:
        self.country_code = country_code
        super().__init__(f"Unsupported country code: {country_code!r}")


class StateProvinceMismatchError(Exception):
    """Raised when a state/province does not belong to the selected country (FR-012)."""

    def __init__(self, country_code: str, state_code: str) -> None:
        self.country_code = country_code
        self.state_code = state_code
        super().__init__(
            f"State/province {state_code!r} does not belong to country {country_code!r}"
        )


class UnderMinimumAgeError(Exception):
    """Raised when a registrant's Date of Birth indicates they are below the platform's
    minimum required age (spec Assumptions: 13 years, edge case)."""


class EmailNotVerifiedError(Exception):
    """Raised on login when credentials are correct but the account has not completed
    OTP verification yet (FR-012)."""


class InvalidOtpError(Exception):
    """Raised when a submitted OTP is incorrect or expired (FR-013)."""

    def __init__(self, attempts_remaining: int) -> None:
        self.attempts_remaining = attempts_remaining
        super().__init__("Incorrect or expired verification code.")


class OtpAttemptsExceededError(Exception):
    """Raised when the active OTP's attempt limit has been reached; caller must resend."""


class OtpResendCooldownError(Exception):
    """Raised when an OTP resend is requested before the resend cooldown has elapsed."""

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Please wait before requesting another code.")


class InvalidSecurityAnswerError(Exception):
    """Raised when a security-question recovery answer does not match (FR-016)."""


class RecoveryLockedError(Exception):
    """Raised when recovery attempts are temporarily locked after repeated failures."""

    def __init__(self, locked_until: datetime) -> None:
        self.locked_until = locked_until
        super().__init__("Account recovery is temporarily locked.")


class InvalidResetTokenError(Exception):
    """Raised when a password-reset token is missing, expired, or already used."""
