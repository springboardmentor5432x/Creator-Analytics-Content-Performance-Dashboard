# CreatorHub Milestone 2 page update

## Updated page behavior
- **Social Accounts:** displays provider-by-provider authorization status and clear setup guidance. Only provider-confirmed accounts are marked connected.
- **Audience:** loads API audience snapshots, shows follower totals where available, and labels demographics unavailable unless the provider supplies them.
- **Content Library:** loads authorized posts and their fetched metrics from the backend.
- **Analytics:** displays fetched post-level metrics and sorts by views; no synthetic totals are inserted.
- **Revenue:** allows manual tracking of brand deals, sponsorships, affiliate income and payouts, with collected/pending totals. In this version, those manually entered records are local to the browser/device.
- **Reports:** exports a CSV of the fetched post data.
- **Saved Reports:** saves and removes named report configurations locally.
- **Notifications:** provides connection/analytics status messages.
- **My Profile:** profile display name, bio, primary platform and website.
- **Settings:** profile preferences, timezone, language, notification toggles, signed-in account status, and shortcuts to manage connections/sign out.

## Provider limitations
YouTube is the only provider with a complete OAuth callback/data-fetch adapter in this project version. Instagram, TikTok, and LinkedIn have visible connection cards and API setup errors, but are not complete real integrations yet. No valid provider credentials can be bundled in a ZIP. Add your own developer credentials and implement each provider's approved OAuth and API adapter before treating those providers as connected.
