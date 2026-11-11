"""Revenue, exportable reporting, and in-app notification workflows."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import (
    AudienceInsight,
    ContentMetric,
    ContentPost,
    CreatorProfile,
    Notification,
    Report,
    ReportSchedule,
    RevenueRecord,
    SocialAccount,
    User,
)
from app.report_exports import csv_bytes, pdf_bytes, xlsx_bytes
from app.notify import create_notification
from app.schemas import (
    ReportGenerateRequest,
    ReportScheduleCreateRequest,
    ReportScheduleUpdateRequest,
    RevenueCreateRequest,
    RevenueUpdateRequest,
)

router = APIRouter(tags=["Revenue, reporting and notifications"])


def _profile(db: Session, user: User) -> CreatorProfile:
    profile = (
        db.query(CreatorProfile)
        .filter(CreatorProfile.user_id == user.id)
        .one_or_none()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A creator workspace is required for this feature.",
        )
    return profile


def _money(value: Decimal | int | float) -> float:
    return round(float(value or 0), 2)


def _record_data(record: RevenueRecord) -> dict:
    return {
        "id": record.id,
        "source": record.source,
        "amount": _money(record.amount),
        "currency": record.currency,
        "description": record.description,
        "recorded_on": record.recorded_on.isoformat(),
    }


def _notification_data(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "category": notification.category,
        "link": notification.link,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }


def _report_data(report: Report) -> dict:
    return {
        "id": report.id,
        "report_type": report.report_type,
        "title": report.title,
        "format": report.format.lower(),
        "days": report.days,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
        "download_url": f"/reports/{report.id}/download" if report.status in {"ready", "sample"} else None,
    }


def _schedule_data(schedule: ReportSchedule) -> dict:
    return {
        "id": schedule.id,
        "report_type": schedule.report_type,
        "format": schedule.format.lower(),
        "days": schedule.days,
        "cadence": schedule.cadence,
        "is_active": schedule.is_active,
        "last_run_at": schedule.last_run_at.isoformat() if schedule.last_run_at else None,
        "next_run_on": schedule.next_run_on.isoformat(),
        "created_at": schedule.created_at.isoformat(),
    }


def _date_window(days: int) -> date:
    return date.today() - timedelta(days=days - 1)


def _report_rows(db: Session, profile: CreatorProfile, report_type: str, days: int) -> list[dict[str, object]]:
    start = _date_window(days)
    if report_type == "revenue":
        records = (
            db.query(RevenueRecord)
            .filter(
                RevenueRecord.creator_profile_id == profile.id,
                RevenueRecord.recorded_on >= start,
            )
            .order_by(RevenueRecord.recorded_on.desc(), RevenueRecord.id.desc())
            .all()
        )
        return [
            {
                "date": record.recorded_on.isoformat(),
                "source": record.source,
                "amount": _money(record.amount),
                "currency": record.currency,
                "description": record.description or "",
            }
            for record in records
        ]

    if report_type == "audience":
        accounts = (
            db.query(SocialAccount)
            .filter(SocialAccount.creator_profile_id == profile.id)
            .order_by(SocialAccount.platform)
            .all()
        )
        rows: list[dict[str, object]] = []
        for account in accounts:
            insight = (
                db.query(AudienceInsight)
                .filter(AudienceInsight.social_account_id == account.id)
                .order_by(AudienceInsight.recorded_on.desc())
                .first()
            )
            rows.append(
                {
                    "platform": account.platform,
                    "handle": account.handle,
                    "followers": account.followers_count,
                    "insight_date": insight.recorded_on.isoformat() if insight else "Unavailable",
                    "reach": insight.reach if insight and "reach" in (insight.metrics_available or []) else "Unavailable",
                    "impressions": insight.impressions if insight and "impressions" in (insight.metrics_available or []) else "Unavailable",
                }
            )
        return rows

    rows = (
        db.query(ContentMetric, ContentPost, SocialAccount)
        .join(ContentPost, ContentMetric.content_post_id == ContentPost.id)
        .join(SocialAccount, ContentPost.social_account_id == SocialAccount.id)
        .filter(
            SocialAccount.creator_profile_id == profile.id,
            ContentMetric.recorded_on >= start,
        )
        .all()
    )
    totals: dict[str, int] = defaultdict(int)
    for metric, _, _ in rows:
        for field in ("views", "likes", "comments", "shares", "saves", "reach", "impressions"):
            if field in (metric.metrics_available or []):
                totals[field] += int(getattr(metric, field) or 0)
    return [
        {"metric": field.replace("_", " ").title(), "value": totals[field], "period_days": days}
        for field in ("views", "likes", "comments", "shares", "saves", "reach", "impressions")
    ]


def _make_report(
    db: Session,
    profile: CreatorProfile,
    report_type: str,
    format_name: str,
    days: int,
) -> Report:
    title = f"{report_type.title()} report - last {days} days"
    report = Report(
        creator_profile_id=profile.id,
        report_type=report_type,
        title=title,
        format=format_name.upper(),
        days=days,
        rows=_report_rows(db, profile, report_type, days),
        status="ready",
    )
    db.add(report)
    db.flush()
    report.file_url = f"/api/reports/{report.id}/download"
    return report


def _advance_schedule(schedule: ReportSchedule) -> None:
    schedule.last_run_at = datetime.now(timezone.utc)
    schedule.next_run_on = date.today() + timedelta(days=7 if schedule.cadence == "weekly" else 30)


def run_due_schedules(db: Session) -> int:
    """Generate due reports. Called hourly while the local API is running."""
    schedules = (
        db.query(ReportSchedule)
        .filter(
            ReportSchedule.is_active.is_(True),
            ReportSchedule.next_run_on <= date.today(),
        )
        .all()
    )
    for schedule in schedules:
        profile = schedule.creator_profile
        report = _make_report(db, profile, schedule.report_type, schedule.format.lower(), schedule.days)
        _advance_schedule(schedule)
        create_notification(
            db,
            profile=profile,
            title="Scheduled report is ready",
            message=f"{report.title} is ready to download.",
            category="report",
            link="Reports",
        )
    if schedules:
        db.commit()
    return len(schedules)


@router.get("/revenue/records")
def list_revenue_records(
    days: int = Query(default=90, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    records = (
        db.query(RevenueRecord)
        .filter(
            RevenueRecord.creator_profile_id == profile.id,
            RevenueRecord.recorded_on >= _date_window(days),
        )
        .order_by(RevenueRecord.recorded_on.desc(), RevenueRecord.id.desc())
        .all()
    )
    return {"records": [_record_data(record) for record in records]}


@router.post("/revenue/records", status_code=status.HTTP_201_CREATED)
def create_revenue_record(
    payload: RevenueCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    record = RevenueRecord(
        creator_profile_id=profile.id,
        source=payload.source,
        amount=Decimal(str(payload.amount)),
        currency=payload.currency.upper(),
        description=payload.description.strip() if payload.description else None,
        recorded_on=payload.recorded_on,
    )
    db.add(record)
    db.flush()
    create_notification(
        db,
        profile=profile,
        title="Revenue entry recorded",
        message=f"{record.source} income was added to your revenue dashboard.",
        category="revenue",
        link="Revenue",
    )
    db.commit()
    db.refresh(record)
    return _record_data(record)


@router.patch("/revenue/records/{record_id}")
def update_revenue_record(
    record_id: int,
    payload: RevenueUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    record = (
        db.query(RevenueRecord)
        .filter(RevenueRecord.id == record_id, RevenueRecord.creator_profile_id == profile.id)
        .one_or_none()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Revenue record not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "amount" in changes:
        record.amount = Decimal(str(changes["amount"]))
    if "currency" in changes:
        record.currency = changes["currency"].upper()
    for field in ("source", "description", "recorded_on"):
        if field in changes:
            value = changes[field]
            setattr(record, field, value.strip() if field == "description" and value else value)
    db.commit()
    db.refresh(record)
    return _record_data(record)


@router.delete("/revenue/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_revenue_record(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    record = (
        db.query(RevenueRecord)
        .filter(RevenueRecord.id == record_id, RevenueRecord.creator_profile_id == profile.id)
        .one_or_none()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Revenue record not found.")
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/revenue/summary")
def revenue_summary(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    start = _date_window(days)
    records = (
        db.query(RevenueRecord)
        .filter(RevenueRecord.creator_profile_id == profile.id, RevenueRecord.recorded_on >= start)
        .all()
    )
    totals_by_currency: dict[str, Decimal] = defaultdict(Decimal)
    source_totals: dict[tuple[str, str], Decimal] = defaultdict(Decimal)
    daily_totals: dict[tuple[date, str], Decimal] = defaultdict(Decimal)
    for record in records:
        totals_by_currency[record.currency] += record.amount
        source_totals[(record.currency, record.source)] += record.amount
        daily_totals[(record.recorded_on, record.currency)] += record.amount
    return {
        "days": days,
        "totals_by_currency": [
            {"currency": currency, "amount": _money(amount)}
            for currency, amount in sorted(totals_by_currency.items())
        ],
        "by_source": [
            {"currency": currency, "source": source, "amount": _money(amount)}
            for (currency, source), amount in sorted(source_totals.items())
        ],
        "daily": [
            {"date": entry_date.isoformat(), "currency": currency, "amount": _money(amount)}
            for (entry_date, currency), amount in sorted(daily_totals.items())
        ],
    }


def _notification_filter(db: Session, user: User):
    """Scope notifications to the signed-in account, whatever its role.

    Creators receive notifications through their CreatorProfile; agency,
    marketing-team, and administrator accounts receive them through user_id.
    """
    if user.role == "creator":
        profile = _profile(db, user)
        return Notification.creator_profile_id == profile.id
    return Notification.user_id == user.id


@router.get("/notifications")
def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scope = _notification_filter(db, user)
    notifications = (
        db.query(Notification)
        .filter(scope)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "notifications": [_notification_data(notification) for notification in notifications],
        "unread_count": sum(not notification.is_read for notification in notifications),
    }


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, _notification_filter(db, user))
        .one_or_none()
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _notification_data(notification)


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scope = _notification_filter(db, user)
    (
        db.query(Notification)
        .filter(scope, Notification.is_read.is_(False))
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/reports")
def list_reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    reports = (
        db.query(Report)
        .filter(Report.creator_profile_id == profile.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return {"reports": [_report_data(report) for report in reports]}


@router.post("/reports/generate", status_code=status.HTTP_201_CREATED)
def generate_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    report = _make_report(db, profile, payload.report_type, payload.format, payload.days)
    create_notification(
        db,
        profile=profile,
        title="Report ready for download",
        message=f"{report.title} has been prepared as {report.format}.",
        category="report",
        link="Reports",
    )
    db.commit()
    db.refresh(report)
    return _report_data(report)


@router.get("/reports/schedules")
def list_report_schedules(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    schedules = (
        db.query(ReportSchedule)
        .filter(ReportSchedule.creator_profile_id == profile.id)
        .order_by(ReportSchedule.created_at.desc())
        .all()
    )
    return {"schedules": [_schedule_data(schedule) for schedule in schedules]}


@router.post("/reports/schedules", status_code=status.HTTP_201_CREATED)
def create_report_schedule(
    payload: ReportScheduleCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    schedule = ReportSchedule(
        creator_profile_id=profile.id,
        report_type=payload.report_type,
        format=payload.format.upper(),
        days=payload.days,
        cadence=payload.cadence,
        next_run_on=date.today() + timedelta(days=7 if payload.cadence == "weekly" else 30),
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return _schedule_data(schedule)


@router.patch("/reports/schedules/{schedule_id}")
def update_report_schedule(
    schedule_id: int,
    payload: ReportScheduleUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    schedule = (
        db.query(ReportSchedule)
        .filter(ReportSchedule.id == schedule_id, ReportSchedule.creator_profile_id == profile.id)
        .one_or_none()
    )
    if schedule is None:
        raise HTTPException(status_code=404, detail="Report schedule not found.")
    schedule.is_active = payload.is_active
    db.commit()
    db.refresh(schedule)
    return _schedule_data(schedule)


@router.post("/reports/schedules/{schedule_id}/run")
def run_report_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    schedule = (
        db.query(ReportSchedule)
        .filter(ReportSchedule.id == schedule_id, ReportSchedule.creator_profile_id == profile.id)
        .one_or_none()
    )
    if schedule is None:
        raise HTTPException(status_code=404, detail="Report schedule not found.")
    report = _make_report(db, profile, schedule.report_type, schedule.format.lower(), schedule.days)
    _advance_schedule(schedule)
    db.add(
        Notification(
            creator_profile_id=profile.id,
            title="Scheduled report is ready",
            message=f"{report.title} is ready to download.",
            category="report",
        )
    )
    db.commit()
    db.refresh(report)
    return _report_data(report)


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("creator")),
):
    profile = _profile(db, user)
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.creator_profile_id == profile.id)
        .one_or_none()
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    days = report.days
    report_type = report.report_type if report.report_type in {"performance", "revenue", "audience"} else "performance"
    # Reports generated before snapshot storage was introduced still export
    # successfully, while newly generated reports are immutable snapshots.
    rows = report.rows if report.rows is not None else _report_rows(db, profile, report_type, days)
    format_name = report.format.lower()
    safe_stem = f"creatoriq-{report_type}-{days}d-{date.today().isoformat()}"
    if format_name == "xlsx":
        payload, media_type, extension = xlsx_bytes(rows, report.title), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    elif format_name == "csv":
        payload, media_type, extension = csv_bytes(rows), "text/csv; charset=utf-8", "csv"
    else:
        payload, media_type, extension = pdf_bytes(report.title, rows), "application/pdf", "pdf"
    return StreamingResponse(
        BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_stem}.{extension}"'},
    )
