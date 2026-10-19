
-- CreatorIQ: Creator Analytics & Content Performance Dashboard
-- PostgreSQL schema aligned with mentor's 11-table design

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'creator'
        CHECK (role IN ('creator', 'agency', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE creators (
    creator_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE
        REFERENCES users(user_id) ON DELETE CASCADE,
    creator_name VARCHAR(150) NOT NULL,
    bio TEXT,
    profile_image VARCHAR(500),
    website VARCHAR(255),
    location VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_accounts (
    account_id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL
        REFERENCES creators(creator_id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    username VARCHAR(150),
    platform_user_id VARCHAR(200),
    followers BIGINT NOT NULL DEFAULT 0 CHECK (followers >= 0),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL
        REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    platform_post_id VARCHAR(200),
    content_type VARCHAR(50),
    caption TEXT,
    hashtags TEXT,
    thumbnail_url TEXT,
    post_url TEXT,
    published_at TIMESTAMP,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_analytics (
    analytics_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL UNIQUE
        REFERENCES posts(post_id) ON DELETE CASCADE,
    views BIGINT NOT NULL DEFAULT 0 CHECK (views >= 0),
    likes BIGINT NOT NULL DEFAULT 0 CHECK (likes >= 0),
    comments BIGINT NOT NULL DEFAULT 0 CHECK (comments >= 0),
    shares BIGINT NOT NULL DEFAULT 0 CHECK (shares >= 0),
    saves BIGINT NOT NULL DEFAULT 0 CHECK (saves >= 0),
    reach BIGINT NOT NULL DEFAULT 0 CHECK (reach >= 0),
    impressions BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    watch_time DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (watch_time >= 0),
    engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (engagement_rate >= 0),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audience_analytics (
    audience_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL
        REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    followers BIGINT NOT NULL DEFAULT 0 CHECK (followers >= 0),
    following BIGINT NOT NULL DEFAULT 0 CHECK (following >= 0),
    impressions BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    reach BIGINT NOT NULL DEFAULT 0 CHECK (reach >= 0),
    profile_visits BIGINT NOT NULL DEFAULT 0 CHECK (profile_visits >= 0),
    male_percentage DOUBLE PRECISION
        CHECK (male_percentage BETWEEN 0 AND 100),
    female_percentage DOUBLE PRECISION
        CHECK (female_percentage BETWEEN 0 AND 100),
    top_location VARCHAR(150),
    active_hours JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, date)
);

CREATE TABLE platform_stats (
    stat_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL
        REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_posts INTEGER NOT NULL DEFAULT 0 CHECK (total_posts >= 0),
    total_views BIGINT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    total_likes BIGINT NOT NULL DEFAULT 0 CHECK (total_likes >= 0),
    total_comments BIGINT NOT NULL DEFAULT 0 CHECK (total_comments >= 0),
    total_shares BIGINT NOT NULL DEFAULT 0 CHECK (total_shares >= 0),
    follower_gain BIGINT NOT NULL DEFAULT 0,
    engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (engagement_rate >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, date)
);

CREATE TABLE revenue (
    revenue_id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL
        REFERENCES creators(creator_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    source VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL
        REFERENCES creators(creator_id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_reports (
    saved_report_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common lookup and dashboard queries.
-- Primary-key and UNIQUE indexes are created automatically by PostgreSQL.

CREATE INDEX idx_posts_account_published
    ON posts(account_id, published_at);

CREATE INDEX idx_revenue_creator_date
    ON revenue(creator_id, date);

CREATE INDEX idx_notifications_user_read
    ON notifications(user_id, is_read);
