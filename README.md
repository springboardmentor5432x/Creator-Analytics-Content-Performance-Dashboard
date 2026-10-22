# CreatorIQ — Milestone 1

**Creator Analytics & Content Performance Dashboard** — project starter aligned with the supplied project brief and the mentor's first review requirements.

## What is implemented

- Registration and login screens with input validation and API error handling.
- FastAPI authentication using salted Argon2 password hashes and signed JWT access tokens.
- Protected dashboard endpoints; a missing/invalid token receives `401 Unauthorized`.
- Role-based access control for `creator`, `agency`, `marketing_team`, and `administrator`; public sign-up can create Creator, Agency, or Marketing Team accounts, while administrator accounts can only be provisioned by an existing administrator or the local demo seeder.
- Separate role-specific profile tables: `creator_profiles`, `agency_profiles`, and `marketing_team_profiles`. Agency and Marketing Team accounts are not stored as creator profiles.
- Account Settings screen for updating account name and role-specific profile/workspace details, plus password change with current-password verification.
- React dashboard with KPIs, a 7-day performance chart, platform comparison, and top-performing content.
- SQLAlchemy relational models and an ER diagram covering user/profile, social accounts, content, metrics, audience insights, revenue, notifications, and reports.
- Clearly labelled demo data so the dashboard can be demonstrated before real social API integrations are built.
- PostgreSQL is the intended primary database from the brief. Docker Compose runs PostgreSQL, FastAPI, and the React frontend together. SQLite is only the no-configuration fallback for local backend development.

## Run the complete app (recommended)

Requires **Docker Desktop** with Docker Compose enabled.

1. Extract this folder and open a terminal inside `CreatorIQ_Milestone1`.
2. Run:

   ```bash
   docker compose up --build
   ```

3. Open **http://localhost:4173**.
4. Creator demo login:

   - Email: `demo@creatoriq.dev`
   - Password: `CreatorIQ@123`

   Administrator / management demo: `admin@creatoriq.dev` / `CreatorIQAdmin@123`.
   Agency demo: `agency@creatoriq.dev` / `AgencyDemo@123`.
   Marketing Team demo: `marketing@creatoriq.dev` / `MarketingDemo@123`.

5. API docs: **http://localhost:8000/docs**.

To stop the app, press `Ctrl+C`; then run `docker compose down`. To also delete the local demo database volume and its data, run `docker compose down -v`.

> The demo secret and demo credentials are for local review only. Change them before any public deployment. Never commit production secrets to Git.

## Run without Docker (backend only)

This mode uses SQLite by default so the login flow can be tested without a local PostgreSQL installation.

**Terminal 1 — backend** (commands for Windows PowerShell):

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

For bash/macOS/Linux, activate with `source .venv/bin/activate` and copy `.env.example` to `.env` with `cp .env.example .env`.

**Terminal 2 — frontend:**

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally **http://localhost:5173**). The frontend calls `http://localhost:8000/api` in development. To use PostgreSQL locally, set `DATABASE_URL` in `backend/.env` to a valid SQLAlchemy URL such as `postgresql+psycopg://creatoriq:YOUR_PASSWORD@localhost:5432/creatoriq` and ensure that database exists.

## Local troubleshooting (Windows)

If backend startup fails with an SQLAlchemy error similar to `DLL load failed while importing _immutabledict_cy` and Windows reports that an application-control policy blocked the file, rebuild SQLAlchemy without its optional C extensions inside the active project virtual environment. This workaround does not require turning off Windows security:

```powershell
$env:DISABLE_SQLALCHEMY_CEXT = "1"
python -m pip uninstall -y SQLAlchemy
python -m pip install --no-cache-dir --no-binary=SQLAlchemy "SQLAlchemy>=2.0,<3.0"
python -c "import sqlalchemy; print(sqlalchemy.__version__)"
Remove-Item Env:DISABLE_SQLALCHEMY_CEXT
```

The environment variable is used during installation only; SQLAlchemy documents it for installation without C extensions. If port `8000` is denied by Windows, start the backend on port `9000` and create `frontend/.env.local` with `VITE_API_BASE_URL=http://localhost:9000/api`, then restart Vite.

