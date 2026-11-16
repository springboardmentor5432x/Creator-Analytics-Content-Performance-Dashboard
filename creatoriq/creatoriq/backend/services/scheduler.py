"""Background scheduler: live metrics tick, scheduled sync, weekly report notification."""
import asyncio, logging
from datetime import date

from ..config import LIVE_TICK_SECONDS, SYNC_MINUTES
from ..database import db, q
from .. import cache
from . import connectors

log = logging.getLogger("creatoriq.scheduler")


def _job(sync: bool, weekly: bool):
    with db() as c:
        connectors.live_tick(c)
        if sync:
            for u in q(c, "SELECT DISTINCT user_id FROM accounts"):
                connectors.sync_user(c, u["user_id"])
        if weekly:
            tag = date.today().strftime("%G-W%V")
            for u in q(c, "SELECT id, settings FROM users WHERE role='creator'"):
                if '"weekly_report": false' in (u["settings"] or ""):
                    continue
                connectors.notify(c, u["id"], "info", f"Weekly analytics report ready ({tag})",
                                  "Open Reports to download your weekly PDF/Excel summary.")
    cache._store.clear()


async def run():
    ticks, per_sync = 0, max(1, (SYNC_MINUTES * 60) // LIVE_TICK_SECONDS)
    while True:
        await asyncio.sleep(LIVE_TICK_SECONDS)
        ticks += 1
        try:
            await asyncio.get_running_loop().run_in_executor(
                None, _job, ticks % per_sync == 0, date.today().weekday() == 0 and ticks % per_sync == 0)
        except Exception as e:  # never kill the scheduler
            log.warning("scheduler job failed: %s", e)
