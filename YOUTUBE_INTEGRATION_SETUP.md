# CreatorIQ — YouTube Social Account Integration & Analytics Setup Guide

This guide details the complete configuration and verification workflow for the **CreatorIQ YouTube Social Account Integration (Phase 1 MVP)**.

---

## 1. Overview & Architecture

The YouTube integration enables creators to connect their authentic YouTube channels via official Google OAuth 2.0 and stream live metrics into CreatorIQ:
- **YouTube Data API v3**: Fetches channel profile (avatar, title, custom URL), subscriber counts, lifetime video views, video counts, and post-level upload statistics (views, likes, comments, duration).
- **YouTube Analytics API**: Fetches audience velocity, 28-day impression trajectories, estimated watch time hours, net subscriber growth, and engagement rate benchmarks.
- **Backend Token Custody**: Access and refresh tokens are stored strictly server-side in encrypted/restricted vaults and are **never exposed to client browsers or readable in client Firestore queries**.

```
┌─────────────────────────────────┐
│     CreatorIQ Frontend (React)   │
│  Creator Analytics & Benchmarks │
└────────────────┬────────────────┘
                 │ 1. Initiate OAuth (Firebase ID Token)
                 ▼
┌────────────────────────────────────────────────────────┐
│     Vite Dev Server API / Firebase Cloud Functions     │
│  - GET  /api/auth/youtube                              │
│  - GET  /api/auth/youtube/callback                     │
│  - GET  /api/youtube/channel (Tokens stripped)         │
│  - GET  /api/youtube/analytics                         │
│  - POST /api/youtube/refresh                           │
│  - POST /api/youtube/disconnect                        │
└───────┬────────────────────────────────────────┬───────┘
        │ 2. Code Exchange & Token Refresh       │ 3. Read-only Data Queries
        ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│       Google OAuth 2.0        │        │   YouTube Data & Analytics    │
│  - oauth2.googleapis.com      │        │  - youtube.googleapis.com     │
│  - oauth2.googleapis.com/revoke│       │  - youtubeanalytics.googleapis│
└───────────────────────────────┘        └───────────────────────────────┘
```

---

## 2. Google Cloud Console Configuration

Follow these steps to obtain production Google OAuth 2.0 credentials for CreatorIQ:

### Step 2.1: Open Google Cloud Console
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your existing project (or create a new project named `CreatorIQ`).

### Step 2.2: Enable YouTube APIs
1. In the search bar, search for **YouTube Data API v3**.
2. Click **Enable**.
3. Next, search for **YouTube Analytics API**.
4. Click **Enable**.

### Step 2.3: Configure the OAuth Consent Screen
1. In the left navigation menu, go to **APIs & Services** > **OAuth consent screen**.
2. Choose **External** (or **Internal** if using Google Workspace) and click **Create**.
3. Fill in the App Information:
   - **App name**: `CreatorIQ`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and select:
   - `https://www.googleapis.com/auth/youtube.readonly` (View YouTube assets and channel statistics)
   - `https://www.googleapis.com/auth/yt-analytics.readonly` (View YouTube Analytics reports)
6. Click **Update** > **Save and Continue**.
7. Under **Test Users**, add the Google email address of the YouTube channel you wish to connect during development.
8. Click **Save and Continue**.

### Step 2.4: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Set **Application type** to `Web application`.
4. Set **Name** to `CreatorIQ Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173/api/auth/youtube/callback`
7. Click **Create**.
8. Copy the generated **Client ID** and **Client Secret**.

---

## 3. Environment Variable Configuration

Open your `.env` file in the root directory of `CreatorIQ` and add your credentials:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyA4PFkdJdeOnOgIO-uyjIPVjGM8UrV_JaA
VITE_FIREBASE_AUTH_DOMAIN=creatoriq-2c8e7.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=creatoriq-2c8e7
VITE_FIREBASE_STORAGE_BUCKET=creatoriq-2c8e7.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=629831164106
VITE_FIREBASE_APP_ID=1:629831164106:web:faddc9253e997a2caad433
VITE_FIREBASE_MEASUREMENT_ID=G-JCP1SBEZ4T

