# CreatorIQ — Creator Analytics Platform

**Creator Analytics & Content Performance Dashboard** — a React/Vite frontend and FastAPI/SQLAlchemy backend for creator account management, content performance analytics, audience insights, growth trends, and social account integrations.

CreatorIQ 1.0 is the complete deliverable: authentication and role workspaces, platform integrations, public creator discovery, analytics, revenue tracking, reports and schedules, notifications, and consent-based collaboration.

## What's included

- YouTube OAuth 2.0 connection, encrypted token storage, token refresh, channel/video discovery, and available YouTube Analytics reports.
- Public YouTube Creator Discovery with channel/handle resolution, uploads-playlist pagination, public channel/video metrics, user-owned tracking, and timestamped snapshots distinct from OAuth analytics.
- Instagram Login / Graph API connector for eligible professional Creator/Business accounts, media import, and provider-available Insights metrics.
- One-time hashed OAuth `state` records, redirect handlers, ownership checks, account disconnect, and encrypted access/refresh tokens.
- Content analytics, audience insights, platform-specific metric-availability indicators, and 7/30/90-day growth/trend endpoints.
- Cumulative content snapshots and daily deltas; the first cumulative fetch is a baseline, not falsely counted as that day's views.
- Automated tests for M1 role/auth flows, token encryption/storage, OAuth state, analytics endpoints, and mocked provider synchronization.
- Revenue, Reports, and Notifications are available to the signed-in Creator role in the workspace navigation.
- Revenue tracking with creator-owned income records, revenue trends, source breakdowns, inline editing, and currency-separated totals. Mixed-currency workspaces show one total per currency and never add currencies together.
- Downloadable performance, revenue, and audience reports in PDF, Excel (`.xlsx`), and CSV formats without sending data to an external service.
- A dedicated Notifications page plus a topbar notification menu, with per-item and mark-all read controls.
- In-app alerts for newly recorded revenue and finished reports, including read-state management.
- Weekly or monthly saved report schedules. The local API checks active schedules hourly while it is running; a schedule can also be run manually from the Reports page.
- Consent-based collaboration with granular, creator-controlled permissions: a Creator approves a shared-access request per permission (profile summary, content metrics, audience, growth), can tighten permissions later, and revocation takes effect immediately on the collaborator's next request.
- Agency workspace: team management with per-member workspace roles, campaign management with brand/budget/platforms and creator assignments, authorized content performance across consenting creators, and aggregate PDF/Excel/CSV reports that respect each creator's granted permissions.
- Role-scoped notifications for Creators, Agencies, and Marketing Teams, plus per-user notification preferences (security alerts always on).
- Account security: password change revokes every other session and returns a fresh token for the current device, "log out other sessions" control, and a personal login-activity audit trail.
- Brute-force protection: repeated failed sign-ins from the same address/email are temporarily rate limited with HTTP 429.
- Exported CSV files neutralize spreadsheet formula injection (`=`, `+`, `-`, `@` prefixes) in user-controlled text fields.

### Provider support boundary

This package includes connector/service code, OAuth routes, sync routes, and mocked sync tests for YouTube, Instagram, Facebook Pages, X, and LinkedIn. A provider is only shown as ready when its required client credentials and the token-encryption key are configured. Code being present does **not** guarantee that a live provider app has been approved or that an account has access to every analytics metric.

Live use still requires the relevant developer application, exact registered redirect URI, an eligible account, approved scopes/products, and API access for the account/app. The configured YouTube public Data API was exercised against live channel search, channel details, uploads, and video statistics; a temporary isolated database also verified public tracking and persisted snapshots. Owner-authorized YouTube Analytics was not exercised because no creator OAuth authorization was completed in the browser. Other provider OAuth APIs were not live-tested because their client credentials are not configured in this environment. X endpoint fields may depend on API tier; LinkedIn member analytics requires the matching granted product/scopes; Meta metrics vary by account eligibility and granted permissions. The app marks unavailable metrics as unavailable instead of fabricating values.

## Fastest local setup (Windows PowerShell)

Open a terminal in the project root (`CreatorIQ_Dashboard`) and keep all project work inside this folder.

### 1. Backend environment

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

`backend/.env.example` uses the local callback URLs and backend defaults. Set `YOUTUBE_API_KEY` to enable public YouTube channel discovery; OAuth credentials are optional until you connect a provider.

Generate a Fernet encryption key exactly once:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Open `backend/.env`, paste the generated value into `OAUTH_TOKEN_ENCRYPTION_KEY`, then save. **Keep this exact key backed up. If you change/lose the key after tokens are stored, those existing OAuth tokens cannot be decrypted. Never commit `.env` or share the key.**

