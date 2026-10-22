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
After sign-in, Creator accounts open the creator profile/analytics workspace; Agency accounts open the agency performance dashboard; Marketing Team accounts open campaign analytics; Admin accounts open account management. Agency and Marketing Team dashboard metrics are currently illustrative demo figures until live platform integrations are configured. Admin signup remains restricted by `ADMIN_EMAILS`.
