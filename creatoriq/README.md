# CreatorIQ — Creator Analytics & Content Performance Dashboard

## Project Overview

CreatorIQ is a creator analytics dashboard project designed for
creators, agencies, and marketing teams.

This project is being developed incrementally, beginning with
the User Management Module.

## Technology Stack

### Phase 1 — Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Phase 2 — Planned Backend
- Node.js
- Express
- PostgreSQL
- Prisma ORM
- Argon2id or bcrypt
- JWT and secure session/token management
- Google OAuth 2.0 / OpenID Connect

## Folder Structure

```text
creatoriq/
├── frontend/
│   ├── home.html
│   ├── dashboard.html
│   ├── analyzer.html
│   ├── index.html
│   ├── signup.html
│   ├── forgot-password.html
│   ├── profile.html
│   ├── css/style.css
│   ├── js/auth.js
│   ├── js/signup.js
│   ├── js/dashboard.js
│   ├── js/analyzer.js
│   ├── js/forgot-password.js
│   ├── js/profile.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── test-api.js
│   └── data/
├── .gitignore
├── .env.example
└── README.md
```

## Run the Application

### Option 1: Local backend + frontend

1. Open a terminal in the `creatoriq/backend` folder.
2. Run `npm install` if dependencies are not installed.
3. Start the API with `npm start`.
4. Open `http://localhost:3000/` in your browser.
5. Use the demo credentials below or create a new account.

### Demo login

- Email: `sample@example.com`
- Password: `Password123!`

### Option 2: Static preview

1. Open the `creatoriq` folder in VS Code.
2. Install the Live Server extension.
3. Open `frontend/index.html`.
4. Right-click and choose Open with Live Server.

## Phase 2 Features Included

- Secure password hashing with `bcryptjs`
- JWT-based authentication for login, protected profile/dashboard access, and server-side logout revocation
- Signup flow with validation and stored user accounts
- Password reset request endpoint with safe generic messaging
- Profile fetch and update API with password change support
- Frontend pages connected to the backend API

## Security

Frontend validation improves usability, but the backend enforces
validation and authorization rules for real account operations.

Administrator privileges must never be granted based solely on
a role submitted by a public registration form.

### Create the first administrator

Set a strong, temporary `ADMIN_SETUP_KEY` in the backend environment and
restart the API. Submit the first administrator details to
`POST /api/auth/bootstrap-admin` with the key in the
`x-admin-setup-key` header. The endpoint is disabled when the key is unset
and refuses setup after an administrator exists. Keep the key private and
remove it from the environment after setup. Existing administrators can
create additional administrator accounts from the Administration section
of the dashboard.

Public signup supports creator, agency, and marketing roles only.

## Development Status

- [x] Login page
- [x] Shared design system
- [x] Registration page
- [x] Forgot Password page
- [x] Profile page
- [x] Landing page and analytics dashboard
- [x] Dashboard analyzer workflows
- [x] Backend authentication flow
- [x] Protected profile API
- [x] Auth flow updated for sign-up redirect and dashboard login redirect
