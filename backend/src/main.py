"""ASGI entrypoint (uvicorn src.main:app)."""

from __future__ import annotations

from src.app import app

__all__ = ["app"]
