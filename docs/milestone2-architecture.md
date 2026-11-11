# CreatorIQ — Milestone 2 Architecture

## Runtime components

- **React + Vite:** authenticated dashboard, Creator Discovery, Connected accounts, Content Analytics, Audience Insights, and Growth & Trends.
- **FastAPI:** protected analytics and integration endpoints; provider callbacks validate one-time OAuth state and never return credentials to the browser.
- **SQLAlchemy:** existing Milestone 1 user/profile/social/content models plus OAuth credentials/state, daily account metrics, latest content snapshots, and separate user-owned public creator/video snapshots.
- **Provider adapters:** separate services for YouTube, Instagram, Facebook Pages, X, and LinkedIn. Provider-specific response fields are normalized at the adapter boundary.
- **Fernet encryption:** access and refresh tokens are encrypted before persistence; the encryption key is held in backend environment configuration, not in frontend code.

## Social connection flow

1. A signed-in Creator starts a provider connection from Connected accounts.
2. The backend verifies that the provider client credentials and token-encryption key are configured.
3. The backend creates a high-entropy OAuth state, stores only its SHA-256 hash with user/provider/expiry metadata, and returns an authorization URL.
4. The provider redirects to the callback. The backend checks and consumes the state once, exchanges the authorization code, fetches the authorized account identity, and encrypts returned tokens.
5. The connected SocialAccount belongs to the initiating Creator profile. Sync/disconnect endpoints re-check that ownership.
6. Tokens remain in server-side storage; browser responses contain connection metadata and metric results only.

## Public creator tracking

1. A signed-in user searches by channel name, handle, channel URL, or channel ID. Name searches return multiple real YouTube Data API channel results for explicit selection.
2. The selected stable channel ID is fetched from the public Channels API. The service enumerates its uploads playlist using page tokens and batches video detail/statistics requests.
3. `tracked_creators` records the relationship to the authenticated user. `tracked_creator_snapshots`, `tracked_creator_videos`, and `tracked_creator_video_snapshots` store timestamped raw observations separately from connected owner accounts and demo seed data.
4. The first sync is a baseline. Later snapshots expose changes only between actual observation timestamps; decreases or missing counters are represented as unavailable/reset rather than as fabricated growth.
5. Public engagement is a likes-plus-comments-per-view proxy only when all required counters are public. Private watch time, reach, impressions, shares, saves, and audience metrics remain unavailable.
6. Every list, detail, sync, pagination, and delete operation filters by the authenticated user ID.

## Data synchronization

1. A Creator triggers manual sync for an authorized account.
2. The provider service refreshes an expired token when the provider supports refresh tokens.
3. Recent posts and available content metrics are upserted using provider post IDs.
4. Latest cumulative counters are stored separately from dated metrics. The first cumulative response is a baseline; later values are compared to the prior snapshot to derive deltas. Where the provider exposes authorized daily Analytics reports, those reports are preferred for dated activity.
5. Account-level daily follower/subscriber changes are stored in `account_metrics`.
6. Analytics endpoints aggregate the persisted rows and return source/availability metadata so a missing metric is not presented as a real zero.

## Ownership and security boundaries

- Integration and analytics APIs require authentication; connect/sync/disconnect actions are Creator-only in this milestone.
- Query functions filter social accounts through the authenticated CreatorProfile.
- OAuth callback endpoints do not require the browser's existing access token by design, but each one-time state is tied to the initiating user and provider.
- Client secrets are never returned from `/api/integrations/providers`. Raw OAuth state is never stored; only its hash is persisted. Access/refresh tokens are encrypted before database storage.
- The Fernet key must be backed up securely. Losing or rotating it without re-encrypting existing token rows makes those rows unreadable.

## Metric limitations

Provider definitions and grants differ. YouTube Data API counters are cumulative, while YouTube Analytics can expose dated daily reports. Instagram/Facebook Insights and X/LinkedIn analytics fields depend on eligible account types, access tier, scopes, API product and approval status. Unavailable fields are reported as unavailable; no cross-platform value is fabricated.

## Local database note

`Base.metadata.create_all()` creates new Milestone 2 tables on startup without dropping Milestone 1 tables. For an existing production database, manage schema evolution with Alembic migrations and review any migration before deployment. `schema/postgresql_schema.sql` contains the reference DDL for the core models and Milestone 2 tables.

The additive `20261030_01` migration creates the public creator tracking tables and indexes. `20261030_02` adds explicit metric-availability fields for daily content and audience data. Apply both from `backend` with `python -m alembic upgrade head`; the first migration is safe when the app has already created those tables through the prototype startup hook.

Analytics routes default to `mode=live`; callers must explicitly request `mode=demo` to include seeded sample accounts. Historical series use `null` for dates with no reported observation, and metric availability is stored separately so a genuine zero remains distinguishable from unavailable data.
