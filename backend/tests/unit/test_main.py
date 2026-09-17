"""Trivial smoke test for the ASGI entrypoint module (src/main.py)."""

from __future__ import annotations

from fastapi import FastAPI

from src.main import app


def test_main_exports_a_fastapi_app_instance():
    assert isinstance(app, FastAPI)
