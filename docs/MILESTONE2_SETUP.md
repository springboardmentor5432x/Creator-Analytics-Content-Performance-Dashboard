# CreatorIQ Milestone 2 — Operator checklist

## Local baseline

- [ ] Extract the ZIP to a new directory named `CreatorIQ_Milestone2`; do not point VS Code to the older `CreatorIQ_Milestone1` folder.
- [ ] In `backend`, create/activate a local `.venv` and install `requirements-dev.txt`.
- [ ] Copy `backend/.env.example` to `backend/.env` and generate a Fernet encryption key.
- [ ] Start FastAPI at `127.0.0.1:8001`; verify `/health` and `/docs`.
- [ ] In `frontend`, run `npm install`, then `npm run dev`; verify login and the demo dashboard.
- [ ] Run `python -m pytest -q` from the `backend` directory before making changes.

## OAuth connector checklist

Each live provider needs an app registered with its developer portal, a callback URL that matches exactly, enabled API products, eligible account, consent, and permissions. The code cannot manufacture access to a provider API simply because the app credentials exist.

- [ ] Generate a stable `OAUTH_TOKEN_ENCRYPTION_KEY`; store it outside version control and back it up securely.
- [ ] YouTube: Google Cloud project, YouTube Data API v3 + Analytics API, OAuth Web Client, test users, `youtube.readonly` and `yt-analytics.readonly`.
- [ ] Instagram: Meta developer app configured for Instagram Login, eligible professional account, `instagram_business_basic` and `instagram_business_manage_insights`.
- [ ] Facebook Pages: Meta app with Facebook Login for Business, a configuration ID, and only `pages_show_list` and `pages_read_engagement` (Meta rejects `read_insights` and `pages_read_user_content` as invalid scopes).
- [ ] X: X Developer app with OAuth 2.0, PKCE, and `users.read`, `tweet.read`, `offline.access`; API endpoints and usage depend on the app's plan.
- [ ] LinkedIn: LinkedIn app with the approved member analytics products/scopes configured by the operator; access to member post/profile analytics is not guaranteed by OAuth alone.
- [ ] Keep all OAuth secrets out of React/Vite variables and never paste them into chats or commits.
- [ ] Connect one account, sync it, check `last_synced_at`, review the returned warnings, then inspect `/api/analytics/content`, `/api/analytics/audience`, and `/api/analytics/growth`.
- [ ] Repeat the sync later to establish actual daily deltas. Do not interpret a first cumulative snapshot as first-day performance.

### X setup

1. Create an X Developer app and enable OAuth 2.0 authorization-code flow with PKCE and refresh-token access.
2. Register `http://127.0.0.1:8001/api/integrations/x/callback` as the callback URI.
3. Grant `users.read`, `tweet.read`, and `offline.access`; endpoint and usage access depend on the app's developer plan.
4. Set `X_CLIENT_ID` and `X_CLIENT_SECRET` in `backend/.env`, then restart the backend.
5. Connect X in CreatorIQ and press **Sync**. Fields not returned by the account's API plan remain unavailable.

### LinkedIn setup

1. Create a LinkedIn developer app and enable the products that grant member profile and post analytics to the app.
2. Register `http://127.0.0.1:8001/api/integrations/linkedin/callback` as the callback URI.
3. Request `openid`, `profile`, `email`, `r_member_postAnalytics`, `r_member_profileAnalytics`, and `r_member_social` only when LinkedIn has approved the corresponding access for the app.
4. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and, if required, `LINKEDIN_OAUTH_SCOPES` in `backend/.env`, then restart the backend.
5. Connect LinkedIn and press **Sync**. OAuth authorization alone does not guarantee access to member analytics endpoints.

## Local quality gate

- [ ] Run `python -m pytest -q` from `backend`.
- [ ] Run `npm install` and `npm run build` from `frontend`.
- [ ] Manually review responsive views for Connected accounts, Content analytics, Audience insights, and Growth & trends.
- [ ] Check that unavailable metrics are labeled unavailable, not interpreted as actual zeros.
- [ ] Test account isolation with two Creator accounts: one account must not see or sync the other's connected social account.
- [ ] Do not create/push/merge a GitHub branch or pull request until local verification is complete and the owner requests it.

## Known connector boundary

OAuth and sync adapters are implemented for YouTube, Instagram, Facebook Pages, X, and LinkedIn. Connector code and mocked tests do not establish that a provider app is approved, credentials are configured, or a real account has synced. Only YouTube public Data API requests were live-verified in the package environment; owner-authorized and other-provider OAuth flows still require external credentials and account approval.
