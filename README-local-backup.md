# CreatorIQ — Module 1: Authentication & User Management

A starter implementation with a React/Vite frontend and FastAPI + PostgreSQL backend.

## Features
- Registration for Creator, Agency, and Marketing Team
- Public registration cannot assign Administrator
- Password hashing with Argon2
- OAuth2 password-bearer login endpoint issuing JWT access tokens
- Current-user endpoint (`/api/auth/me`)
- Profile read/update APIs scoped to the authenticated user
- Account settings API
- Role-based dependency example for administrator-only endpoints
- Responsive login/register UI with client-side validation
- Swagger API docs at `/docs`

> This is a development starter, not a complete production identity platform. For production, add email verification, password reset, rate limiting, audit logs, token revocation/rotation strategy, HTTPS, secret management, and security review. The OAuth2 password flow is suitable for this local starter; for third-party sign-in (Google, etc.) implement Authorization Code flow with PKCE separately.

## Requirements
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

## 1. Create the PostgreSQL database
Using `psql` or pgAdmin, create a database:
```sql
CREATE DATABASE creatoriq;
```

## 2. Start the backend
Open a terminal in `backend/`:
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL username/password:
```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/creatoriq
JWT_SECRET_KEY=replace-this-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_ORIGINS=http://localhost:5173
```
Generate a secret, for example:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Then run:
```bash
uvicorn app.main:app --reload
```
Backend: `http://localhost:8000`; API docs: `http://localhost:8000/docs`.

Tables are created on startup for this starter. For team/production workflows, use Alembic migrations.

## 3. Start the frontend
Open a second terminal in `frontend/`:
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.

The frontend calls `http://localhost:8000/api`. If needed, change `VITE_API_BASE_URL` in `frontend/.env`.

## 4. Test with Postman
1. `POST http://localhost:8000/api/auth/register`
   Body → raw → JSON:
   ```json
   {
     "full_name": "Maya Creator",
     "email": "maya@example.com",
     "password": "ExamplePass123!",
     "role": "creator"
   }
   ```
2. `POST http://localhost:8000/api/auth/login`
   Body → x-www-form-urlencoded:
   - `username`: `maya@example.com`
   - `password`: `ExamplePass123!`
3. Copy `access_token` from response.
4. `GET http://localhost:8000/api/auth/me` with header:
   `Authorization: Bearer YOUR_ACCESS_TOKEN`
5. `GET http://localhost:8000/api/users/profile` with the same header.
6. Test invalid login, duplicate registration, missing token, and a role-restricted endpoint.

## API contract
- `POST /api/auth/register` — JSON, creates a user; returns safe user fields
- `POST /api/auth/login` — OAuth2 form fields `username` and `password`; returns `access_token`, `token_type`, and `user`
- `GET /api/auth/me` — current authenticated user
- `GET /api/users/profile` — own profile
- `PUT /api/users/profile` — update own full name and optional bio / social links
- `PUT /api/users/account` — update own display preferences
- `GET /api/admin/users` — administrator-only example endpoint

## Important security behavior
- Passwords are never returned or stored in plaintext.
- The frontend does not let users select Administrator at registration.
- Backend rejects `administrator` as a public registration role.
- Profile routes use the identity from the validated token, not a user ID from the browser.
- Hiding frontend links is not security; backend role checks are authoritative.
