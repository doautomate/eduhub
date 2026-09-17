"""Datetime helpers.

SQLite (used for the in-memory test DB) does not persist timezone offsets even for
columns declared `DateTime(timezone=True)`: values round-trip back as naive `datetime`s.
Postgres does not have this issue. `ensure_aware` normalizes either case to a UTC-aware
`datetime` so comparisons against `datetime.now(timezone.utc)` never raise
`TypeError: can't compare offset-naive and offset-aware datetimes`.
"""

from __future__ import annotations

from datetime import UTC, datetime


def ensure_aware(value: datetime) -> datetime:
    """Return `value` as a UTC-aware datetime, assuming naive values are already UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
