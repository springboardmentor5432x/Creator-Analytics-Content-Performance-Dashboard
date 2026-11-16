"""Notifications & Alert System router (Module 6).
Provides notifications listing, unread counts, mark-as-read, category filtering,
and automated event milestone evaluation for followers, engagement, content, and revenue.
"""
from datetime import date, datetime
from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    User,
    Notification,
    FollowerGrowth,
    ContentRecord,
    RevenueRecord,
    Campaign,
    AgencyCreator,
)
from ..schemas import (
    NotificationIn,
    NotificationOut,
    NotificationCategory,
    NOTIFICATION_CATEGORIES,
)
from ..services import notification_to_dict, engagement_rate

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Alerts"])


def evaluate_user_notifications(db: Session, user: User) -> list[Notification]:
    """
    Evaluates historical data to generate meaningful milestone and threshold alerts.
    Prevents duplicates by strictly checking for existing notifications with the same title for the user.
    """
    new_notifs: list[Notification] = []

    def _create_if_not_exists(title: str, msg: str, cat: str):
        existing = db.query(Notification.id).filter(
            Notification.user_id == user.id,
            Notification.title == title,
        ).first()
        if not existing:
            n = Notification(
                user_id=user.id,
                title=title,
                message=msg,
                category=cat,
                is_read=False,
                is_demo=False,
            )
            db.add(n)
            new_notifs.append(n)

    # 1. Follower Growth Milestones
    growth_rows = (
        db.query(FollowerGrowth)
        .filter(FollowerGrowth.user_id == user.id)
        .order_by(FollowerGrowth.date.desc())
        .all()
    )
    if growth_rows:
        latest_date = growth_rows[0].date
        latest_day_rows = [g for g in growth_rows if g.date == latest_date]
        tot_followers = sum(g.followers for g in latest_day_rows)
        net_new = sum(g.new_followers for g in latest_day_rows)

        for m_thresh in [10000, 25000, 50000, 100000, 250000]:
            if tot_followers >= m_thresh:
                _create_if_not_exists(
                    f"Audience Milestone: {m_thresh:,} Total Followers Reached!",
                    f"Your audience base across connected channels has officially crossed {m_thresh:,} followers.",
                    "engagement",
                )

        if net_new >= 200:
            _create_if_not_exists(
                f"Audience Surge: +{net_new:,} Followers Gained",
                f"Your channels experienced high subscriber velocity with +{net_new:,} net new followers recorded.",
                "engagement",
            )

    # 2. Content Performance Milestones
    posts = db.query(ContentRecord).filter(ContentRecord.user_id == user.id).all()
    for c in posts:
        if c.views >= 20000:
            _create_if_not_exists(
                f"Viewership Milestone: '{c.title[:35]}' Crossed {c.views:,} Views",
                f"Your post '{c.title}' on {c.platform.title()} reached {c.views:,} views with {c.likes:,} likes.",
                "performance",
            )
        rate = engagement_rate(c.likes, c.comments, c.shares, c.saves, c.reach)
        if rate >= 10.0 and c.reach >= 500:
            _create_if_not_exists(
                f"High Engagement Spike: '{c.title[:35]}' at {rate}%",
                f"Content item '{c.title}' achieved an exceptional {rate}% engagement rate, well above platform benchmark.",
                "performance",
            )

    # 3. Revenue Milestones
    revs = db.query(RevenueRecord).filter(RevenueRecord.user_id == user.id).all()
    if revs:
        tot_rev = sum(r.amount for r in revs)
        if tot_rev >= 10000:
            _create_if_not_exists(
                "Revenue Milestone: $10,000+ Lifetime Creator Earnings",
                f"Congratulations! Your cumulative logged earnings across all revenue streams have surpassed ${int(tot_rev):,}.",
                "revenue",
            )
        for r in revs:
            if r.amount >= 3000.0:
                _create_if_not_exists(
                    f"High-Value Deal: ${int(r.amount):,} {r.source.replace('_', ' ').title()}",
                    f"Logged high-value commercial deal of ${int(r.amount):,} for {r.platform.title()} ({r.notes or 'No notes'}).",
                    "revenue",
                )

    # 4. Role-Specific Milestones
    if user.role == "agency":
        creators_count = db.query(User).filter(User.role == "creator", User.is_active.is_(True)).count()
        if creators_count >= 1:
            _create_if_not_exists(
                "Agency Roster Synchronized",
                f"Your talent management console is actively tracking {creators_count} creators with consolidated campaign reach.",
                "system",
            )
    elif user.role == "marketing":
        camp_count = db.query(Campaign).filter((Campaign.user_id == user.id) | (Campaign.is_demo.is_(True))).count()
        if camp_count >= 1:
            _create_if_not_exists(
                "Marketing Campaigns Active",
                f"Brand campaign intelligence is actively monitoring {camp_count} creator campaigns and audience ROI.",
                "performance",
            )
    elif user.role in ("admin", "administrator"):
        user_count = db.query(User).count()
        _create_if_not_exists(
            "System Governance Operational",
            f"CreatorIQ platform operating normally with {user_count} registered accounts across all system roles.",
            "system",
        )

    if new_notifs:
        db.commit()

    return new_notifs


