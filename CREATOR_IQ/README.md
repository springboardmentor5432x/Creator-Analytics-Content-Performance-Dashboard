# CREATOR IQ — React + FastAPI

CreatorIQ is a creator content-intelligence starter project. The existing Vite + React + Tailwind sign-in screen now calls a FastAPI backend, and successful sign-in opens a creator workspace with a profile form and dashboard shell.

## What's included
- React/Vite frontend with responsive sign-up and sign-in
- FastAPI REST backend
- SQLAlchemy database models for users and creator profiles
- Password hashing and JWT-protected routes
- Creator profile create/update (handle, display name, niche, bio, country, website)
- Admin account option with email allow-list protection and a user-management console
- Separate role-based workspaces for Creator, Agency, Marketing Team, and Admin
- Agency dashboard with creator overview, performance trends, platform distribution, search, and CSV-report action
- Marketing Team dashboard with campaign performance, budget/reach overview, campaign search, and report action
- Admin account management with role counts and account listing
- Dashboard API and UI placeholders for future real social analytics
- SQLite default for quick local setup; optional PostgreSQL via `DATABASE_URL`
- Interactive API documentation at `/docs`

## Troubleshooting sign-up
- Start the **backend first** and keep it running; sign-up shows "Cannot reach the server" if it is not.
- Delete any old `node_modules` folder and `package-lock.json`, then run `npm install` fresh.
- Test the API at http://127.0.0.1:8000/docs (try `POST /api/auth/register`).

## 1. Start the backend (Windows PowerShell)
```powershell
cd CREATOR_IQ\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
The first run creates `creator_iq.db` automatically in the backend folder. Backend URL: `http://127.0.0.1:8000`; API docs: `http://127.0.0.1:8000/docs`.

If PowerShell blocks activation, run the venv Python directly instead:
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

## 2. Start the frontend in another terminal
```powershell
cd CREATOR_IQ
npm install
npm run dev
```
Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Admin role setup
Set `ADMIN_EMAILS` in `backend/.env` to the comma-separated email addresses allowed to register as administrators, for example:
```env
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```
Only allow-listed addresses can register with the Admin role. Regular accounts cannot access `/api/admin/users`; the backend checks the signed-in user's role.

## 3. Optional PostgreSQL setup
First run `pip install -r requirements-postgres.txt` inside the backend folder.
Create a database named `creator_iq`, then set `DATABASE_URL` before starting the backend:
```powershell
$env:DATABASE_URL="postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/creator_iq"
$env:SECRET_KEY="replace-this-with-a-long-random-secret"
uvicorn main:app --reload
```
The database tables are created automatically on startup. For real deployment, set a strong secret and configure CORS to your frontend domain.

## API endpoints
- `POST /api/auth/register` — register an account
- `POST /api/auth/login` — sign in and receive a bearer token
- `GET /api/auth/me` — current authenticated user
- `GET /api/creator/profile` — fetch creator profile
- `PUT /api/creator/profile` — create/update creator profile
- `GET /api/creator/dashboard` — creator dashboard metrics response
- `GET /api/admin/users` — administrator-only account list
- `GET /api/health` — health check

## Important scope note
The profile and authentication are connected to the database. Social account OAuth, actual platform metrics, scheduled syncing, and ML forecasting are not implemented in this starter, so the dashboard labels these as placeholders rather than presenting sample values as real analytics. SQLite is the default so you can run the project without installing PostgreSQL; PostgreSQL can be enabled with `DATABASE_URL`.


## Role-specific dashboards
Creator accounts open the creator workspace, Agency accounts the agency dashboard, Marketing Team accounts the campaign dashboard, and Admin accounts account management. Every sidebar item in the Agency and Marketing dashboards now has its own content.

## Live social data (real-time)
The backend fetches real numbers from the platform APIs and the dashboards poll it every 60 seconds (server-side cache: `SOCIAL_CACHE_SECONDS`, default 300, to protect API quota).

Add keys to `backend/.env`, then restart the backend:
```env
YOUTUBE_API_KEY=...            # Google Cloud Console > enable "YouTube Data API v3" > Credentials > API key
INSTAGRAM_ACCESS_TOKEN=...     # Instagram Graph API token (Business/Creator account linked to a Facebook Page)
INSTAGRAM_USER_ID=...          # your Instagram Business account ID
```
Then in the app: Creator > Overview, Agency > Creators, or Marketing > Settings, use **Connect** to add a YouTube `@handle`/channel ID or an Instagram business/creator username. Accounts are verified against the real API before they are saved.

Notes: Instagram only exposes public stats for Business/Creator accounts (no lifetime views). TikTok and Facebook need app review and are not included. Campaigns are entered by you (they are not pulled from an ads API).

