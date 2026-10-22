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