### 2. Run the API

From the `backend` folder, with the virtual environment activated:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Verify `http://127.0.0.1:8001/health` returns `{"status":"ok","service":"creatoriq-api"}`. Interactive API docs are at `http://127.0.0.1:8001/docs`.

### 3. Run the frontend

Open a **second terminal** and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. The Vite development proxy sends `/api` requests to `http://127.0.0.1:8001`.

### 4. Sign in to the local demo

- Creator: `demo@creatoriq.dev` / `CreatorIQ@123`
- Administrator: `admin@creatoriq.dev` / `CreatorIQAdmin@123`
- Agency: `agency@creatoriq.dev` / `AgencyDemo@123`
- Marketing Team: `marketing@creatoriq.dev` / `MarketingDemo@123`

### Role workspaces

| Role | Available workspace pages | Privacy boundary |
|---|---|---|
| Creator | Overview, Creator discovery, Connected accounts, Content analytics, Audience insights, Growth & trends, Revenue, Reports, Notifications, Shared access, Account settings | Owns all private social connections and explicitly approves, scopes, or revokes collaborator access per permission. |
| Agency | Overview, Creator access, Campaigns, Content, Reports, Notifications, Team management, Account settings | Can request and view only the summaries and permissions a Creator approves for that specific Agency workspace; campaign assignments and reports never bypass consent. |
| Marketing Team | Overview, Creator access, Notifications, Account settings | Uses the same Creator-consent flow; it cannot see another Creator's private account credentials or raw analytics. |
| Administrator | Overview, User management, Access governance, Account settings | Manages accounts and reviews collaboration state, but cannot open private creator analytics. |

Agency and Marketing Team users open **Creator access** to send a request using a Creator's CreatorIQ email, optionally declaring which permissions they need. The Creator decides from **Shared access**, approving only the selected permissions, editing them later, or revoking entirely. Agency owners/admins manage colleagues from **Team management**; each member signs in with their own account and a scoped workspace role.

Demo accounts and JWT secrets are for local evaluation only. Do not reuse the demo passwords or secret for a public deployment. Demo data is seeded by `SEED_DEMO_DATA` (default `true` in `backend/.env.example`); set it to `false` to start with an empty database.

## Configure live social connectors

Keep the API running only after saving `backend/.env`; restart the backend after changing environment variables. In CreatorIQ, open **Connected accounts** and read each provider's setup status.

### YouTube

1. Create a project in Google Cloud Console and enable YouTube Data API v3 and YouTube Analytics API.
2. Create an OAuth client of type **Web application**.
3. Add this authorized redirect URI exactly (or set `GOOGLE_OAUTH_REDIRECT_URI` to the URI registered there):
   `http://127.0.0.1:8001/api/integrations/youtube/callback`
4. If the OAuth consent screen is in Testing, add the Google account you will use as a test user.
5. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `backend/.env` and restart the backend.
6. Connect YouTube in CreatorIQ and press **Sync** after the redirect returns.

The connector requests `youtube.readonly` and `yt-analytics.readonly`. Some Analytics reports can legitimately be absent for new, small, or ineligible channels; the application displays a warning and does not fabricate those metrics.

### Instagram

Instagram uses **Instagram API with Unified Login**, so it does **not** need a Facebook Page. The client signs in with Instagram or Facebook, selects their business portfolio and Instagram professional account, and the app receives a Business Integration System User Access Token for `graph.facebook.com`.

1. The Meta app must be **owned by a business portfolio**. Without that, the App Dashboard will not show **API setup with Unified login**.
2. Open **Instagram → API setup with Unified login** and confirm the configuration shows the **Instagram Login Compatible** label. If it does not, create one with **Create new configuration**.
3. Save this redirect URL in the configuration, exactly:
   `http://localhost:8001/api/integrations/instagram/callback`
