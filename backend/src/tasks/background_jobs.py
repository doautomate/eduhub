"""Fire-and-forget background task runner for side-effect jobs (e.g. email dispatch).

Uses `asyncio.create_task` so callers (e.g. `AuthService.register`) are never blocked
waiting on I/O that isn't part of the HTTP response contract. Failures are logged, never
propagated to the caller, since a failed side-effect (e.g. a flaky email provider) must
not fail the primary request.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

logger = logging.getLogger("tasks.background_jobs")

# Keep a strong reference to in-flight tasks so they are not garbage-collected mid-run
# (a well-known asyncio.create_task pitfall).
_background_tasks: set[asyncio.Task[None]] = set()


def enqueue(coro_factory: Callable[[], Awaitable[None]]) -> None:
    """Schedule `coro_factory()` to run on the current event loop without blocking."""
    task = asyncio.create_task(_run_safely(coro_factory))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def _run_safely(coro_factory: Callable[[], Awaitable[None]]) -> None:
    try:
        await coro_factory()
    except Exception:  # noqa: BLE001 - a background job failure must never crash the loop
        logger.exception("Background job failed")
