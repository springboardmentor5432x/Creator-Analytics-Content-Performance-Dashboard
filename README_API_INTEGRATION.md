# Live API integration notes

The active backend is **FastAPI** (`backend/app.py`), not Flask. See the root README for full installation and OAuth instructions.

- `GET /api/health` reports database mode and whether YouTube OAuth credentials are configured.
- Authenticated routes use `Authorization: Bearer <JWT>`.
- `/api/oauth/youtube/start` returns an authorization URL for the signed-in user; the callback validates one-time state before linking the channel.
- `/api/analytics/overview` synchronizes channel/video data from the YouTube Data API and attempts daily reports from YouTube Analytics API. Data is persisted in the configured database.
- `/api/analytics/audience` returns available follower snapshots. `/api/analytics/compare` compares post records owned by the authenticated creator.

No API keys, OAuth tokens, or sample metric fallbacks are shipped in this project. The user must configure their own Google Cloud OAuth credentials. Instagram, TikTok, and LinkedIn are future integrations, not completed providers. YouTube does not provide all audience demographics or reach metrics via the current API integration, so those fields remain unavailable rather than being fabricated.