4. The Instagram **professional** (Creator or Business) account must belong to the same business portfolio that is selected during login. Personal accounts are not supported.
5. Set `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, and `META_OAUTH_CONFIG_ID` in `backend/.env`. `META_GRAPH_API_VERSION` controls the Graph API version.
6. Restart the backend, click **Connect Instagram**, sign in, select the business portfolio and the Instagram account, then press **Sync**.

Clients who do not have a role on the app require App Review (Advanced Access) and a Live app; during local development use an account that is an app Admin, Developer, or Tester.

### Facebook Pages

1. Enable Facebook Login for the Meta app and add the redirect URI `http://localhost:8001/api/integrations/facebook/callback` to the app's valid OAuth redirect URIs.
2. Set `META_OAUTH_CLIENT_ID` and `META_OAUTH_CLIENT_SECRET` in `backend/.env`. The legacy names `FB_APP_ID` and `FB_APP_SECRET` are also accepted. Set `FACEBOOK_OAUTH_REDIRECT_URI` (or `FB_REDIRECT_URI`) only if the callback differs.
3. `FACEBOOK_OAUTH_CONFIG_ID` is optional. When present, CreatorIQ uses that Facebook Login for Business configuration. When absent, it requests `pages_show_list` and `pages_read_engagement` directly. Do **not** request `read_insights` or `pages_read_user_content`; Meta deprecated/rejects these permissions for many apps. Page post and Insights access is covered by `pages_read_engagement`.
4. During development, authorize with an app Admin/Developer/Tester account and a Facebook user who manages at least one Page.
5. Restart the backend. On **Connected accounts**, confirm Facebook shows **Ready to connect**, then connect Facebook. The callback imports all Pages the authorized person can manage and stores each Page token encrypted.
6. Press **Sync**. Facebook Page insights vary by Page permissions, app review, content type, and Graph API version. If a post Insights metric is unavailable, the sync result includes a warning.

## API endpoints

### Social integrations (signed-in Creator)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/integrations/providers` | Provider setup/implementation status; no secrets returned |
| `GET` | `/api/integrations/accounts` | Current creator's social accounts and sync status |
| `GET` | `/api/integrations/youtube/connect` | Begin Google OAuth |
| `GET` | `/api/integrations/youtube/callback` | Validate state and complete YouTube OAuth |
| `POST` | `/api/integrations/youtube/sync/{account_id}` | Sync YouTube channel/videos/eligible reports |
| `GET` | `/api/integrations/instagram/connect` | Begin Instagram OAuth |
| `GET` | `/api/integrations/instagram/callback` | Complete Instagram OAuth |
| `POST` | `/api/integrations/instagram/sync/{account_id}` | Sync authorized media and Insights |
| `GET` | `/api/integrations/facebook/connect` | Begin Facebook Login |
| `GET` | `/api/integrations/facebook/callback` | Complete Facebook Login and store managed Page tokens |
| `POST` | `/api/integrations/facebook/sync/{account_id}` | Sync Page posts and eligible insights |
| `GET` | `/api/integrations/x/connect` | Begin X OAuth 2.0 PKCE |
| `GET` | `/api/integrations/x/callback` | Complete X OAuth |
| `POST` | `/api/integrations/x/sync/{account_id}` | Sync authorized X post metrics |
| `GET` | `/api/integrations/linkedin/connect` | Begin LinkedIn OAuth |
| `GET` | `/api/integrations/linkedin/callback` | Complete LinkedIn OAuth |
| `POST` | `/api/integrations/linkedin/sync/{account_id}` | Sync available LinkedIn member analytics |
| `DELETE` | `/api/integrations/accounts/{account_id}` | Remove credentials and disconnect; historical metrics stay |

The callback endpoints are public routes by design, but each requires a matching one-time OAuth `state` stored as a hash and linked to the initiating user/provider. They do not return tokens to the browser.

### Public YouTube creator tracking (signed-in user)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/creators/youtube/search?query=NASA` | Search public channels or resolve a handle/channel URL |
| `GET` | `/api/creators/youtube/resolve?identifier=@handle` | Resolve a public handle, channel URL, or channel ID |
| `POST` | `/api/creators/youtube/tracked` | Track a selected channel and save its initial public snapshot/videos |
| `GET` | `/api/creators/youtube/tracked` | List only the signed-in user's tracked creators |
| `GET` | `/api/creators/youtube/tracked/{creator_id}` | Public counters, available public videos, and timestamped history |
| `POST` | `/api/creators/youtube/tracked/{creator_id}/sync` | Refresh current channel and recent upload snapshots |
| `POST` | `/api/creators/youtube/tracked/{creator_id}/load-more` | Continue uploads-playlist pagination when older videos remain |
| `DELETE` | `/api/creators/youtube/tracked/{creator_id}` | Untrack and delete that user's public tracking records |

Public tracking is not private creator analytics. Historical changes are between stored observations and are never assigned to a specific day. Public engagement is labelled as a likes-plus-comments proxy; watch time, reach, impressions, shares, saves, and audience demographics are unavailable in this workflow.