@router.get("")
def list_notifications(
    category: Optional[str] = Query(default=None, pattern="^(performance|engagement|revenue|system)$"),
    is_read: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List paginated notifications for the authenticated user with optional category & read-status filtering.
    Evaluates new milestone alerts idempotently without duplicates.
    """
    # Evaluate any new milestones
    evaluate_user_notifications(db, current_user)

    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if category:
        q = q.filter(Notification.category == category)
    if is_read is not None:
        q = q.filter(Notification.is_read == is_read)

    total = q.count()
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .scalar()
        or 0
    )

    items = (
        q.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [notification_to_dict(n) for n in items],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "limit": limit,
        "total_pages": ceil(total / limit) if total > 0 else 1,
    }


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the total unread notifications count for the authenticated user.
    """
    unread = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .scalar()
        or 0
    )
    return {"unread_count": unread}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark an individual notification as read.
    Enforces user data isolation: users cannot modify other users' notifications.
    """
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    n.is_read = True
    db.commit()
    db.refresh(n)
    return notification_to_dict(n)


@router.patch("/read-all")
def mark_all_notifications_read(
    category: Optional[str] = Query(default=None, pattern="^(performance|engagement|revenue|system)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marks all notifications (or all in a given category) as read for the authenticated user.
    """
    q = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    )
    if category:
        q = q.filter(Notification.category == category)

    updated_count = q.update({"is_read": True}, synchronize_session="fetch")
    db.commit()

    remaining_unread = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .scalar()
        or 0
    )

    return {
        "success": True,
        "updated_count": updated_count,
        "unread_count": remaining_unread,
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dismiss / delete a notification.
    """
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    db.delete(n)
    db.commit()
    return {"success": True, "message": "Notification removed."}


@router.post("/evaluate")
def trigger_milestone_evaluation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Explicitly triggers milestone check and alert generation.
    Returns generated notification items.
    """
    new_notifs = evaluate_user_notifications(db, current_user)
    return {
        "success": True,
        "generated_count": len(new_notifs),
        "new_notifications": [notification_to_dict(n) for n in new_notifs],
    }


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_custom_notification(
    body: NotificationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a custom alert/notification for the current user.
    """
    n = Notification(
        user_id=current_user.id,
        title=body.title,
        message=body.message,
        category=body.category,
        is_read=False,
        is_demo=False,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return notification_to_dict(n)


@router.post("/scheduled-reports/run")
def trigger_scheduled_reports(
    current_user: User = Depends(get_current_user),
):
    """
    Triggers automated weekly digest generation across active creators (Module 8 & 10).
    Runs via Celery worker or in-process fallback.
    """
    from ..tasks import execute_generate_weekly_digests
    result = execute_generate_weekly_digests()
    return {"success": True, "result": result}


@router.post("/scheduled-milestones/run")
def trigger_scheduled_milestones(
    current_user: User = Depends(get_current_user),
):
    """
    Triggers periodic milestone and threshold alert evaluation across active creators.
    """
    from ..tasks import execute_evaluate_milestones
    result = execute_evaluate_milestones()
    return {"success": True, "result": result}


@router.get("/weekly-digest")
def get_user_weekly_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the most recent weekly performance digest notification for the logged-in user.
    """
    digest = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.title.like("Weekly Performance Digest%")
    ).order_by(desc(Notification.created_at)).first()

    if not digest:
        # Fallback to general performance alert or generate on demand
        from ..tasks import execute_generate_weekly_digests
        execute_generate_weekly_digests()
        digest = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.title.like("Weekly Performance Digest%")
        ).order_by(desc(Notification.created_at)).first()

    if not digest:
        return {
            "title": "Weekly Performance Summary",
            "message": "No activity recorded in the past 7 days to generate a weekly digest.",
            "category": "performance",
            "created_at": datetime.now()
        }

    return notification_to_dict(digest)


