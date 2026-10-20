# CreatorHub live analytics integration

This build no longer substitutes fabricated sample analytics when no provider is connected. Empty/unavailable states are shown instead. The Creator dashboard polls the backend every 60 seconds and has a manual Refresh control.

## What is actually implemented

- Flask API health endpoint.
- YouTube OAuth 2.0 authorization-code flow (server-side callback).
- YouTube access/refresh token storage in a local SQLite token store (for development only).
- Automatic refresh of expired YouTube access tokens when a refresh token is available.
- Fetches authorized YouTube channel statistics, latest uploaded videos and their public statistics through the YouTube Data API.
- Attempts daily views/likes/comments/shares through the YouTube Analytics API and explicitly marks that data unavailable if the authorized report cannot be retrieved.
- Dashboard shows only API-returned data; it does not fill gaps with demo numbers.
- Instagram/TikTok cards clearly tell you that OAuth/provider setup is still required. Those integrations are not claimed to be implemented.

## 1. Configure YouTube OAuth

1. Create/select a project in Google Cloud Console.
2. Enable **YouTube Data API v3** and use the YouTube Analytics API as needed.
3. Configure the OAuth consent screen and add your Google account as a test user while the app is in testing.
4. Create an OAuth Client ID of type **Web application**.
5. Add this authorized redirect URI exactly: `http://127.0.0.1:5000/api/oauth/youtube/callback`.
6. In `backend`, create `.env` from `.env.example` and fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a strong `FLASK_SECRET_KEY`.
7. Use `http://127.0.0.1:5000` consistently for backend OAuth URLs (don't swap `127.0.0.1` with `localhost` mid-flow).

Required scopes are `youtube.readonly` and `yt-analytics.readonly`. Analytics metrics require channel-owner authorization and may not be available for every account/report. The code does not fabricate values when a report is unavailable.

## 2. Start backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with OAuth credentials before connecting YouTube
python app.py
```

If PowerShell says Flask is missing, install dependencies in the activated environment using `python -m pip install -r requirements.txt`.

Health check: `http://127.0.0.1:5000/api/health`.

## 3. Start frontend in a second terminal

```powershell
npm install
npm run dev
```

Open the Vite URL, sign in, navigate to **Social Accounts**, and select **Connect account** under YouTube. Approve the requested scopes. Return to the Creator dashboard and refresh. The API can only return real data after valid Google OAuth credentials and user consent are configured.

## Important limits / remaining work

- The token database is SQLite for local development, not PostgreSQL. Tokens are stored server-side but are not encrypted at rest in this starter; don't deploy it with real accounts until token encryption, secure production sessions, CSRF protection, HTTPS, and a proper database are implemented.
- The existing signup/login system is still client-side in this starter and must be replaced with backend authentication before production. OAuth currently associates the YouTube connection with the email passed by the logged-in browser; it is not a substitute for secure backend identity verification.
- Instagram Graph API OAuth/insights and TikTok OAuth/video metrics are not implemented in this build and need their own developer app credentials, permitted scopes, and platform-specific adapters.
- Agency, Marketing, and Admin dashboard counts require persistent workspace, campaign, membership, and audit-log tables/endpoints. This build removes their hard-coded fake metric values and shows unavailable placeholders until those real records are implemented.
- “Real time” means refreshed from the provider on a 60-second polling interval; provider reporting latency, quota, and permissions still apply. YouTube Analytics daily reports are not guaranteed to update every minute.
