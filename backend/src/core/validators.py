"""Shared field-level validators reused across multiple Pydantic schemas.

Extracted so that registration and later profile-update flows validate the same shapes
identically (013-profile-popover-management, research.md decision #2) rather than each
maintaining its own copy of the same rule.
"""

from __future__ import annotations

import re

_MOBILE_NUMBER_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")


def validate_mobile_number(value: str) -> str:
    """Trim and validate a mobile number against the shared format rule.

    Raises `ValueError` (which Pydantic turns into a 422) if the trimmed value does not
    match `^\\+?[0-9]{7,15}$` - an optional leading `+` country code followed by 7-15
    digits, same rule used at registration.
    """
    stripped = value.strip()
    if not _MOBILE_NUMBER_PATTERN.match(stripped):
        raise ValueError(
            "Mobile number must contain 7-15 digits, with an optional leading '+' country code."
        )
    return stripped
