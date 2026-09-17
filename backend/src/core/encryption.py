"""Fernet-based field-level encryption helpers for sensitive at-rest columns.

Used for data that must be reversible (e.g. date of birth, mobile number) as opposed to
one-way hashed data (passwords, security-question answers), which use the Argon2 context
in `src/core/security.py` instead. See specs/005-profile-login-security/research.md §1.
"""

from __future__ import annotations

import base64
import hashlib
import hmac

from cryptography.fernet import Fernet, InvalidToken

from src.core.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.field_encryption_key.encode("utf-8"))


def encrypt_field(plaintext: str) -> str:
    """Encrypt a plaintext string for storage. Returns an opaque base64 token."""
    token = _fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_field(ciphertext: str) -> str:
    """Decrypt a value previously produced by `encrypt_field`.

    Raises `ValueError` if the ciphertext is invalid/tampered, rather than leaking the
    underlying `cryptography` exception type to callers.
    """
    try:
        plaintext = _fernet().decrypt(ciphertext.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Ciphertext is invalid or was encrypted with a different key.") from exc
    return plaintext.decode("utf-8")


def blind_index(value: str) -> str:
    """Deterministic HMAC-SHA256 of `value`, used as a searchable/unique lookup index for
    columns whose primary value is now stored encrypted (e.g. `mobile_number`). Not
    reversible; two equal inputs always produce the same output so equality lookups and
    a unique DB constraint keep working without ever storing the plaintext searchably.
    """
    settings = get_settings()
    digest = hmac.new(
        settings.field_encryption_key.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8")
