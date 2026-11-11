# Changelog

All notable changes to CreatorIQ are documented here. The project does not yet use semantic release tags; entries are grouped by deliverable milestone.

## [Unreleased] — delivery hardening pass

### Added
- **Agency workspace pages (frontend):** Team management, Campaigns, Content, and Reports, wired to the existing agency API with sortable/searchable tables, status filters, confirm dialogs, and inline error banners.
- **Granular shared-access permissions (frontend):** Creators now choose exactly which summaries (profile, content, audience, growth) a collaborator receives when approving, and can tighten or expand permissions for an approved connection. Approval and permission edits show the current selection and a confirm step; approved rows show last-accessed time and view count.
- **Role-agnostic Notifications page:** one page component serves Creator, Agency, and Marketing Team roles with deep links to the relevant workspace section.
- **Account settings expansion:** notification preferences (timezone, date format, per-category in-app alerts), login-activity table, session-generation summary, and a "log out other sessions" control.
- **Security hardening (backend):** new `app/notify.py` preference-aware notification helper; login rate limiting (5 failed attempts per IP+email per 10 minutes → HTTP 429); password change rotates the session token version, revoking all other sessions and returning a fresh token; CSV formula-injection neutralization in report exports; role-scoped `/api/notifications` for Creator, Agency, and Marketing Team with per-user preferences.
- **New test coverage:** `backend/tests/test_hardening.py` (login rate limiting, session revocation, notification scoping/preferences, CSV injection) and `backend/tests/test_agency_workspace.py` (role guarding, team lifecycle, campaigns with consent-gated assignment, authorized content, report generate/download/delete with ownership checks).
- `creator_profile_id` added to `/api/workspace/clients` so campaign assignment can target approved creators.
- `CHANGELOG.md` and this repository-cleanup pass (removed milestone zip, review notes, scratch logs, and stale database files).

### Changed
- Sidebar navigation regrouped into Workspace / Team / Account captions; Agency sidebar now lists Campaigns, Content, Reports, Notifications, and Team management; Admin keeps Overview, User management, and Access governance.
- Content analytics table is sortable and searchable.
- README rewritten to document the agency workspace, granular permissions, account/session endpoints, hardening behavior, and accurate limitations.

### Fixed
- Environment-dependent connector test failed when `x_client_id`/`x_client_secret` were set locally; the test now clears them.
- Replaced a dead `trycloudflare.com` default redirect URL in backend config with the local callback URL.
- The Facebook OAuth redirect default pointed at a nonexistent `localhost:8000/api/v1/...` route; it now matches the real callback (`localhost:8001/api/integrations/facebook/callback`), and the Instagram redirect default was aligned with the URL the README instructs users to register (exact-match requirement).
- Removed the unused `META_OAUTH_REDIRECT_URI` setting and documented all Instagram unified-login variables in `backend/.env.example`.
- Removed hardcoded localhost URLs from the integrations page UI.

## Milestone 3 — Revenue, reporting, collaboration

- Creator-owned revenue tracking with trends, source breakdowns, inline editing, and currency-separated totals (mixed currencies are never summed).
- PDF/Excel/CSV report generation and downloads without external services; weekly/monthly saved schedules with an in-process hourly runner.
- Consent-based collaboration between Creators and Agency/Marketing Team workspaces with server-side permission gating and revocation.
- In-app notifications and a topbar notification menu with read-state management.

## Milestone 2 — Integrations and discovery

- OAuth 2.0 connectors for YouTube, Instagram (Unified Login), Facebook Pages, X (PKCE), and LinkedIn with hashed one-time `state`, encrypted token storage, and manual sync.
- Public YouTube Creator Discovery with tracking and timestamped snapshots distinct from OAuth analytics.
- Content, audience, and growth analytics with per-metric availability metadata; unavailable metrics are shown as N/A, never fabricated.

## Milestone 1 — Foundation

- FastAPI/SQLAlchemy backend with JWT auth, role-based access control (Creator, Agency, Marketing Team, Administrator), Fernet token encryption, Alembic migrations, and a React/Vite workspace shell with audit logging and admin user management.
