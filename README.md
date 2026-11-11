# CreatorIQ — Creator Analytics & Content Performance Dashboard

[![Backend Tests](https://img.shields.io/badge/backend%20tests-95%20passing-brightgreen)](#testing)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen)](#frontend)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

A production-grade, full-stack analytics platform for creators, agencies, and administrators.
CreatorIQ connects to social platforms (YouTube, Instagram, Facebook, X, LinkedIn), imports
performance metrics, and surfaces content, audience, growth, and revenue analytics behind a
consent-based collaboration model where **creators always own their data**.

> **CreatorIQ 1.0** is the complete deliverable: authentication and role workspaces, platform
> integrations, public creator discovery, analytics, revenue tracking, reports and schedules,
> notifications, and consent-based collaboration.

---

## Table of Contents

- [Features](#features)
- [Role Workspaces](#role-workspaces)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Security & Privacy](#security--privacy)
- [Provider Support Boundary](#provider-support-boundary)
- [Project Structure](#project-structure)
- [Scope & Limitations](#scope--limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

**Analytics & Insights**
- Content analytics with per-metric availability indicators (no fabricated values).
- Audience insights, growth & trends (7/30/90-day windows), and hashtag counts.
- Cumulative snapshots with daily deltas; first fetch is stored as a baseline, not counted as today's activity.
- Revenue tracking with creator-owned records, trends, source breakdowns, inline editing, and currency-separated totals.

**Platform Integrations**
- YouTube OAuth 2.0 (Data + Analytics APIs), encrypted token storage, refresh, sync.
- Instagram (Unified Login / Graph API) for eligible professional Creator/Business accounts.
- Facebook Pages, X (OAuth 2.0 PKCE), and LinkedIn connectors with setup-status detection.
- Public YouTube Creator Discovery with channel/handle resolution, uploads pagination, and timestamped snapshots — distinct from OAuth analytics.

**Reporting & Notifications**
- Downloadable performance, revenue, and audience reports in PDF, Excel (`.xlsx`), and CSV — generated locally, no external service.
- Weekly/monthly saved report schedules with an in-process hourly runner and manual run.
- In-app notifications with per-item and mark-all-read controls; role-scoped inboxes for Creators, Agencies, and Marketing Teams.

**Consent-Based Collaboration**
- Creators explicitly approve, scope, and revoke collaborator access per permission (profile, followers, content, audience, growth, revenue, platforms).
- Permission changes take effect on the collaborator's next request; revocation is immediate.
- Server-side permission gating on every summary endpoint — unauthorized sections are omitted, never masked client-side.

**Account & Security**
- Password change rotates the session token version, revoking all other sessions and returning a fresh token.
- "Log out other sessions" control and a personal login-activity audit trail.
- Brute-force protection: 5 failed sign-ins per IP+email per 10 minutes → HTTP 429.
- CSV formula-injection neutralization in exported reports.
- Role-based access control (Creator, Agency, Marketing Team, Administrator) enforced on the backend.

---

## Role Workspaces

| Role | Workspace pages | Privacy boundary |
|---|---|---|
| **Creator** | Overview, Creator discovery, Connected accounts, Content analytics, Audience insights, Growth & trends, Revenue, Reports, Notifications, Shared access, Account settings | Owns all private social connections; explicitly approves, scopes, and revokes collaborator access per permission. |
| **Agency** | Overview, Creator access, Campaigns, Content, Reports, Notifications, Team management, Account settings | May view only the summaries a Creator approves for that specific Agency workspace; campaign assignments and reports never bypass consent. |
| **Marketing Team** | Overview, Creator access, Notifications, Account settings | Uses the same Creator-consent flow; cannot see another Creator's private credentials or raw analytics. |
| **Administrator** | Overview, User management, Access governance, Account settings | Manages accounts and reviews collaboration state, but cannot open private creator analytics. |

Agency owners/admins manage colleagues from **Team management**; each member signs in with their own account and a scoped workspace role (Owner, Admin, Campaign Manager, Analyst, Viewer). Creators receive requests via **Shared access** and decide which permissions to grant.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, lucide-react, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic, Alembic |
| Database | SQLite (local dev) / PostgreSQL (Docker) |
| Auth | JWT (HS256), bcrypt password hashing, Fernet token encryption |
| Reporting | ReportLab (PDF), openpyxl (XLSX), stdlib (CSV) |
| Testing | pytest, FastAPI TestClient, Vitest-ready frontend |

---

## Architecture

```
┌─────────────────┐        /api (proxy)        ┌──────────────────────┐
│  React / Vite   │ ──────────────────────────▶ │  FastAPI (uvicorn)   │
│  (port 5173)    │                            │  (port 8001)         │
└─────────────────┘                            └──────────┬───────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │  SQLAlchemy ORM      │
                                                │  SQLite / Postgres   │
                                                └──────────────────────┘
```

- **Backend** is organized into routers (`auth`, `account`, `admin`, `agency`, `analytics`, `creators`, `integrations`, `monetization`, `workspace`), services, and models under `backend/app/`.
- **Frontend** is a single-page app in `frontend/src/` with page components under `frontend/src/pages/` and shared styles in `frontend/src/styles.css`.
- Migrations live in `backend/migrations/` (Alembic); the backend runs `alembic upgrade head` automatically on startup.

---

## Quick Start

### Option A — Local development (Windows PowerShell)

**1. Backend**
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Generate a Fernet encryption key (once) and paste it into `backend/.env` as `OAUTH_TOKEN_ENCRYPTION_KEY`:
```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Run the API:
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
Verify `http://127.0.0.1:8001/health` returns `{"status":"ok","service":"creatoriq-api"}`. Docs at `http://127.0.0.1:8001/docs`.

**2. Frontend**
```powershell
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (normally `http://localhost:5173`). The dev proxy forwards `/api` to port 8001.

**3. Sign in with demo accounts**
| Role | Email | Password |
|---|---|---|
| Creator | `demo@creatoriq.dev` | `CreatorIQ@123` |
| Administrator | `admin@creatoriq.dev` | `CreatorIQAdmin@123` |
| Agency | `agency@creatoriq.dev` | `AgencyDemo@123` |
| Marketing Team | `marketing@creatoriq.dev` | `MarketingDemo@123` |

Demo accounts and JWT secrets are for local evaluation only. Set `SEED_DEMO_DATA=false` in `backend/.env` to start with an empty database.

### Option B — Docker Compose

```powershell
Copy-Item .env.example .env
docker compose up --build
```
Frontend at `http://localhost:4173`, API at `http://localhost:8000`, PostgreSQL inside Docker. Stop with `Ctrl+C`, then `docker compose down` (`-v` to delete the volume).

---

## Configuration

All settings are read from `backend/.env` (see `backend/.env.example`). Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite default). |
| `JWT_SECRET_KEY` | JWT signing secret — **replace in production**. |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Fernet key for OAuth token storage (generate once, back it up). |
| `SEED_DEMO_DATA` | Seed demo accounts on startup (`true`/`false`). |
| `YOUTUBE_API_KEY` | Enables public YouTube channel discovery. |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | YouTube OAuth credentials. |
| `META_OAUTH_CLIENT_ID/SECRET` | Shared Meta app credentials (Facebook + Instagram). |
| `META_OAUTH_CONFIG_ID` | Optional Facebook Login for Business config. |
| `INSTAGRAM_CLIENT_ID/SECRET/CONFIG_ID` | Instagram Unified Login (optional, falls back to Meta credentials). |
| `INSTAGRAM_REDIRECT_URI` | Must match the URL registered in the Meta app exactly. |
| `X_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET` | X and LinkedIn OAuth credentials. |

Provider credentials are optional until you connect a provider; the app reports setup status on the **Connected accounts** page.

---

## API Overview

All endpoints are prefixed with `/api`. Selected groups:

| Group | Highlights |
|---|---|
| **Auth** | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/logout` |
| **Account** | `GET/PATCH /account/profile`, `POST /account/password`, `GET/PATCH /account/preferences`, `GET /account/login-activity`, `GET /account/sessions`, `POST /account/sessions/logout-others` |
| **Analytics** | `GET /analytics/content`, `/audience`, `/growth`, `/hashtags` |
| **Integrations** | Provider connect/callback/sync for YouTube, Instagram, Facebook, X, LinkedIn; `GET /integrations/providers`, `/integrations/accounts` |
| **Discovery** | `GET /creators/youtube/search`, `/resolve`, `POST /creators/youtube/tracked`, sync, load-more |
| **Revenue & Reports** | `GET /revenue/summary`, `GET/POST/PATCH/DELETE /revenue/records`, `GET/POST /reports`, `/reports/generate`, `/reports/{id}/download`, `/reports/schedules` |
| **Notifications** | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` (role-scoped) |
| **Shared Access** | `GET /workspace/permissions`, `/overview`, `GET/POST /workspace/requests`, approve/reject/cancel/revoke/permissions, `GET /workspace/clients`, `/clients/{id}`, `/activity`, `/governance` |
| **Agency** | `GET /agency/overview`, `GET/POST/PATCH/DELETE /agency/team`, `/campaigns`, `/campaigns/{id}/creators`, `GET /agency/content`, `GET/POST /agency/reports`, `/reports/{id}/download` |
| **Admin** | `GET /admin/overview`, `GET/POST/PATCH /admin/users`, activate/deactivate, reset-password, `GET /admin/audit-logs`, `/admin/governance` |

Every `/workspace/clients/{access_id}` section is filtered server-side by the permissions the Creator currently grants.

---

## Testing

From `backend` with the virtual environment active:

```powershell
python -m pytest -q
```

The suite (95 tests) covers baseline auth/role flows, Fernet encryption, OAuth state, analytics endpoints, mocked provider sync, revenue/report/notification/scheduling, CSV downloads, credential non-exposure, administrator privacy boundaries, creator-controlled sharing, security hardening (rate limiting, session revocation, notification scoping/preferences, CSV injection), and the agency workspace (role guarding, team lifecycle, campaigns with consent-gated assignment, authorized content, report generate/download/delete with ownership checks). No live credentials or outbound API calls are required.

Frontend build:
```powershell
cd frontend
npm run build
```

---

## Security & Privacy

- **RBAC enforced on the backend** — every router declares its allowed roles via `require_roles(...)`.
- **Creator-owned data** — social tokens, analytics, and revenue are scoped to the authenticated Creator profile; collaborators never see raw metrics.
- **Consent-based access** — collaborators request access; Creators approve with granular permissions, tighten them later, or revoke instantly; enforcement is server-side.
- **Encrypted secrets** — OAuth tokens encrypted at rest with Fernet; the key must be backed up (losing it makes stored tokens unrecoverable).
- **Hardening** — login rate limiting, session rotation on password change, logout-other-sessions, login-activity audit, CSV formula-injection neutralization, role-scoped notifications with per-user preferences.
- **No fabricated metrics** — unavailable platform metrics are reported as `N/A`/`null`, never zero.

---

## Provider Support Boundary

Connector code exists for YouTube, Instagram, Facebook, X, and LinkedIn. A provider is shown as ready only when its required client credentials and the token-encryption key are configured. Code presence does **not** guarantee that a live provider app has been approved or that an account can access every metric.

Live use requires the relevant developer application, exact registered redirect URI, an eligible account, approved scopes/products, and API access. Only the YouTube public Data API was live-verified in this environment; other providers show setup-required status until valid credentials, scopes, account eligibility, and approvals are available. X fields may depend on API tier; LinkedIn member analytics requires matching granted products/scopes; Meta metrics vary by account eligibility and permissions.

---

## Project Structure

```
CreatorIQ_Dashboard/
├── backend/
│   ├── app/
│   │   ├── routers/          # auth, account, admin, agency, analytics, creators,
│   │   │                     # integrations, monetization, workspace
│   │   ├── services/         # provider services, report exports, scheduler
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── notify.py         # preference-aware notifications
│   │   └── main.py           # FastAPI app + startup migrations
│   ├── migrations/           # Alembic migrations
│   ├── tests/                # 95 tests
│   ├── .env.example
│   └── requirements*.txt
├── frontend/
│   ├── src/
│   │   ├── pages/            # role & feature pages
│   │   ├── App.jsx           # shell, routing, sidebar
│   │   ├── api.js            # axios client
│   │   └── styles.css
│   └── package.json
├── docs/                     # architecture, setup, validation notes
├── schema/                   # ER diagram, PostgreSQL DDL
├── docker-compose.yml
├── README.md
└── CHANGELOG.md
```

---

## Scope & Limitations

- Creator OAuth and integrations are available only to the `creator` role. Agencies and Marketing Teams access only creator-approved summaries through the consent workflow.
- Sync is manually triggered from **Connected accounts**; no Celery/Redis scheduled sync worker is included.
- The report scheduler is an in-process local runner; for resilient production scheduling, run the same task in a managed worker with persistent job monitoring.
- First sync stores cumulative snapshots as a baseline; daily deltas become meaningful after later syncs.
- Platform data may be delayed or unavailable per provider rules, account eligibility, scopes, or app-review status.
- Login rate limiting is a simple in-memory per-process limiter (5 failures / 10 min per IP+email). Multi-instance deployments should use a shared limiter (e.g. slowapi + Redis).
- Failed sign-ins record the client IP as supplied by the request; behind a reverse proxy without trusted forwarded-headers, this will be the proxy address.
- Production use still requires HTTPS, secure deployment secrets, database migrations, account recovery, secure session/cookie review, logging/monitoring, provider app review, data-retention/privacy controls, and a privacy policy.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing code style and naming conventions.
3. Run `python -m pytest -q` (backend) and `npm run build` (frontend) before submitting.
4. Open a pull request with a clear description of the change.

---

## License

This project is released under the MIT License. See [LICENSE](./LICENSE) for details.
