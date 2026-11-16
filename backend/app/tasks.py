"""
CreatorIQ Background Task Definitions (Module 6, 8, 10)
Defines asynchronous workers for automated social data synchronization,
weekly performance digests, and milestone alert evaluations.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from .celery_app import CELERY_AVAILABLE, celery_app
from .database import SessionLocal
from .models import ContentRecord, FollowerGrowth, Notification, RevenueRecord, SocialConnection, User
from .routers.websocket import ws_manager
from .services_social import sync_all_user_connections

logger = logging.getLogger("creatoriq.tasks")


def execute_sync_all_social_accounts() -> Dict[str, Any]:
    """
    Synchronizes metrics for all active social media connections across all users.
    Called on a scheduled hourly basis or triggered manually by admin.
    """
    logger.info("Starting scheduled social media account synchronization...")
    results = {"total_users": 0, "synced_users": 0, "details": []}

    with SessionLocal() as db:
        users = db.query(User).filter(User.is_active == True).all()
        results["total_users"] = len(users)

        for user in users:
            # Check if user has active connections
            conn_count = db.query(SocialConnection).filter_by(
                user_id=user.id,
                status="connected"
            ).count()

            if conn_count > 0:
                try:
                    sync_res = sync_all_user_connections(db, user.id)
                    results["synced_users"] += 1
                    results["details"].append({
                        "user_id": user.id,
                        "email": user.email,
                        "platforms": sync_res
                    })
                except Exception as e:
                    logger.error("Error syncing connections for user %s: %s", user.id, e)

    logger.info("Social account synchronization complete: %s/%s users updated.",
                results["synced_users"], results["total_users"])
    return results


def execute_generate_weekly_digests() -> Dict[str, Any]:
    """
    Generates weekly performance digests for active creators (Module 8).
    Summarizes week-over-week views, engagement, top post, and revenue.
    """
    logger.info("Generating weekly performance summaries...")
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    fourteen_days_ago = today - timedelta(days=14)

    generated_count = 0
    with SessionLocal() as db:
        creators = db.query(User).filter(User.is_active == True).all()

        for creator in creators:
            # Current 7 days metrics
            curr_content = db.query(ContentRecord).filter(
                ContentRecord.user_id == creator.id,
                ContentRecord.published_at >= seven_days_ago,
                ContentRecord.published_at <= today
            ).all()

            # Prior 7 days metrics for trend comparison
            prev_content = db.query(ContentRecord).filter(
                ContentRecord.user_id == creator.id,
                ContentRecord.published_at >= fourteen_days_ago,
                ContentRecord.published_at < seven_days_ago
            ).all()

            curr_views = sum(c.views for c in curr_content)
            prev_views = sum(c.views for c in prev_content)
            curr_engagements = sum(c.likes + c.comments + c.shares + c.saves for c in curr_content)

            # Revenue in last 7 days
            curr_rev = db.query(func.coalesce(func.sum(RevenueRecord.amount), 0.0)).filter(
                RevenueRecord.user_id == creator.id,
                RevenueRecord.date >= seven_days_ago,
                RevenueRecord.date <= today
            ).scalar()

            # Top content item
            top_item = max(curr_content, key=lambda c: c.views) if curr_content else None
            top_title = f'"{top_item.title[:40]}..." ({top_item.views:,} views)' if top_item else "N/A"

            # Growth rate calculation
            view_growth = ((curr_views - prev_views) / prev_views * 100) if prev_views > 0 else 0.0
            growth_symbol = "▲" if view_growth >= 0 else "▼"

            title = f"Weekly Performance Digest: {today.strftime('%b %d')}"
            message = (
                f"Past 7 Days: {curr_views:,} views ({growth_symbol} {abs(view_growth):.1f}%), "
                f"{curr_engagements:,} engagements, ${curr_rev:,.2f} revenue. "
                f"Top Content: {top_title}."
            )

            # Avoid spamming duplicates if a digest for this date was already created
            existing = db.query(Notification).filter(
                Notification.user_id == creator.id,
                Notification.title == title
            ).first()

            if not existing:
                notif = Notification(
                    user_id=creator.id,
                    title=title,
                    message=message,
                    category="performance",
                    is_demo=False
                )
                db.add(notif)
                db.commit()
                generated_count += 1

    logger.info("Weekly digest generation complete: %s summaries published.", generated_count)
    return {"status": "success", "digests_created": generated_count}


def execute_evaluate_milestones() -> Dict[str, Any]:
    """
    Evaluates creator performance against key follower and view milestones (Module 8).
    Creates milestone notifications when thresholds are crossed.
    """
    logger.info("Evaluating creator milestone alerts...")
    alerts_created = 0

    with SessionLocal() as db:
        creators = db.query(User).filter(User.is_active == True).all()

        for creator in creators:
            total_views = db.query(func.coalesce(func.sum(ContentRecord.views), 0)).filter(
                ContentRecord.user_id == creator.id
            ).scalar()

            # Check view thresholds: 10k, 50k, 100k, 500k, 1M
            for threshold, label in [
                (1_000_000, "1 Million Total Views! 🌟"),
                (500_000, "500,000 Total Views! 🚀"),
                (100_000, "100,000 Views Milestone! 🎉"),
                (50_000, "50,000 Views Milestone! 📈"),
                (10_000, "10,000 Views Milestone! ✨"),
            ]:
                if total_views >= threshold:
                    title = f"Milestone Unlocked: {label}"
                    existing = db.query(Notification).filter_by(
                        user_id=creator.id,
                        title=title
                    ).first()

                    if not existing:
                        db.add(Notification(
                            user_id=creator.id,
                            title=title,
                            message=f"Congratulations! Your channel has surpassed {threshold:,} lifetime views across all platforms.",
                            category="performance"
                        ))
                        db.commit()
                        alerts_created += 1
                        break  # Only award highest new milestone in this pass

    logger.info("Milestone evaluation complete: %s alerts generated.", alerts_created)
    return {"status": "success", "milestones_created": alerts_created}


# Celery Task Wrappers (Registered only when Celery is present)
if CELERY_AVAILABLE and celery_app:
    @celery_app.task(name="creatoriq.sync_all_social_accounts")
    def task_sync_all_social_accounts():
        return execute_sync_all_social_accounts()

    @celery_app.task(name="creatoriq.generate_weekly_digests")
    def task_generate_weekly_analytics_digest():
        return execute_generate_weekly_digests()

    @celery_app.task(name="creatoriq.evaluate_milestone_alerts")
    def task_evaluate_milestone_alerts():
        return execute_evaluate_milestones()
else:
    task_sync_all_social_accounts = execute_sync_all_social_accounts
    task_generate_weekly_analytics_digest = execute_generate_weekly_digests
    task_evaluate_milestone_alerts = execute_evaluate_milestones

