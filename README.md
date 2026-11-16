# CreatorIQ – Module 1: User Management

Register, login, role-based dashboards, creator and agency profiles, account settings, admin user management.

**Stack:** FastAPI, SQLAlchemy, Pydantic, Alembic, JWT (OAuth2 password flow), PostgreSQL, React (Vite), Recharts.

```
backend/    FastAPI app, Alembic migrations, pytest tests
frontend/   React app
database/   schema.sql  (full project schema, all 13 tables)
docs/       DATABASE_SCHEMA.md, schema_diagram.png/.svg, API.md
postman/    Postman collection (51 requests with tests)
```

## 1. Database
Create an empty PostgreSQL database:
```sql
CREATE DATABASE creatoriq;
```

## 2. Run the backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # then set DATABASE_URL, SECRET_KEY, and optional YOUTUBE_API_KEY
alembic upgrade head           # creates the tables
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

If `DATABASE_URL` is missing it uses a local SQLite file, which is fine for a quick try.

### YouTube Data API v3 (Live Sync)
To fetch live YouTube channel metrics, add your Google API key in `backend/.env`:
```bash
YOUTUBE_API_KEY=your_google_api_key_here
```
In the Creator Dashboard, clicking **Sync YouTube** with a handle (e.g. `@chaiaurcode`) directly fetches live subscriber count, views, and recent videos. If left blank, high-fidelity demo fallback ensures evaluation remains 100% functional without quota dependencies.

## 3. Run the frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
Open http://localhost:5173

## Demo logins
Created automatically on first start. Password for all: `Demo@1234`

| Role | Email |
|---|---|
| Creator | creator@creatoriq.com |
| Agency | agency@creatoriq.com |
| Marketing Team | marketing@creatoriq.com |
| Administrator | admin@creatoriq.com |

Set `SEED_DEMO_USERS=false` in `.env` for any real deployment.

## What each role sees
| Role | Dashboard | Other pages |
|---|---|---|
| Creator | KPIs, follower growth, content performance, top posts, audience, revenue | My Profile, Settings |
| Agency | KPIs, overall performance, platform distribution, creators overview | Agency Profile (with linked creators), Settings |
| Marketing Team | KPIs, campaign performance, top campaigns, recent campaigns, content mix, audience insights | Settings |
| Administrator | live user counts, recent users, plus sample growth, usage and activity | User Management, Settings |

Creator dashboard displays live channel and video analytics when synced with `YOUTUBE_API_KEY` (or high-fidelity demo data if no key is provided). Administrator's user counts and recent users come directly from the PostgreSQL database. Menu items for later modules open a "coming soon" page.

## Tests
**Automated (pytest, 28 tests):**
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```
**Postman:** import `postman/CreatorIQ_Module1.postman_collection.json`, start the backend, and run the collection with the Collection Runner (top to bottom). It covers: valid and duplicate registration, invalid input, valid and invalid login, no token, wrong role, updating your own profile, accessing another user's profile, account settings.

## Docs
- `docs/API.md` – endpoints, auth flow, status codes, examples
- `docs/DATABASE_SCHEMA.md` – ER diagram, tables, design decisions, open questions for the mentor
- `docs/schema_diagram.png` – schema image in the style of the mentor's reference
- `database/schema.sql` – SQL for all 13 tables (Module 1 builds 4 of them through Alembic)
