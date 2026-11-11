# CreatorIQ — Milestone 2 end-to-end completion guide

This guide records the actual state of this project and the remaining actions
needed outside the codebase. It does not treat demo records, public lifetime
counters, or unconfigured provider connectors as live owner analytics.

## 1. What is complete in this repository

- React/Vite frontend, FastAPI backend, database models, migrations, JWT
  authentication, account profiles, role checks, and administrator user
  management.
- Creator-only OAuth connection and manual sync workflows for YouTube,
  Instagram, Facebook Pages, X, and LinkedIn.
- Encrypted OAuth token storage, one-time hashed OAuth state, account
  ownership checks, disconnect support, and metric-availability metadata.
- Content analytics, audience insights, and growth/trend views with explicit
  unavailable states rather than invented values.
- YouTube public creator search/tracking with timestamped channel and video
  snapshots. The first snapshot is a baseline; it is not a daily growth value.
- Public YouTube analytics integrated into the main Content Analytics API and
  page. Public video values are shown as latest lifetime counters and remain
  separate from selected-period owner analytics.

## 2. Current provider readiness on this computer

The following reflects configuration presence only. It does not disclose a
client secret or access token.

| Provider | Code and OAuth flow | Local credential state | Live status |
| --- | --- | --- | --- |
| YouTube public Data API | Implemented | API key configured | Available for public channel tracking |
| YouTube owner OAuth / Analytics | Implemented | Google client ID, client secret, and token-encryption key configured | Blocked until the Google account is approved in the consent-screen audience, then it needs a successful authorization and sync |
| Instagram | Implemented | Meta client ID/secret missing | Not ready for a live connection |
| Facebook Pages | Implemented | Meta client ID/secret missing | Not ready for a live connection |
| X | Implemented | Client ID/secret missing | Not ready for a live connection |
| LinkedIn | Implemented | Client ID/secret missing | Not ready for a live connection |

## 3. Fix the current Google “Access blocked” screen

The `403 access_denied` screen appears before CreatorIQ receives an OAuth
callback. It means the Google consent screen is in **Testing** and the Google
account selected in the browser is not an approved test user.

The Google Cloud project owner must do the following:

1. Open the same Google Cloud project that owns the value in
   `GOOGLE_OAUTH_CLIENT_ID`.
2. Open **Google Auth Platform** → **Audience** (or the OAuth consent-screen
   audience page in the current console).
3. Keep the app in **Testing** for private development, then add the Google
   account being used for CreatorIQ as a **Test user**. For the screen captured
   during testing, add `kamaleshofficial.co@gmail.com`.
4. Save the audience change. No source-code change is required for adding a
   tester.
5. Confirm that the Google Cloud project has both **YouTube Data API v3** and
   **YouTube Analytics API** enabled.
6. In **Credentials**, open the web OAuth client and confirm this redirect URI
   matches exactly:

   `http://127.0.0.1:8001/api/integrations/youtube/callback`

7. Return to CreatorIQ, sign in as a **Creator**, open **Connected accounts**,
   choose **Connect YouTube**, grant the requested permissions, then click
   **Sync** after CreatorIQ returns to the application.

Testing is suitable for a private project. Publishing it to external users is
a separate Google process: use a complete consent screen, approved scopes,
verified domain information where required, privacy-policy/support links, and
Google’s verification workflow. Do not publish merely to bypass testing.

Google’s official references:

- https://support.google.com/cloud/answer/15549945
- https://support.google.com/accounts/answer/16668185
- https://developers.google.com/identity/protocols/oauth2/production-readiness/overview

## 4. Creator workflow: from zero to live analytics

1. Register or sign in with the **Creator** role and complete **Account
   settings**.
2. For public YouTube data, use **Creator discovery** to search for a channel,
   select the channel, and track it. This path needs only the configured
   YouTube Data API key, not owner OAuth.
3. Refresh Content Analytics. Public cards show tracked channels, latest public
   lifetime video counts, likes/comments when exposed, and an explicitly named
   engagement proxy. They do not show watch time, reach, shares, saves, or
   private audience demographics.
