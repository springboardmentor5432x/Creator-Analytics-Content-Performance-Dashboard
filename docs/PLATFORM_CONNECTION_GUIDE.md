# Connecting Social Platforms

This guide is for the Creator role. A CreatorIQ user must be signed in as a **Creator** before opening **Connected accounts**. Agency, Marketing Team, and Administrator workspaces cannot connect or view another creator's private social analytics.

## One-time security requirement

Create one stable Fernet key and set it only on the backend:

```env
OAUTH_TOKEN_ENCRYPTION_KEY=<your-fernet-key>
```

Never put a provider client secret, access token, or this encryption key in `frontend/.env`, Vite variables, a commit, or a chat message. Restart the backend after changing `backend/.env`.

## Provider setup matrix

| Platform | Backend variables | Exact local callback URL | Account / provider requirement |
| --- | --- | --- | --- |
| YouTube | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `YOUTUBE_API_KEY` | `http://127.0.0.1:8001/api/integrations/youtube/callback` | Google OAuth app; YouTube Data API v3 and YouTube Analytics API enabled; a channel the selected account can access. |
| Instagram | `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, `META_OAUTH_CONFIG_ID` | `http://localhost:8001/api/integrations/instagram/callback` | Meta app owned by a business portfolio, with an **API setup with Unified login** configuration labelled **Instagram Login Compatible**. Instagram professional account in that business portfolio. No Facebook Page required. |
| Facebook Pages | `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, `FACEBOOK_OAUTH_CONFIG_ID` | `http://localhost:8001/api/integrations/facebook/callback` | Meta app with Facebook Login for Business configuration using `pages_show_list` and `pages_read_engagement`; the user manages the chosen Page. |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` | `http://127.0.0.1:8001/api/integrations/x/callback` | X Developer app using OAuth 2.0 with PKCE; an API plan that grants the requested endpoints. |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | `http://127.0.0.1:8001/api/integrations/linkedin/callback` | LinkedIn app with the member analytics products/scopes approved for that app. |

Instagram and Facebook use the same Meta app credentials, but each needs its own callback URL registered in Meta.

## Configure and verify one platform

1. Register the provider app in its developer console.
2. Copy the exact callback URL from the table into that provider app. `localhost` and `127.0.0.1` are different values; use the value shown above.
3. Enable the listed API products and request only the scopes the provider has approved for the app.
4. Put the client ID, client secret, and Fernet key in `backend/.env`.
5. Restart the backend. On **Connected accounts**, the provider should change from **Setup required** to **Ready to connect**.
6. Sign in as a Creator, select **Connect _platform_**, complete the provider's consent screen, then return to CreatorIQ.
7. Select **Sync**. Check the last-sync timestamp and any warning shown in the toast. Open Content Analytics, Audience Insights, and Growth & Trends to see only the values that provider returned.

Do this platform by platform. Do not connect a second provider until the first provider's callback and initial sync have completed successfully.

## Platform-specific requirements

### YouTube

- Enable **YouTube Data API v3** and **YouTube Analytics API** in the same Google Cloud project.
- Request `youtube.readonly` and `yt-analytics.readonly`.
- When the Google consent screen is in **Testing**, add every Google account that will connect as a test user. Otherwise Google returns `403: access_denied` before CreatorIQ can receive the callback.
- The initial sync stores cumulative video totals as a baseline. It does not label that lifetime counter as a 7/30/90-day value. Sync on a later date to record a real delta if video-level daily Analytics data is unavailable.

### Instagram

- Uses **Instagram API with Unified Login** (`facebook.com/dialog/oauth` with a `config_id`), authenticating with Instagram or Facebook. No Facebook Page link is required.
- The Meta app must be owned by a business portfolio, and the configuration must be labelled **Instagram Login Compatible**. Check this in **API setup with Unified login → Configure your app**.
- Store the Meta app ID/secret and the Unified Login configuration ID in `META_OAUTH_CLIENT_ID`, `META_OAUTH_CLIENT_SECRET`, and `META_OAUTH_CONFIG_ID`.
- The Instagram professional account must belong to the business portfolio selected during login. Personal accounts are rejected.
- The login URL always includes `prompt=login` so Instagram is offered even when a Facebook session already exists.
- A token alone does not guarantee every Insight field. The dashboard will leave unsupported fields unavailable.

### Facebook Pages

- Create a **Facebook Login for Business** configuration in the Meta app and copy its configuration ID into `FACEBOOK_OAUTH_CONFIG_ID`.
- The Facebook user authorising the connection must manage the Page.
- Include only `pages_show_list` and `pages_read_engagement` in the configuration. Do not request `read_insights` or `pages_read_user_content`; Meta now treats them as invalid scopes for many apps, and `pages_read_engagement` covers Page post and Insights access.
- During development, use an app Admin/Developer/Tester account; advanced access may be required for accounts outside those roles.
- The connector handles Pages, not private personal-profile analytics. It imports all Pages the authorized person can manage.

### X

- Enable OAuth 2.0 authorization-code flow with PKCE and refresh-token access.
- Request `users.read`, `tweet.read`, and `offline.access`.
- X API plans control endpoint availability and usage limits. A successful login does not create access to an endpoint excluded by the plan.

### LinkedIn

- Register an app and obtain approval for the member analytics products before requesting analytics scopes.
- The default configuration requests `openid`, `profile`, `email`, `r_member_postAnalytics`, `r_member_profileAnalytics`, and `r_member_social`; request only scopes the app is approved to use.
- Member post and follower analytics can remain unavailable even after a successful OAuth sign-in if LinkedIn has not granted product access.

## What a successful first sync means

A successful first sync proves that CreatorIQ could obtain and securely store an approved connection and import the data exposed at that moment. It does **not** guarantee demographics, reach, impressions, watch time, or historical daily trends. Provider eligibility, scopes, thresholds, API plans, and reporting delays determine those fields.

The UI must show unavailable metrics as unavailable; it must not replace them with sample data or zero-value claims.