### Analytics (signed-in user)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/analytics/content?days=30&platform=YouTube` | Content totals, daily-period metrics, source, per-metric availability |
| `GET` | `/api/analytics/audience?platform=YouTube` | Latest audience insight record and explicit availability metadata |
| `GET` | `/api/analytics/growth?days=30&platform=YouTube` | Daily views/interactions, follower deltas where available, trend summaries |
| `GET` | `/api/analytics/hashtags?platform=YouTube` | Basic hashtag count from stored post titles only |

`days` supports 7, 30, or 90 depending on endpoint validation. All account queries are scoped to the signed-in Creator profile. A metric unavailable for an account or permission is not presented as an actual value.

### Revenue, reporting and notifications (signed-in Creator)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/revenue/summary?days=90` | Revenue totals by currency, income source, and recorded-date trend |
| `GET` / `POST` | `/api/revenue/records` | List or add creator-owned revenue records |
| `PATCH` / `DELETE` | `/api/revenue/records/{record_id}` | Correct or remove a creator-owned revenue record |
| `GET` | `/api/notifications` | In-app notifications for the signed-in role (creator revenue/report alerts, collaborator access alerts) |
| `POST` | `/api/notifications/{notification_id}/read` | Mark one notification read |
| `POST` | `/api/notifications/read-all` | Mark the signed-in user's notifications as read |
| `GET` / `POST` | `/api/reports` / `/api/reports/generate` | List saved reports or generate PDF, Excel, or CSV exports |
| `GET` | `/api/reports/{report_id}/download` | Download a creator-owned report without exposing another user's data |
| `GET` / `POST` | `/api/reports/schedules` | List or create weekly/monthly recurring report schedules |
| `PATCH` / `POST` | `/api/reports/schedules/{schedule_id}` / `/run` | Pause/resume a schedule or generate it immediately |

All revenue and report data is isolated to the authenticated Creator profile. The local scheduled-report runner checks due schedules hourly while the API process is running.

### Consent-based shared access (Creator + collaborator roles)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/workspace/permissions` | Permission catalog (labels/keys for granular sharing) |
| `GET` | `/api/workspace/overview` | Role-scoped access overview counters |
| `GET` / `POST` | `/api/workspace/requests` | List received/sent requests, or request access by CreatorIQ email |
| `POST` | `/api/workspace/requests/{access_id}/approve` | Creator approves with selected granted permissions |
| `POST` | `/api/workspace/requests/{access_id}/reject` / `cancel` | Decline a request or withdraw an own request |
| `PATCH` | `/api/workspace/requests/{access_id}/permissions` | Creator tightens or expands granted permissions |
| `POST` | `/api/workspace/requests/{access_id}/revoke` | Creator revokes access; effective immediately |
| `GET` | `/api/workspace/clients` | Collaborator view of approved creators (with `creator_profile_id`) |
| `GET` | `/api/workspace/clients/{access_id}` | Permission-gated sections of one approved creator's summary |
| `GET` | `/api/workspace/activity` | Signed-in user's access history |
| `GET` | `/api/workspace/governance` | Administrator-only collaboration state review |

Every `/api/workspace/clients/{access_id}` section is filtered server-side by the permissions the Creator currently grants; unauthorized sections are omitted, never masked client-side.

### Agency workspace (agency role)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/agency/overview` | Agency dashboard summary |
| `GET` / `POST` | `/api/agency/team` | List team members or add a colleague with a workspace role |
| `PATCH` / `DELETE` | `/api/agency/team/{member_id}` | Change a member's role/status or remove them from the agency |
| `GET` / `POST` | `/api/agency/campaigns` | List campaigns (filterable by status) or create one |
| `PATCH` / `DELETE` | `/api/agency/campaigns/{campaign_id}` | Update or delete a campaign |
| `POST` / `DELETE` | `/api/agency/campaigns/{campaign_id}/creators` | Assign or remove an approved creator on a campaign |
| `GET` | `/api/agency/content?days=30&platform=…` | Content performance across creators that granted the content permission |
| `GET` / `POST` | `/api/agency/reports` / `/api/agency/reports/generate` | List or generate aggregate PDF/Excel/CSV reports |
| `GET` / `DELETE` | `/api/agency/reports/{report_id}/download` / `/api/agency/reports/{report_id}` | Download or delete an agency report |

### Account, sessions and preferences (all roles)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` / `PATCH` | `/api/account/profile` | View or update the account and workspace profile |
| `POST` | `/api/account/password` | Change password; revokes other sessions and returns a fresh token |
| `GET` / `PATCH` | `/api/account/preferences` | Timezone, date format, and notification preferences |
| `GET` | `/api/account/login-activity` | The signed-in user's own login audit trail |
| `GET` | `/api/account/sessions` | Current session generation and last sign-in |
| `POST` | `/api/account/sessions/logout-others` | Revoke every other session for the account |