4. For owner-authorized YouTube data, complete the Google steps above, then
   click **Sync** for the connected account. The sync stores provider-returned
   content/account observations.
5. Open **Content analytics**. Selected-period values come only from dated
   connected-account observations. Public YouTube lifetime counters remain in
   their own labeled card.
6. Open **Audience insights**. Demographics, geography, device, reach, and
   impressions appear only when the authorized provider returns them.
7. Open **Growth & trends** after at least two real syncs on different
   observations. The first sync is a baseline; the application must not infer
   activity for dates it did not observe.

## 5. Add the other providers without exposing secrets

For every provider, create the developer application in the provider’s own
developer console, enable the specified product/scopes, register the exact
callback URL below, and place only the client ID/key and client secret in
`backend/.env`. Never put secrets in the Vite frontend, source control, or a
chat.

| Provider | Callback | Required external authorization |
| --- | --- | --- |
| Instagram | `http://localhost:8001/api/integrations/instagram/callback` | Eligible professional Creator/Business account, Instagram product, Insights permissions, and any required Meta review |
| Facebook Pages | `http://localhost:8001/api/integrations/facebook/callback` | Facebook Login, a manageable Page, Page permissions, and any required Meta review |
| X | `http://127.0.0.1:8001/api/integrations/x/callback` | OAuth 2.0 with PKCE, `users.read`, `tweet.read`, `offline.access`, and an API plan that exposes the requested endpoints |
| LinkedIn | `http://127.0.0.1:8001/api/integrations/linkedin/callback` | Approved LinkedIn products and member analytics scopes; OAuth alone does not grant analytics access |

After changing `backend/.env`, restart only the already configured backend,
open Connected accounts, connect one account, then press **Sync** and review
any warnings. Repeat per account. The dashboard never converts a missing
metric into zero or a simulated value.

## 6. Roles and pages in Milestone 2

| Role | Available purpose in this milestone | Not part of Milestone 2 |
| --- | --- | --- |
| Creator | Own profile, Creator Discovery, social account connections, syncs, and own analytics | Revenue and report-generation modules |
| Agency | Own agency profile and analytics-read permission foundation | Client invitations/assignments, multi-creator rollups, client switching, and billing |
| Marketing Team | Own team profile and analytics-read permission foundation | Campaigns, creator assignment, approvals, and team-specific shared analytics |
| Administrator | Create/list users, assign roles, manage own account settings | Viewing or impersonating creator private metrics without an explicit authorization model |

Creator Discovery and Connected Accounts are deliberately hidden from
non-Creator roles because the API correctly refuses non-Creator social account
connections. Agency and Marketing Team data sharing cannot be completed
honestly until a product owner defines the relationship model: who can see
which creator, whether access is read-only, how revocation works, and whether
data is shared by account, campaign, or workspace. Those are a subsequent
milestone, not missing seed data.

## 7. Milestone 2 release checklist

1. Apply the database migrations with the project’s existing migration command.
2. Run the backend test suite from `backend`: `python -m pytest -q`.
3. Build the frontend from `frontend`: `npm run build`.
4. Complete the Google test-user/redirect/API checklist above and perform one
   authorized YouTube sync.
5. Verify Content Analytics shows the correct source label and no period/lifetime
   mix-up.
6. Perform a second YouTube public or owner sync later and verify Growth &
   Trends shows a change only between actual observations.
7. Configure, authorize, and sync each additional provider only when its app
   credentials, product approval, and eligible account are available.
8. Re-run the automated tests and manually test Creator, Agency, Marketing
   Team, and Administrator sign-in paths before release.

## 8. Milestone boundary

Revenue and Reports remain explicitly marked **Milestone 3**. Do not mark them
as complete in a Milestone 2 review. Likewise, no code change can create
Google/Meta/X/LinkedIn developer-app approvals, add a Google test user,
or grant an account’s private analytics permission; those actions require the
relevant account owner in each provider console.
