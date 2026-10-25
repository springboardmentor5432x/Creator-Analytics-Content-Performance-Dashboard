# Content Intelligence Platform for Social Media Performance and Creator Growth Analytics

CreatorHub is a React + FastAPI project for the Infosys Springboard Python Developer internship. It starts with YouTube as the first live social platform and intentionally displays unavailable states rather than inventing analytics.

## Included
- React + Vite role-based UI: Creator, Agency, Marketing Team, Admin.
- FastAPI authentication endpoints with Argon2 password hashing and signed bearer tokens.
- PostgreSQL persistence via SQLAlchemy (SQLite is used only as a local fallback if `DATABASE_URL` is omitted).
- Google/YouTube OAuth authorization with state validation and token refresh.
- YouTube channel/video statistics, cached post records, daily YouTube Analytics rows when the provider grants access, audience snapshots, and a post-comparison API.
- API error states and missing-data handling; audience demographics/reach are not fabricated when YouTube does not expose them.
- Frontend loading, refresh, and disconnected states; no sample metrics are used as live results.

## 1. Backend setup
Use Python 3.11+ recommended.

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
copy .env.example .env   # Windows; use cp .env.example .env on macOS/Linux
```

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL database, for example:
`postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/content_intelligence`

Create the database first in PostgreSQL:
```sql
CREATE DATABASE content_intelligence;
```

Set `JWT_SECRET_KEY` to a long random secret before using this beyond local development. Tables are created automatically at startup. `schema.sql` is also included as a reference schema.

Run the API from the `backend` directory:
```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```
API health: `http://127.0.0.1:8000/api/health`; interactive API docs: `http://127.0.0.1:8000/docs`.

## 2. Configure YouTube OAuth
1. Create/select a project in Google Cloud Console.
2. Enable **YouTube Data API v3** and **YouTube Analytics API**.
3. Configure the OAuth consent screen and create an OAuth client of type **Web application**.
4. Add `http://127.0.0.1:8000/api/oauth/youtube/callback` as an authorized redirect URI.
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`. Ensure `GOOGLE_REDIRECT_URI` matches the authorized URI exactly.
6. Add your test account to the OAuth consent screen's test users if the app is in testing mode.

The YouTube connection button requires a signed-in user. The callback stores OAuth tokens on the backend and links the authorized channel to that user's creator record. Never place provider secrets in React environment variables or commit `.env`.

## 3. Frontend setup
In a second terminal from the project root:
```bash
npm install
npm run dev
```
The frontend defaults to `http://127.0.0.1:8000` for the API. To override it, create a root `.env` with `VITE_API_BASE_URL=http://127.0.0.1:8000` and restart Vite.

## 4. Milestone 2 API endpoints
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/forgot-password` (development-only reset flow; replace with expiring emailed reset links before production)
- `GET /api/oauth/youtube/start`, `GET /api/oauth/youtube/callback`
- `GET /api/social-accounts`
- `GET /api/analytics/overview`
- `GET /api/analytics/audience`
- `GET /api/analytics/compare?ids=1,2` (two to ten post IDs belonging to the authenticated creator)

All analytics endpoints require `Authorization: Bearer <access_token>`. Creator analytics are scoped through the authenticated user's creator record; tokens are not returned to the frontend.

## Important data limitations
- YouTube's public Data API provides channel subscriber/view/video totals and per-video view/like/comment counts where visible. Some channels hide subscriber counts and some videos disable public metrics.
- YouTube Analytics data depends on OAuth scopes, channel ownership, and Google API access. If a report is unavailable, the dashboard does not invent values.
- YouTube does not provide the audience age/gender/location fields used by this app through the current integration; those remain unavailable.
- Reach is not a general YouTube Data API field, and video shares may be unavailable depending on report access. These are shown as unavailable rather than inferred.
- Historical follower growth requires snapshots collected over time. On the first successful sync, the project can only record the current subscriber count; more history accumulates as it is refreshed.
- Instagram, TikTok, and LinkedIn are displayed as future integrations; their OAuth integrations are not implemented in this milestone.
- Agency, marketing, and admin dashboards are role-specific workspaces, but their organization/campaign totals require those modules' own persisted records and are not represented as real data yet.

## Production hardening still required
Use HTTPS, a strong secret manager, encrypted-at-rest OAuth tokens, rate limiting, audit logs, a verified email/password-reset workflow, database migrations (Alembic), and appropriate role/organization authorization before public deployment. The current forgot-password route is intentionally a local development shortcut and must not be exposed as-is to the internet.

## Milestone 2 workspace pages and provider status

The workspace now has separate page layouts for Audience, Analytics, Content Library, Revenue, Reports, Saved Reports, Notifications, My Profile, Social Accounts, and Settings. These pages no longer reuse one generic placeholder view. Audience/content/analytics/report export pages request the authenticated API and show empty/error states when the API has no authorized records.

- Revenue currently supports manually entered income/brand-deal records saved in browser local storage per signed-in user. This is a UI workflow, not automatic platform payout ingestion or PostgreSQL persistence yet.
- Profile preferences, workspace settings, and saved report names are stored locally in this version.
- YouTube has the implemented OAuth callback/data-fetch path. Configure Google OAuth credentials before connecting.
- Instagram, TikTok, and LinkedIn are listed as separate providers, but their complete OAuth callback + provider data adapters are not implemented in this version. Their Connect buttons return an explicit setup-required API error instead of pretending an account is connected. You will need provider developer apps, approved scopes, and implementation of each provider's OAuth/data endpoints before those accounts can connect for real.
- The backend CORS config permits both `http://localhost:5173` and `http://127.0.0.1:5173` in development. Keep secrets in `backend/.env`; never commit that file.
