# CreatorIQ — Mentor Review Notes (Milestone 1)

## What to demonstrate

1. Open `http://localhost:4173` (Docker) or the Vite URL shown in Terminal 2 (usually `http://localhost:5173`).
2. Sign in with the creator demo account below and show the KPI cards, seven-day performance trend, platform comparison, and top content.
3. Log out, then try the dashboard API without an Authorization token. It should return `401 Unauthorized`.
4. Create accounts using public sign-up for Creator, Agency, and Marketing Team. Then open `http://localhost:8000/docs` and demonstrate `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/permissions`, `/api/admin/users` (POST and GET), `/api/admin/users/{user_id}/role`, and the protected dashboard APIs.
5. In Swagger, log in as the creator and call `GET /api/admin/users`; it should return `403 Forbidden`.
6. Log in as the administrator and open the **User management** screen. Create an account with a chosen role, inspect registered accounts, and change a role. The API should return safe account metadata without password hashes.
7. Show `schema/creatoriq_er_diagram.png` and `docs/architecture-and-workflows.md` for database design, architecture, and workflow planning.
8. Run the backend test suite using the commands in `README.md`.

## Local-only demo accounts

Use these accounts to demonstrate that the role is stored on the user and displayed in the workspace. These are local-only demo credentials; change or remove them before any public deployment.

- Creator: `demo@creatoriq.dev` / `CreatorIQ@123`
- Administrator: `admin@creatoriq.dev` / `CreatorIQAdmin@123`
- Agency: `agency@creatoriq.dev` / `AgencyDemo@123`
- Marketing Team: `marketing@creatoriq.dev` / `MarketingDemo@123`

These are review-only credentials and must be changed before deployment.

## Honest scope statement

Milestone 1 demonstrates authentication, role enforcement, creator dashboard UI, analytics visualizations, database models, architecture/workflow planning, and automated API tests. The dashboard uses seeded sample data. Live social-media sign-in/API syncing, advanced audience analytics, notifications, exports, and reporting workflows are later milestones, not implemented live in this prototype.


## Role-based account flow update (22 October 2026)

- Public registration allows Creator, Agency, or Marketing Team. Administrator is intentionally not an option on public signup.
- Each public account role is stored in its own corresponding profile table: `creator_profiles`, `agency_profiles`, or `marketing_team_profiles`.
- Administrator-only User Management supports account creation, safe account listing, and role assignment.
- Account Settings supports full-name/profile updates and password change after validating the current password.
- Backend API tests: 23 passed in the temporary test environment. Frontend JSX syntax transpilation passed with zero diagnostics. The full Vite production build was not verified here because Vite dependencies are not installed and package downloads are unavailable.
- This is the Milestone 1 account/profile foundation. Full multi-client agency workflows and live social platform integrations remain outside the currently verified scope.
