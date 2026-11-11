-- PostgreSQL reference schema for CreatorIQ (Milestone 1 + planned project modules).
-- The authoritative runtime model definitions are in backend/app/models.py.

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'creator'
        CHECK (role IN ('creator', 'agency', 'marketing_team', 'administrator')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_users_email ON users(email);

CREATE TABLE creator_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(120) NOT NULL,
    niche VARCHAR(100) NOT NULL DEFAULT 'General',
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agency_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(120) NOT NULL,
    service_focus VARCHAR(100) NOT NULL DEFAULT 'General',
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing_team_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(120) NOT NULL,
    focus_area VARCHAR(100) NOT NULL DEFAULT 'General',
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE social_accounts (
    id SERIAL PRIMARY KEY,
    creator_profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    handle VARCHAR(120) NOT NULL,
    followers_count INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_social_accounts_followers_nonnegative CHECK (followers_count >= 0),
    profile_url VARCHAR(500),
    is_connected BOOLEAN NOT NULL DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_platform_handle UNIQUE(platform, handle)
);
CREATE INDEX ix_social_accounts_profile ON social_accounts(creator_profile_id);

CREATE TABLE content_posts (
    id SERIAL PRIMARY KEY,
    social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    external_post_id VARCHAR(160) UNIQUE,
    title VARCHAR(250) NOT NULL,
    content_type VARCHAR(40) NOT NULL DEFAULT 'Video',
    post_url VARCHAR(500),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_content_posts_account ON content_posts(social_account_id);

CREATE TABLE content_metrics (
    id SERIAL PRIMARY KEY,
    content_post_id INTEGER NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
    recorded_on DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    saves INTEGER NOT NULL DEFAULT 0,
    watch_time_seconds INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    metrics_available JSON NOT NULL DEFAULT '[]'::json,
    CONSTRAINT uq_post_metric_day UNIQUE(content_post_id, recorded_on)
);
CREATE INDEX ix_content_metrics_day ON content_metrics(recorded_on);

CREATE TABLE audience_insights (
    id SERIAL PRIMARY KEY,
    social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    recorded_on DATE NOT NULL DEFAULT CURRENT_DATE,
    age_distribution JSON NOT NULL DEFAULT '{}'::json,
    gender_distribution JSON NOT NULL DEFAULT '{}'::json,
    geographic_distribution JSON NOT NULL DEFAULT '{}'::json,
    device_distribution JSON NOT NULL DEFAULT '{}'::json,
    active_hours JSON NOT NULL DEFAULT '{}'::json,
    impressions INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    metrics_available JSON NOT NULL DEFAULT '[]'::json,
    CONSTRAINT uq_account_audience_day UNIQUE(social_account_id, recorded_on)
);

CREATE TABLE revenue_records (
    id SERIAL PRIMARY KEY,
    creator_profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    source VARCHAR(40) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    description VARCHAR(250),
    recorded_on DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX ix_revenue_profile_date ON revenue_records(creator_profile_id, recorded_on);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    creator_profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'performance',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    creator_profile_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(160) NOT NULL,
    file_url VARCHAR(500),
    format VARCHAR(10) NOT NULL DEFAULT 'PDF',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Milestone 2: encrypted OAuth credentials. Never store plaintext tokens.
CREATE TABLE oauth_credentials (
    id SERIAL PRIMARY KEY,
    social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    provider_account_id VARCHAR(255),
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_type VARCHAR(40) NOT NULL DEFAULT 'Bearer',
    scopes JSON NOT NULL DEFAULT '[]'::json,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_oauth_credential_social_account UNIQUE(social_account_id)
);
CREATE INDEX ix_oauth_credentials_social_account_id ON oauth_credentials(social_account_id);

-- Only a SHA-256 state hash is stored; the raw state is returned only once.
CREATE TABLE oauth_states (
    state_hash VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(40) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX ix_oauth_states_expires_at ON oauth_states(expires_at);

-- Dated account-level analytics; missing provider metrics remain distinguishable
-- through metrics_available instead of being falsely represented as real values.
CREATE TABLE account_metrics (
    id SERIAL PRIMARY KEY,
    social_account_id INTEGER NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    recorded_on DATE NOT NULL DEFAULT CURRENT_DATE,
    followers_count INTEGER,
    followers_gained INTEGER NOT NULL DEFAULT 0,
    followers_lost INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    shares INTEGER NOT NULL DEFAULT 0,
    watch_time_seconds INTEGER NOT NULL DEFAULT 0,
    subscribers_gained INTEGER NOT NULL DEFAULT 0,
    subscribers_lost INTEGER NOT NULL DEFAULT 0,
    metrics_available JSON NOT NULL DEFAULT '[]'::json,
    source VARCHAR(40) NOT NULL DEFAULT 'provider_api',
    CONSTRAINT uq_account_metric_day UNIQUE(social_account_id, recorded_on)
);
CREATE INDEX ix_account_metrics_social_account_id ON account_metrics(social_account_id);
CREATE INDEX ix_account_metrics_recorded_on ON account_metrics(recorded_on);

-- Latest cumulative counters are kept separate from daily metric deltas.
CREATE TABLE content_snapshots (
    id SERIAL PRIMARY KEY,
    content_post_id INTEGER NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
    latest_views INTEGER NOT NULL DEFAULT 0,
    latest_likes INTEGER NOT NULL DEFAULT 0,
    latest_comments INTEGER NOT NULL DEFAULT 0,
    latest_shares INTEGER NOT NULL DEFAULT 0,
    latest_saves INTEGER NOT NULL DEFAULT 0,
    latest_reach INTEGER NOT NULL DEFAULT 0,
    latest_impressions INTEGER NOT NULL DEFAULT 0,
    metrics_available JSON NOT NULL DEFAULT '[]'::json,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(40) NOT NULL DEFAULT 'youtube_data_api',
    CONSTRAINT uq_content_snapshot_post UNIQUE(content_post_id)
);
CREATE INDEX ix_content_snapshots_content_post_id ON content_snapshots(content_post_id);

-- Public creator tracking is user-owned and intentionally separate from OAuth SocialAccount rows.
CREATE TABLE tracked_creators (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(80) NOT NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url VARCHAR(1000),
    channel_url VARCHAR(500) NOT NULL,
    custom_url VARCHAR(255),
    published_at TIMESTAMPTZ,
    subscriber_count INTEGER,
    view_count INTEGER,
    video_count INTEGER,
    hidden_subscriber_count BOOLEAN NOT NULL DEFAULT FALSE,
    uploads_playlist_id VARCHAR(120),
    videos_next_page_token VARCHAR(500),
    more_videos_available BOOLEAN NOT NULL DEFAULT FALSE,
    tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    last_sync_error TEXT,
    CONSTRAINT uq_tracked_creator_user_channel UNIQUE(user_id, channel_id)
);
CREATE INDEX ix_tracked_creators_user_id ON tracked_creators(user_id);
CREATE INDEX ix_tracked_creators_channel_id ON tracked_creators(channel_id);

CREATE TABLE tracked_creator_snapshots (
    id SERIAL PRIMARY KEY,
    tracked_creator_id INTEGER NOT NULL REFERENCES tracked_creators(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscriber_count INTEGER,
    view_count INTEGER,
    video_count INTEGER,
    available_metrics JSON NOT NULL DEFAULT '[]'::json,
    source VARCHAR(40) NOT NULL DEFAULT 'youtube_data_api_public',
    CONSTRAINT uq_tracked_creator_snapshot_time UNIQUE(tracked_creator_id, observed_at)
);
CREATE INDEX ix_tracked_creator_snapshots_tracked_creator_id ON tracked_creator_snapshots(tracked_creator_id);
CREATE INDEX ix_tracked_creator_snapshots_observed_at ON tracked_creator_snapshots(observed_at);

CREATE TABLE tracked_creator_videos (
    id SERIAL PRIMARY KEY,
    tracked_creator_id INTEGER NOT NULL REFERENCES tracked_creators(id) ON DELETE CASCADE,
    video_id VARCHAR(80) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url VARCHAR(1000),
    video_url VARCHAR(500) NOT NULL,
    channel_id VARCHAR(80),
    channel_title VARCHAR(250),
    published_at TIMESTAMPTZ,
    duration VARCHAR(40),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tracked_creator_video UNIQUE(tracked_creator_id, video_id)
);
CREATE INDEX ix_tracked_creator_videos_tracked_creator_id ON tracked_creator_videos(tracked_creator_id);
CREATE INDEX ix_tracked_creator_videos_video_id ON tracked_creator_videos(video_id);

CREATE TABLE tracked_creator_video_snapshots (
    id SERIAL PRIMARY KEY,
    tracked_creator_video_id INTEGER NOT NULL REFERENCES tracked_creator_videos(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    available_metrics JSON NOT NULL DEFAULT '[]'::json,
    source VARCHAR(40) NOT NULL DEFAULT 'youtube_data_api_public',
    CONSTRAINT uq_tracked_video_snapshot_time UNIQUE(tracked_creator_video_id, observed_at)
);
CREATE INDEX ix_tracked_creator_video_snapshots_tracked_creator_video_id ON tracked_creator_video_snapshots(tracked_creator_video_id);
CREATE INDEX ix_tracked_creator_video_snapshots_observed_at ON tracked_creator_video_snapshots(observed_at);