## Tests

From `backend` with the correct `.venv` active:

```powershell
python -m pytest -q
```

The test suite (95 tests) includes baseline auth/role tests, Fernet encryption tests, OAuth state tests, analytics endpoint tests, provider-sync tests using mocked provider responses, Milestone 3 revenue/report/notification/scheduling coverage, CSV download verification, credential-field non-exposure checks, administrator privacy boundaries, creator-controlled Agency/Marketing Team sharing coverage, and a security-hardening suite covering login rate limiting, session revocation on password change, notification role scoping and preferences, and CSV formula-injection neutralization. It does not require live developer credentials or make outbound API calls.

## Docker Compose (optional)

Docker Compose serves the frontend at `http://localhost:4173`, API at `http://localhost:8000`, and PostgreSQL inside Docker. Copy the root `.env.example` to root `.env` before configuring provider variables. The backend image copies `alembic.ini` and `migrations/` and runs `python -m alembic upgrade head` immediately before Uvicorn starts, so a fresh or upgraded PostgreSQL volume follows the same migration history as local development. For OAuth, use redirect URIs reachable from the browser and matching the provider settings; Docker defaults in `.env.example` use `http://localhost:8000/api/integrations/<provider>/callback`. Put the matching values in the provider console, not just in local config.

```powershell
docker compose up --build
```

Stop with `Ctrl+C`, then `docker compose down`. `docker compose down -v` deletes the local Postgres volume/data.

## Scope and limitations

- Creator OAuth and integrations are intentionally available only to the `creator` role. Agency and Marketing Team workspaces may access only creator-approved high-level summaries through the consent workflow; they cannot use a Creator's credentials or provider tokens.
- YouTube/Instagram/Facebook sync is manually triggered from Connected accounts; a Celery/Redis scheduled sync worker is not included in this package.
- The included report scheduler is an in-process local runner. For resilient production scheduling, run the same due-schedule task in a managed worker with persistent job monitoring.
- Connector code exists for YouTube, Instagram, Facebook, X, and LinkedIn. Only YouTube public Data API requests were live-verified in this environment; the other providers show setup-required status until valid credentials, scopes, account eligibility, and approvals are available.
- First sync stores cumulative snapshots as a baseline. Daily deltas become meaningful after later syncs; the code does not claim the first lifetime counter is today's activity.
- Platform data may be delayed or unavailable according to the provider's rules, account eligibility, scopes, or app-review status. “Live” means synced from a provider API; it does not mean a continuous streaming feed.
- Login rate limiting is a simple in-memory per-process limiter (5 failed attempts per IP+email per 10 minutes). It is effective for a single-instance local deployment; a multi-instance production deployment should use a shared/distributed limiter (for example `slowapi` backed by Redis).
- Failed sign-ins and audit events record the client IP as supplied by the request; behind a reverse proxy without a trusted forwarded-headers setup this will be the proxy address.
- Production use still requires HTTPS, secure deployment secrets, database migrations, account recovery, secure session/cookie review, logging/monitoring, provider app review, data-retention/privacy controls, and a privacy policy.

## Architecture/schema references

- SQLAlchemy runtime models: `backend/app/models.py`
- M1 architecture: `docs/architecture-and-workflows.md`
- M2 setup/integration guide: `docs/MILESTONE2_SETUP.md`
- M3 revenue and reporting guide: `docs/MILESTONE3_GUIDE.md`
- Provider connection guide: `docs/PLATFORM_CONNECTION_GUIDE.md`
- Local validation record: `docs/VALIDATION_NOTES.md`
- UI wireframe plan: `docs/ui-wireframe-plan.md`
- ER diagram: `schema/creatoriq_er_diagram.png`, `.svg`, `.mmd`
- PostgreSQL reference DDL: `schema/postgresql_schema.sql`

The public creator tables, report windows, and workspace-access fields use additive Alembic migrations. The backend now runs `alembic upgrade head` automatically during startup (after `create_all`) so an existing database is upgraded before the API and report scheduler use it. You can still run `python -m alembic upgrade head` manually from `backend`. Migrations never drop or recreate existing data.

Content, audience, and growth analytics default to connected live accounts only. Demo seed data is available only after selecting **Demo sample data** in the analytics UI (or passing `mode=demo` to the analytics API). Historical points without an observed metric are returned as `null` and rendered as gaps rather than zero activity.
