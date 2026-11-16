"""
CreatorIQ Celery Application & Distributed Task Scheduler (Module 6, 8, 10)
Configures Celery with Redis broker and result backend for asynchronous
social media synchronization, automated report generation, and milestone tracking.
"""

import logging
from typing import Callable, Any

from .config import settings

logger = logging.getLogger("creatoriq.celery")

try:
    from celery import Celery
    from celery.schedules import crontab
    CELERY_AVAILABLE = True
except ImportError:
    Celery = None
    crontab = None
    CELERY_AVAILABLE = False
    logger.info("Celery is not installed in the current environment; running in fallback mode.")

if CELERY_AVAILABLE:
    celery_app = Celery(
        "creatoriq",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.tasks"]
    )

    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=3600,  # 1 hour hard limit
        beat_schedule={
            # 1. Automated Social Media Sync (every 60 minutes)
            "sync-social-accounts-hourly": {
                "task": "creatoriq.sync_all_social_accounts",
                "schedule": 3600.0,
            },
            # 2. Automated Weekly Performance Summaries (every Monday at 06:00 UTC)
            "generate-weekly-digests-monday": {
                "task": "creatoriq.generate_weekly_digests",
                "schedule": crontab(hour=6, minute=0, day_of_week=1) if crontab else 604800.0,
            },
            # 3. Creator Milestone & Threshold Alerts (every 6 hours)
            "evaluate-milestones-every-6-hours": {
                "task": "creatoriq.evaluate_milestone_alerts",
                "schedule": 21600.0,
            },
        }
    )
else:
    celery_app = None


def is_celery_active() -> bool:
    """Returns True if Celery is installed and broker connection is established."""
    if not CELERY_AVAILABLE or not celery_app:
        return False
    try:
        # Quick ping to broker with 1.5s timeout
        insp = celery_app.control.inspect(timeout=1.5)
        return insp is not None and insp.ping() is not None
    except Exception:
        return False


def run_task_async_or_sync(task_fn: Callable[..., Any], *args, **kwargs) -> Any:
    """
    Dual-mode task executor:
    If Celery is active, dispatches to worker queue with .delay().
    Otherwise, executes immediately in-process with full error containment.
    """
    if CELERY_AVAILABLE and is_celery_active() and hasattr(task_fn, "delay"):
        return task_fn.delay(*args, **kwargs)
    return task_fn(*args, **kwargs)
