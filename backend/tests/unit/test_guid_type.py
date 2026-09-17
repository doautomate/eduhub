"""Direct unit tests for the GUID TypeDecorator (models/user.py), covering the
PostgreSQL vs. fallback-dialect branch and the bind/result value coercion branches.
"""

from __future__ import annotations

import uuid
from types import SimpleNamespace

from src.models.user import GUID


def test_load_dialect_impl_uses_native_uuid_on_postgresql():
    guid = GUID()
    dialect = SimpleNamespace(name="postgresql", type_descriptor=lambda t: t)
    result = guid.load_dialect_impl(dialect)
    assert type(result).__name__ == "UUID"


def test_load_dialect_impl_falls_back_to_char36_on_other_dialects():
    guid = GUID()
    dialect = SimpleNamespace(name="sqlite", type_descriptor=lambda t: t)
    result = guid.load_dialect_impl(dialect)
    assert type(result).__name__ == "CHAR"
    assert result.length == 36


def test_process_bind_param_passes_through_none():
    guid = GUID()
    assert guid.process_bind_param(None, dialect=None) is None


def test_process_bind_param_stringifies_uuid():
    guid = GUID()
    value = uuid.uuid4()
    assert guid.process_bind_param(value, dialect=None) == str(value)


def test_process_result_value_passes_through_none():
    guid = GUID()
    assert guid.process_result_value(None, dialect=None) is None


def test_process_result_value_returns_uuid_instance_unchanged():
    guid = GUID()
    value = uuid.uuid4()
    assert guid.process_result_value(value, dialect=None) is value


def test_process_result_value_parses_string_into_uuid():
    guid = GUID()
    value = uuid.uuid4()
    result = guid.process_result_value(str(value), dialect=None)
    assert result == value