# YouTube OAuth & API Configuration
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:5173/api/auth/youtube/callback
YOUTUBE_API_KEY=your_optional_google_api_key
```

> **Note**: Vite will automatically reload the configuration when `.env` is modified.

---

## 4. API Endpoints Reference

All endpoints automatically verify the caller's Firebase Auth ID token and isolate creator data:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/youtube` | Generates official Google OAuth 2.0 authorization URL with CSRF state token. |
| `GET` | `/api/auth/youtube/callback` | Exchanges authorization code with Google for tokens, fetches channel profile, and securely stores credentials server-side. |
| `GET` | `/api/youtube/channel` | Returns connected channel metadata (title, custom URL, subscribers, views, video count). **Tokens are never returned**. |
| `GET` | `/api/youtube/analytics` | Returns real 28-day impression telemetry, watch time hours, subscriber gains, and upload-level statistics. |
| `POST` | `/api/youtube/refresh` | Forces an immediate refresh from Google APIs and updates cached telemetry. |
| `POST` | `/api/youtube/disconnect` | Revokes the OAuth token with Google and wipes all stored credentials. |

---

## 5. Security & Privacy Safeguards

1. **Token Insulation**:
   - Access tokens and refresh tokens are stored in `.server_data/youtube_credentials.json` (server-side only, gitignored) or in restricted Cloud Functions.
   - Tokens are **never** included in API responses, stored in `localStorage`, or placed in cookies.
2. **Firestore Rules Enforcement**:
   - `/youtube_credentials/{userId}`: Strict rule `allow read, write: if false;` blocks all client SDK queries.
   - `/youtube_analytics/{userId}`: Strict rule `allow read: if request.auth.uid == userId; allow write: if false;` prevents user impersonation.
3. **Data Isolation**:
   - Every API request validates the authenticated Firebase UID. A creator can only access or modify their own connection.
4. **Complete Revocation on Disconnect**:
   - Clicking "Disconnect" calls Google's token revocation endpoint (`https://oauth2.googleapis.com/revoke`) and deletes stored records.

---

## 6. Manual Testing & Verification Procedure

1. **Launch Local Server**:
   Ensure `npm run dev` is running:
   ```bash
   npm run dev
   ```
2. **Login as Creator**:
   - Go to `http://localhost:5173/`
   - Log in using Creator credentials (`creator@creatoriq.io` / `Password123!`).
3. **Navigate to Analytics**:
   - In the Creator Portal sidebar, click **Analytics**.
4. **Inspect Connection UI**:
   - Verify the **Connect Your YouTube Channel** card displays YouTube branding, official read-only scopes notice, and the **Connect YouTube Channel** button.
   - Click **API Setup Guide** to review in-app setup instructions.
5. **Connect Channel**:
   - Click **Connect YouTube Channel**.
   - An authorized Google OAuth popup will launch.
   - Select your test Google Account and grant read-only permissions.
   - The popup will automatically close and return you to CreatorIQ.
6. **Verify Live Telemetry**:
   - The header will update to show your channel avatar, verified title, custom URL, total subscribers, lifetime views, and total uploads.
   - **Audience Velocity Chart**: Notice the `Live YouTube API` badge and real daily view points.
   - **Top Performing Content**: Notice real uploaded video thumbnails, video titles, real view counts, likes, comments, and direct YouTube links.
   - **Connected Platforms**: Notice the YouTube platform card is marked `OAuth 2.0 Verified`.
7. **Test Sync & Disconnect**:
   - Click **Sync Live Data** to verify real-time API re-fetch.
   - Click **Disconnect**, confirm in the modal, and verify that the channel is disconnected and tokens are revoked.

---

## 7. Troubleshooting & API Quota Limits

- **Error: `CONFIG_REQUIRED`**:
  Make sure `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are set in `.env` and dev server was restarted.
- **Error: `redirect_uri_mismatch`**:
  In Google Cloud Console under Credentials > OAuth client ID, confirm that `http://localhost:5173/api/auth/youtube/callback` is listed under **Authorized redirect URIs** (exact match with port `5173`).
- **Error: `access_denied`**:
  Ensure your Google account email is added as a **Test User** in the OAuth Consent Screen in Google Cloud Console while the app is in testing mode.
- **YouTube API Quota Limit**:
  YouTube Data API v3 provides a standard quota of 10,000 units/day. When quota is exceeded, CreatorIQ serves cached performance data and informs the creator gracefully without interrupting dashboard navigation.
