"""Password hashing and JWT encode/decode helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from src.core.config import get_settings

settings = get_settings()

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password with Argon2id. Plaintext is never persisted or logged."""
    return str(_pwd_context.hash(plain_password))


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored Argon2id hash."""
    return bool(_pwd_context.verify(plain_password, password_hash))


def create_access_token(subject: str) -> tuple[str, int]:
    """Create a short-lived access JWT. Returns (token, expires_in_seconds)."""
    now = datetime.now(UTC)
    expires_in = settings.access_token_expire_minutes * 60
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify an access JWT. Raises jwt.PyJWTError if invalid/expired/tampered."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def create_refresh_token_id() -> str:
    """Generate a new random refresh-token identifier (embedded as the Redis key suffix)."""
    return str(uuid.uuid4())
