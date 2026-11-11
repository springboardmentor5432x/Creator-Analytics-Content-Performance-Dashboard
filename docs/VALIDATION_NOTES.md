# Milestone 3 validation notes

Validated locally on 2026-11-05 with the project virtual environment and Node tooling:

- Backend migrations: `cd backend; python -m alembic upgrade head` completed at the current head. The Docker image now copies `alembic.ini` and `migrations/` and runs the same command before starting Uvicorn. Docker CLI was not installed in this environment, so the container build/compose stack was not executed.
- Backend tests: `python -m pytest -q` — **76 passed** (2026-11-06, after restoring Instagram Unified Login).
- Frontend build: `npm run build` — production build succeeded. Vite reported that the generated JavaScript chunk is 755.03 kB and exceeds its 500 kB advisory threshold; this did not fail the build.
- Instagram uses **Instagram API with Unified Login**: authorization goes to `facebook.com/<version>/dialog/oauth` with a `config_id`, the code is exchanged at `graph.facebook.com/<version>/oauth/access_token`, and the connector resolves the shared account via `me/assigned_instagram_accounts`. It does not require a Facebook Page. Configuration is `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, and `META_OAUTH_CONFIG_ID`.
- Mocked tests cover OAuth state/token storage, analytics availability and ownership, provider sync mapping, Milestone 3 revenue/report/notification/scheduling workflows, and creator-controlled Agency/Marketing Team access approval and revocation.
- Report exports were exercised for PDF (`%PDF-`), XLSX (`PK`), and CSV (UTF-8 BOM plus `source` header) output. Downloads return an attachment filename.
- Privacy checks confirm API responses do not expose password, secret, token, encryption, or ciphertext fields. Administrators receive an empty creator dashboard, cannot open creator revenue/reports/notifications/integrations/collaborator APIs, and see collaboration status without private request notes. The Creator still sees the note when deciding whether to approve access.
- Dashboard summary, trends, platform, and top-content responses carry `data_source` and `metric_availability`. Legacy metric rows with no availability list are treated as fully populated for backward compatibility.
- UI checks cover the Creator Revenue edit flow and currency selector, the dedicated Notifications page, OAuth callback success/error messages, and role-aware route guards that fall back to Overview when a role opens a page it does not own.
- Live OAuth and provider sync were not verified in this environment. Provider credentials, approved app scopes, and eligible connected accounts must be supplied by the operator. No provider metric is fabricated when a field is unavailable.
