"""Unit tests for field-level encryption helpers (`core/encryption.py`) — T030."""

from __future__ import annotations

import pytest

from src.core.encryption import blind_index, decrypt_field, encrypt_field


def test_encrypt_then_decrypt_round_trips_to_original_plaintext():
    plaintext = "+15550199999"
    ciphertext = encrypt_field(plaintext)
    assert ciphertext != plaintext
    assert decrypt_field(ciphertext) == plaintext


def test_encrypt_is_non_deterministic_for_the_same_plaintext():
    plaintext = "1990-01-01"
    first = encrypt_field(plaintext)
    second = encrypt_field(plaintext)
    # Fernet tokens embed a random IV/timestamp, so two encryptions of the same value
    # must never collide, even though both decrypt back to the same plaintext.
    assert first != second
    assert decrypt_field(first) == decrypt_field(second) == plaintext


def test_decrypt_with_tampered_ciphertext_raises_value_error():
    ciphertext = encrypt_field("some-value")
    tampered = ciphertext[:-4] + ("A" * 4)
    with pytest.raises(ValueError):
        decrypt_field(tampered)


def test_blind_index_is_deterministic_for_equal_inputs():
    value = "+15550188888"
    assert blind_index(value) == blind_index(value)


def test_blind_index_differs_for_different_inputs():
    assert blind_index("+15550188888") != blind_index("+15550188889")


def test_blind_index_is_not_reversible_to_plaintext():
    value = "+15550177777"
    index = blind_index(value)
    assert value not in index
    assert index != value