New endpoints: `GET /api/social/live`, `POST /api/social/accounts`, `DELETE /api/social/accounts/{id}`, and `GET/POST/PUT/DELETE /api/campaigns` (Agency and Marketing Team only).

## Python version
Backend tested on **Python 3.14** (works on 3.11-3.14). Dependencies were trimmed to packages that ship prebuilt wheels for 3.14 on Windows/macOS/Linux, so no compiler is needed:
`uvicorn[standard]` -> `uvicorn`, and the unmaintained `python-jose` -> `PyJWT`. If you upgraded Python, recreate the virtual environment:
```powershell
cd backend
Remove-Item -Recurse -Force .venv
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

## What changed in v2
- Agency and Marketing Team now have **different dashboards** (own KPIs, charts, tables), each sidebar item has its own page.
- Campaigns update instantly everywhere; edit **spent / revenue / status** inline. ROI, revenue and spend KPIs are computed from them. Existing databases are migrated automatically on startup.
- Charts use real data only: follower growth is recorded as snapshots (one every ~10 min while a dashboard is open); post charts use the latest posts from YouTube/Instagram. No fake numbers: with no API keys the dashboards show a clear "Live data is not connected" banner.
- Reach for real data: put `YOUTUBE_API_KEY` in `backend/.env`, restart the backend, then use **Connect** to add channels.

## What changed in v3.1 — Marketing Team & Creator dashboards
**Agency is unchanged.** Marketing Team and Creator now have their own dynamic dashboards (`src/MarketingDashboard.jsx`, `src/CreatorWorkspace.jsx`).

**Marketing Team** (campaign-centric, reacts instantly to every edit)
- Overview: KPIs, **campaign pipeline** (Planning → Running → Completed, one-click moves), **budget pacing** (spend vs time elapsed with On track / Spending fast / Over budget flags), **Needs attention** alerts (ending soon, over budget, starting soon, missing revenue), channel mix, ROI ranking, latest brand posts.
- Quick-launch form, plus an optional **Load sample campaigns** button (clearly labelled `[Sample]`, removable in one click) so an empty workspace is not a wall of zeros.
- Campaigns: status chips, platform filter, search, sorting, inline editing of budget / spent / revenue / status.
- Content Calendar: real month grid (prev / next / today) with campaign start/end dates and published posts; click a day for details.
- Performance: ROI by campaign, platform efficiency table, brand engagement, top posts. Reports: choose scope, export CSV.

**Creator** (no more hardcoded demo numbers)
- Every number comes from connected YouTube / Instagram accounts. Time-of-day greeting; **7 / 30 / 90-day period** filters posts and follower snapshots.
- Overview: live KPIs, follower growth from recorded snapshots, per-post chart (Views / Likes / Comments / Engagement %), generated insights (best post, avg interactions, posting cadence, best platform), top posts.
- Content Analytics (sortable post table), Audience (growth + followers by account), Accounts (connect/remove), Profile (with completeness bar), Reports (real CSV: accounts, posts, snapshots).
- Audience demographics are intentionally not shown: public APIs do not expose them without OAuth, and fake numbers were removed.

Backend: `SNAPSHOT_MINUTES` (default 5) sets how often follower snapshots are recorded; the growth line appears after two snapshots.

## What changed in v3.2 — dynamic Admin + every role
- **Instagram token is configured** in `backend/.env`. `INSTAGRAM_USER_ID` can stay blank: the backend auto-detects the numeric Business account ID (and username) from the token. A username there (e.g. `va._.va_voom`) is also resolved. Dashboards show a one-click **Connect @username** button.
- **Admin console is fully live** (`src/AdminDashboard.jsx`, auto-refresh every 30s): sign-up trend, accounts by role, followers by platform, change role / activate / deactivate / delete users (with safeguards: you cannot lock yourself out or remove the last admin), CSV export, per-role analytics (accounts, social, campaigns, budget), all social accounts across users, and real health checks (DB, YouTube, Instagram, secret key).
- **Roles are dynamic**: defined once in `backend/main.py` (`ROLES`), served by `GET /api/meta/roles`, used by sign-up, admin and routing (`DASHBOARDS` map in `src/App.jsx`). Add a role there and it appears everywhere.
- Deactivated accounts can no longer sign in. `/api/creator/dashboard` now returns real numbers.
- New endpoints: `GET /api/admin/stats|social|health`, `PATCH|DELETE /api/admin/users/{id}`, `GET /api/meta/roles`.

**Instagram tokens expire.** A normal Facebook user token lasts ~1–2 hours; exchange it for a long-lived (~60 day) token via the Graph API `oauth/access_token?grant_type=fb_exchange_token` call, then paste it into `backend/.env`.
