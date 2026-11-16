# CreatorIQ — Creator Analytics & Content Performance Dashboard

React + Vite + Tailwind frontend, FastAPI + SQLAlchemy backend, JWT auth. SQLite by default (zero setup), PostgreSQL supported via `DATABASE_URL`.

## Run locally (VS Code)

Open the `creatoriq` folder in VS Code and use **two terminals** (Terminal → New Terminal).

**Terminal 1 — backend** (needs Python 3.10+)
```bash
cd backend
python -m venv venv
# Windows:  venv\Scripts\activate        macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env   -> then edit SECRET_KEY (see file)
python -m app.seed          # optional: creates demo accounts + DEMO DATA
uvicorn app.main:app --reload --port 8000
```
**Terminal 2 — frontend** (needs Node 18+)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000 · Swagger UI: http://localhost:8000/docs

Demo logins (after `python -m app.seed`; password = `DEMO_PASSWORD` in your `.env`):
`creator@creatoriq.demo`, `agency@creatoriq.demo`, `marketing@creatoriq.demo`, `admin@creatoriq.demo`.
Or just register a new account and click **Load demo data**.

## Using PostgreSQL
Create a database, then in `backend/.env` set
`DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/creatoriq` and restart. Tables are created automatically.

## Deployment & Staging
- **Staging Deployment Guide**: [docs/staging_deployment_guide.md](file:///c:/Users/eroth/Downloads/creatoriq%20(1)/docs/staging_deployment_guide.md)
- **Database Migration Guide**: [docs/database_migration_guide.md](file:///c:/Users/eroth/Downloads/creatoriq%20(1)/docs/database_migration_guide.md)
- **Docker Compose Staging**:
  ```bash
  docker compose -f docker-compose.staging.yml --env-file .env.staging up --build -d
  ```

## Tests
```bash
cd backend && python -m pytest tests/test_api.py -v   # 50 backend tests passing
cd frontend && npm run build                          # production frontend bundle
```

## Engagement rate
`(Likes + Comments + Shares + Saves) / Reach × 100`, and `0` when reach is 0.

## Mentor demo flow (~5 min)
1. **Register** a new Creator → show validation messages (bad email, weak password) → success lands on Dashboard.
2. Dashboard is empty → click **Load demo data**. Point out the **DEMO DATA** banner/badges. Change the date filter.
3. **Content Analytics**: platform + date filters, sort a column, paginate, top posts, charts. **Add** a post (reach 0 → rate 0%), **edit** it, **delete** it.
4. **Audience Analytics**: summary cards, growth trend analysis text, follower chart, age/gender/geo, active hours, platform comparison.
5. **Social Connections**: all six show "NOT CONNECTED" with what a real OAuth setup requires; "demo mode" is clearly labelled.
6. **Profile**: edit name/bio, change password. **Log out**, then open `/dashboard` directly → redirected to login.
7. **RBAC**: log in as `admin@creatoriq.demo` → Settings shows User management; the creator account gets 403 on `/api/admin/users` (try in Swagger).
8. Open **/docs** → Authorize → call endpoints.

## Architecture Notes
- **Database Migrations**: Version-controlled Alembic migrations manage schema lifecycle across SQLite development and PostgreSQL staging/production (`alembic upgrade head`).
- **OAuth & Replay Protection**: Meta Graph API v26.0 and YouTube Data API v3 integrations with persistent, atomic, multi-worker replay protection.
- **Campaign ROI & Exports**: Authoritative Decimal arithmetic for campaign ROI, ROAS, CPM, CPE, and multi-format exports (CSV, Excel `.xlsx`, PDF).
- **Role-Based Access Control (RBAC)**: Strict role separation across Administrator, Agency, Marketing Team, and Creator accounts.
