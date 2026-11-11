"""A lightweight in-process scheduler for local report delivery."""

from __future__ import annotations

import asyncio

from app.database import SessionLocal
from app.routers.monetization import run_due_schedules


async def report_scheduler_loop() -> None:
    """Check hourly while the API process is alive; cancellation is intentional."""
    try:
        while True:
            with SessionLocal() as db:
                run_due_schedules(db)
            await asyncio.sleep(60 * 60)
    except asyncio.CancelledError:
        raise