## Authentication API

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create Creator, Agency, or Marketing Team account and profile; returns a JWT |
| `POST` | `/api/auth/login` | Public | Verify credentials and return a JWT |
| `GET` | `/api/auth/me` | JWT required | Return the signed-in user's basic details |
| `GET` | `/api/auth/permissions` | JWT required | Return role and declared permissions |
| `GET` | `/api/account/profile` | JWT required | Read current account and role-specific profile settings |
| `PATCH` | `/api/account/profile` | JWT required | Update name and role-specific profile/workspace details |
| `POST` | `/api/account/password` | JWT required | Change password after checking current password |
| `POST` | `/api/admin/users` | Administrator only | Create any of the four account roles; never returns password hashes |
| `GET` | `/api/admin/users` | Administrator only | List safe user metadata; never includes password hashes |
| `PATCH` | `/api/admin/users/{user_id}/role` | Administrator only | Assign one of the four supported roles |
| `GET` | `/api/dashboard/summary` | JWT required | KPI summary |
| `GET` | `/api/dashboard/trends?days=7` | JWT required | Daily views/engagement trend |
| `GET` | `/api/dashboard/platforms` | JWT required | Platform follower/performance comparison |
| `GET` | `/api/dashboard/top-content?limit=5` | JWT required | Top content posts by views over the selected week |
| `GET` | `/health` | Public | Health check |

Register from the UI and choose Creator, Agency, or Marketing Team. To create an Administrator or provision any account from the admin screen, sign in with the local admin demo account and open **User management**. The app stores a JWT in browser local storage for this development prototype and sends it as a bearer token. For a production system, assess secure, HttpOnly cookie-based sessions, CSRF protections, rate limiting, account recovery, email verification, and refresh-token rotation.

## Database schema

- ER diagram (PNG/SVG): `schema/creatoriq_er_diagram.png` / `schema/creatoriq_er_diagram.svg`; it includes all three role-specific profile tables.
- Editable ER diagram: `schema/creatoriq_er_diagram.mmd`
- Architecture diagram: `schema/architecture.mmd`
- Architecture/workflow plan: `docs/architecture-and-workflows.md`
- UI wireframe and dashboard workflow: `docs/ui-wireframe-plan.md`
- PostgreSQL reference DDL: `schema/postgresql_schema.sql`

The actual runtime tables are created from SQLAlchemy models in `backend/app/models.py`. For a team/production database, add Alembic migrations rather than relying on `create_all`.

## Run API tests

Install the development dependencies in the backend virtual environment, then run `pytest` from the `backend` directory:

```powershell
pip install -r requirements-dev.txt
pytest
```

The test suite uses an isolated in-memory SQLite database and covers login, role-selectable registration, token-protected routes, administrator-only account creation and role changes, role enforcement, and creator data isolation.

## Important scope boundary

The brief schedules content/audience analytics and social platform API integration for **Milestone 2 (Weeks 3–4)**. This milestone uses clearly identified seed data and does **not** claim a live connection to YouTube, Instagram, TikTok, Facebook, X, or LinkedIn. OAuth/API permissions, data collection, advanced demographic analytics, real monetization feeds, and exports remain future work. KPI values in the dashboard are sample values from the local demo database.

## Suggested mentor demo

1. Show the login page and mention that passwords are hashed server-side.
2. Sign in with the demo account; show the KPIs and interactive chart.
3. Refresh the dashboard while signed in, then log out and verify the protected view is no longer accessible.
4. Create a Creator, Agency, and Marketing Team account from public sign-up; Administrator must not be selectable there.
5. Open **Account settings**, update profile/workspace fields, and change the password using the current password.
6. Sign in as the administrator and use **User management** to create an account with any supported role and change a role.
7. Open `/docs` and show register/login, account profile/password, admin account creation, role-change, and protected dashboard endpoints.
8. Show the ER diagram and explain the `User → CreatorProfile → SocialAccount → ContentPost → ContentMetric` path plus the separate AgencyProfile and MarketingTeamProfile tables.
9. State clearly that social APIs are planned for Milestone 2 and the displayed analytics are seeded demo data.
