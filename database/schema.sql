-- =====================================================================
-- CreatorIQ - Full database schema (PostgreSQL)
-- Based on the mentor's "Final Database Structure" reference.
-- Sections: A = tables from the reference, B = additions needed by the spec.
-- Module 1 uses: users, creators, agencies, agency_creators.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. TABLES FROM THE REFERENCE
-- ---------------------------------------------------------------------

CREATE TABLE users (
    user_id        SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(50)  NOT NULL
                   CHECK (role IN ('creator', 'agency', 'marketing_team', 'admin')),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE creators (
    creator_id     SERIAL PRIMARY KEY,
    user_id        INTEGER      NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    creator_name   VARCHAR(100),
    bio            TEXT,
    profile_image  VARCHAR(255),
    website        VARCHAR(255),
    location       VARCHAR(100),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE social_accounts (
    account_id        SERIAL PRIMARY KEY,
    creator_id        INTEGER      NOT NULL REFERENCES creators(creator_id) ON DELETE CASCADE,
    platform          VARCHAR(50)  NOT NULL,          -- youtube, instagram, tiktok, facebook, x, linkedin
    username          VARCHAR(100),
    platform_user_id  VARCHAR(255) NOT NULL,
    followers         INTEGER      NOT NULL DEFAULT 0,
    access_token      TEXT,                           -- store encrypted
    refresh_token     TEXT,                           -- store encrypted
    token_expires_at  TIMESTAMP,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    connected_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (platform, platform_user_id)
);

CREATE TABLE posts (
    post_id           SERIAL PRIMARY KEY,
    account_id        INTEGER      NOT NULL REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    platform_post_id  VARCHAR(255) NOT NULL,
    content_type      VARCHAR(50),                    -- video / image / reel / text
    caption           TEXT,
    hashtags          TEXT,
    thumbnail_url     VARCHAR(255),
    post_url          TEXT,
    published_at      TIMESTAMP,
    fetched_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, platform_post_id)
);

CREATE TABLE post_analytics (
    analytics_id     SERIAL PRIMARY KEY,
    post_id          INTEGER NOT NULL UNIQUE REFERENCES posts(post_id) ON DELETE CASCADE,
    views            BIGINT  NOT NULL DEFAULT 0,
    likes            INTEGER NOT NULL DEFAULT 0,
    comments         INTEGER NOT NULL DEFAULT 0,
    shares           INTEGER NOT NULL DEFAULT 0,
    saves            INTEGER NOT NULL DEFAULT 0,
    reach            BIGINT,
    impressions      BIGINT,
    watch_time       FLOAT,
    engagement_rate  FLOAT,
    recorded_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audience_analytics (
    audience_id        SERIAL PRIMARY KEY,
    account_id         INTEGER NOT NULL REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    date               DATE    NOT NULL,
    followers          INTEGER,
    following          INTEGER,
    impressions        BIGINT,
    reach              BIGINT,
    profile_visits     INTEGER,
    male_percentage    FLOAT,
    female_percentage  FLOAT,
    top_location       VARCHAR(100),
    active_hours       JSONB,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, date)
);

CREATE TABLE revenue (
    revenue_id   SERIAL PRIMARY KEY,
    creator_id   INTEGER        NOT NULL REFERENCES creators(creator_id) ON DELETE CASCADE,
    title        VARCHAR(255),
    source       VARCHAR(50)    NOT NULL
                 CHECK (source IN ('sponsorship', 'ad_revenue', 'affiliate', 'brand_deal', 'subscription')),
    amount       DECIMAL(12,2)  NOT NULL,
    currency     VARCHAR(10)    NOT NULL DEFAULT 'INR',
    date         DATE           NOT NULL,
    description  TEXT,
    created_at   TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    report_id     SERIAL PRIMARY KEY,
    creator_id    INTEGER      NOT NULL REFERENCES creators(creator_id) ON DELETE CASCADE,
    report_type   VARCHAR(50)  NOT NULL
                  CHECK (report_type IN ('monthly', 'audience', 'content', 'revenue', 'comparison')),
    file_path     VARCHAR(255),
    file_format   VARCHAR(10)  CHECK (file_format IN ('pdf', 'excel')),
    generated_at  TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    notification_id  SERIAL PRIMARY KEY,
    user_id          INTEGER     NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message          TEXT        NOT NULL,
    type             VARCHAR(50) NOT NULL DEFAULT 'info'
                     CHECK (type IN ('info', 'success', 'warning')),
    is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_reports (
    saved_report_id  SERIAL PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    filters          JSONB,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_stats (
    stat_id         SERIAL PRIMARY KEY,
    account_id      INTEGER NOT NULL REFERENCES social_accounts(account_id) ON DELETE CASCADE,
    date            DATE    NOT NULL,
    total_posts     INTEGER NOT NULL DEFAULT 0,
    total_views     BIGINT  NOT NULL DEFAULT 0,
    total_likes     INTEGER NOT NULL DEFAULT 0,
    total_comments  INTEGER NOT NULL DEFAULT 0,
    total_shares    INTEGER NOT NULL DEFAULT 0,
    follower_gain   INTEGER NOT NULL DEFAULT 0,
    engagement_rate FLOAT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, date)
);

-- ---------------------------------------------------------------------
-- B. ADDITIONS (not in the reference image, needed by the project spec)
-- ---------------------------------------------------------------------

-- Agency profile (Module 1: "Agency profile management")
CREATE TABLE agencies (
    agency_id    SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    agency_name  VARCHAR(150),
    description  TEXT,
    logo         VARCHAR(255),
    website      VARCHAR(255),
    location     VARCHAR(100),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Which creators an agency manages (many-to-many)
CREATE TABLE agency_creators (
    agency_id   INTEGER   NOT NULL REFERENCES agencies(agency_id) ON DELETE CASCADE,
    creator_id  INTEGER   NOT NULL REFERENCES creators(creator_id) ON DELETE CASCADE,
    added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (agency_id, creator_id)
);

-- ---------------------------------------------------------------------
-- C. INDEXES (foreign keys and common dashboard queries)
-- ---------------------------------------------------------------------
CREATE INDEX idx_social_accounts_creator   ON social_accounts(creator_id);
CREATE INDEX idx_posts_account_published   ON posts(account_id, published_at DESC);
CREATE INDEX idx_audience_account_date     ON audience_analytics(account_id, date DESC);
CREATE INDEX idx_revenue_creator_date      ON revenue(creator_id, date DESC);
CREATE INDEX idx_reports_creator           ON reports(creator_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_saved_reports_user        ON saved_reports(user_id);
CREATE INDEX idx_platform_stats_account    ON platform_stats(account_id, date DESC);
CREATE INDEX idx_agency_creators_creator   ON agency_creators(creator_id);
