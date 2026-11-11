# Milestone 3 - Revenue, Reports, and Notifications

CreatorIQ Milestone 3 gives each Creator workspace a local, owner-scoped monetization and reporting workflow. No revenue records, notifications, or reports are shared between creator accounts.

## Run locally

From `backend`, activate the project virtual environment and apply migrations before starting an existing database:

```powershell
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

In a second terminal, from `frontend`:

```powershell
npm run dev
```

Sign in with the local Creator demo account and use the **Revenue** and **Reports** navigation items. These screens are intentionally hidden for non-Creator roles because the underlying records are creator-owned.

## Revenue workflow

1. Open **Revenue** and select **Add revenue**.
2. Choose a source, enter the actual amount/currency, and set the received date.
3. Review the 90-day trend, income mix, and record list.
4. Use the pencil action on a record to correct its source, amount, currency, note, or date; use the trash action to remove it. Only the owner’s workspace can change the record.

When more than one currency has been recorded, the Revenue page shows a currency strip and keeps the KPI, chart, and income mix focused on the selected currency. The API keeps totals separate by currency to avoid producing misleading mixed-currency totals; `revenue_mtd` is returned as a scalar only when exactly one currency exists.

## Notifications

Open **Notifications** from the Creator navigation, or use the bell in the topbar. The page lists revenue and report activity, supports marking one notification or all notifications as read, and stays scoped to the signed-in Creator. Agency, Marketing Team, and Administrator accounts cannot request this feed.

## Export workflow

1. Open **Reports**.
2. Pick Performance, Revenue, or Audience data; then choose PDF, Excel, or CSV and a time period.
3. Select **Create report**, then download it from the Recent reports list.

Reports are stored as report records and regenerated from current, saved CreatorIQ data at download time. This keeps the local prototype free of shared public report URLs and external storage dependencies.

## Scheduled reports

Create a weekly or monthly schedule from **Reports**. The FastAPI application runs a lightweight local check every hour while it is running. You can also use **Run now** to verify a schedule immediately.

For a production deployment, move `run_due_schedules` to a monitored worker or scheduler and add retry/alert handling. This project’s local runner is designed for a single-process demonstration workflow rather than guaranteed background execution during downtime.

## Verification

Run the complete local checks:

```powershell
cd backend
python -m pytest -q

cd ..\frontend
npm run build
```

The tests cover creator ownership of revenue records (including updates and deletes), PDF, Excel, and CSV report generation/download, notifications, scheduled report generation, credential-field non-exposure, administrator privacy boundaries, and the consent-based collaboration flow. They use local/mocked data and do not require provider credentials.
