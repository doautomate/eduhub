"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Values are sourced from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./app.db"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "dev-secret-change-me-please-use-32-bytes-min"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    recaptcha_site_key: str = ""
    recaptcha_secret_key: str = ""
    login_failure_threshold: int = 3

    # Fernet key used to encrypt sensitive at-rest fields (DOB, mobile number). Must be a
    # urlsafe-base64-encoded 32-byte key; see backend/src/core/encryption.py.
    field_encryption_key: str = "6HN7zXj1uSGHwCbz-m_Da9ZJHI9hthz1gTsXJ1lsDdk="

    # Email verification (OTP) settings (FR-011/013/014, research.md §2).
    otp_code_length: int = 6
    otp_expiry_minutes: int = 10
    otp_max_attempts: int = 3
    otp_resend_cooldown_seconds: int = 60

    # Account-recovery settings (FR-015/016, research.md §5).
    recovery_max_failures: int = 5
    recovery_lock_minutes: int = 15
    recovery_reset_token_expire_minutes: int = 15
    minimum_registration_age_years: int = 13

    # Outbound email (SMTP) settings for OTP/verification emails
    # (src/services/notification_service.py). Defaults target the local
    # Mailhog dev SMTP server (docker-compose.dev.yml); override via env vars
    # for a real provider in other environments.
    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    smtp_use_tls: bool = False
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "no-reply@example.com"
    smtp_from_name: str = "EduVid"


@lru_cache
def get_settings() -> Settings:
    return Settings()
