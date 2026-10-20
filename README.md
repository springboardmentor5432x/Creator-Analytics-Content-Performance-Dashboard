# Content Intelligence Platform for Social Media Performance and Creator Growth Analytics

React + Vite frontend prototype with role-based authentication and dashboard views.

## Roles
- **Creator:** content performance, audience growth, social accounts, and revenue overview.
- **Agency:** managed creators, campaigns, portfolio analytics, and revenue.
- **Marketing Team:** campaign reach, engagement, conversions, spend, and ROI.
- **Admin:** user/role overview, platform monitoring, and activity logs.

## Run locally
1. Install Node.js (LTS).
2. Open this project folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev` and open the URL Vite prints (usually `http://localhost:5173`).

## Prototype authentication flow
1. Select **Sign up**.
2. Enter full name, role, email, password, and confirm password.
3. On successful registration, the form returns to the login page.
4. Log in using the same email and password. The account's saved role selects the corresponding dashboard.
5. **Remember me** stores the signed-in session in local storage; when unchecked, the session is stored in session storage and ends when the browser tab/session is closed.

Accounts and sessions are stored in the browser for demonstration. Passwords are SHA-256 hashed client-side, but this is **not production authentication**: production must use a Python backend (Flask/FastAPI), server-side password hashing such as Argon2/bcrypt, secure HTTP-only cookies, and PostgreSQL. Do not use client-side role values as an authorization boundary.

## Data
All dashboard metrics are static demonstration data. `schema.sql` contains the PostgreSQL database schema; the React app is not yet connected to PostgreSQL or a backend API.
