"""Password strength heuristic (research.md §3): a small, dependency-free length +
character-class-diversity heuristic bucketed into Weak/Fair/Strong. Mirrored client-side
in `frontend/src/features/users/components/PasswordStrengthMeter.tsx` so the client and
server never disagree on the minimum acceptable ("Fair") bar.
"""

from __future__ import annotations

import string
from typing import Literal

Strength = Literal["weak", "fair", "strong"]

_MIN_LENGTH = 8
_STRONG_LENGTH = 12


def _character_class_count(password: str) -> int:
    classes = 0
    if any(c in string.ascii_lowercase for c in password):
        classes += 1
    if any(c in string.ascii_uppercase for c in password):
        classes += 1
    if any(c in string.digits for c in password):
        classes += 1
    if any(c not in string.ascii_letters + string.digits for c in password):
        classes += 1
    return classes


def compute_strength(password: str) -> Strength:
    """Bucket a password into Weak/Fair/Strong based on length and character diversity."""
    if len(password) < _MIN_LENGTH:
        return "weak"

    classes = _character_class_count(password)
    if len(password) >= _STRONG_LENGTH and classes >= 3:
        return "strong"
    if classes >= 2:
        return "fair"
    return "weak"


def min_strength_met(password: str) -> bool:
    """True once a password reaches at least the "Fair" bucket (the enforced minimum)."""
    return compute_strength(password) != "weak"
