# CreatorIQ — PostgreSQL & Alembic Database Migration Guide

**Document Version:** 1.0.0 (Phase 7.7)  
**Target Database Engines:** SQLite 3 (Development) / PostgreSQL 15 & 16 (Production)  
**ORM & Migration Tooling:** SQLAlchemy 2.0 & Alembic 1.20+

---

## 1. Overview & Architecture

CreatorIQ uses SQLAlchemy 2.0 Declarative Models paired with Alembic for version-controlled, repeatable database migrations. 

The schema consists of **16 core models** supporting multi-platform analytics, creator management, financial contracts, and campaign ROI:
1. `users`: Multi-role user accounts (`creator`, `agency`, `marketing`, `admin`).
2. `activities`: Audit trail logs of system and user events.
3. `agency_creators`: Agency-to-creator roster relationships and commission terms.
4. `audience_metrics`: Platform demographic snapshots (age, gender, country geo, devices, active hours).
5. `brands`: Partner advertisers and campaign sponsors.
6. `campaigns`: Marketing campaigns, objectives, budgets, spent, and date windows.
7. `campaign_creators`: Creator assignments, agreed compensations, and deliverables.
8. `sponsorships`: Sponsorship contracts, payment due dates, and payment milestones.
9. `campaign_performances`: Verified performance milestones, impressions, reach, engagements, and attributable revenue.
10. `content_records`: Multi-platform content pieces and engagement metrics.
11. `follower_growth`: Daily follower count and historical reach timeline.
12. `hashtag_metrics`: Platform tag aggregations and average reach.
13. `notifications`: In-app notification messages and read statuses.
14. `oauth_states`: CSRF OAuth state nonce tokens with atomic one-time replay prevention.
15. `revenue_records`: Multi-platform revenue transactions across sponsorships, ad revenue, affiliates.
16. `social_connections`: OAuth tokens, external platform IDs, and synchronization statuses.

---

## 2. Alembic Configuration

- **`backend/alembic.ini`**: Root configuration specifying script location, revision file naming, and path conventions.
- **`backend/alembic/env.py`**:
  - Dynamically detects target database URL with fallback order:
    1. CLI parameter: `-x db_url=...`
    2. Environment variable: `DATABASE_URL`
    3. Application settings: `settings.DATABASE_URL`
  - Automatically loads all 16 models into `Base.metadata`.
  - Configures `render_as_batch=True` to support SQLite non-destructive table alterations.
- **`backend/alembic/versions/`**: Holds version-controlled migration scripts.
  - Initial Migration: `bf99066e2f2c_initial_schema_all_16_models.py`.

---

## 3. Database URL Configuration

CreatorIQ dynamically adjusts engine connection pooling based on the connection dialect:

```python
# SQLite (Development)
DATABASE_URL="sqlite:///./creatoriq.db"

# PostgreSQL (Production / AWS RDS)
DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@HOST:5432/creatoriq"
```

When connecting to PostgreSQL:
- `pool_pre_ping=True` pings the connection before checkout to prevent stale socket errors.
- Connection pooling is automatically enabled with `pool_size=10` and `max_overflow=20`.

---

## 4. Step-by-Step SQLite to PostgreSQL Migration

Follow these steps when provisioning a fresh PostgreSQL database (e.g. AWS RDS PostgreSQL or Docker):

### Step 1: Provision the PostgreSQL Database
Create a database named `creatoriq` with UTF-8 encoding:
```sql
CREATE DATABASE creatoriq WITH ENCODING 'UTF8';
```

### Step 2: Apply Schema via Alembic
Run Alembic upgrade to create all 16 tables, primary keys, foreign keys, unique constraints, and indexes natively in PostgreSQL:
```bash
cd backend
export DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@HOST:5432/creatoriq"
alembic upgrade head
```

### Step 3: Transfer Data Using the Migration Script
CreatorIQ provides a dedicated topological data migration script (`backend/scripts/migrate_sqlite_to_pg.py`):
```bash
export SQLITE_URL="sqlite:///./creatoriq.db"
export TARGET_DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@HOST:5432/creatoriq"

# Optional: Run in dry-run mode first to verify records
python -m scripts.migrate_sqlite_to_pg --dry-run

# Run real migration
python -m scripts.migrate_sqlite_to_pg
```

The script:
1. Transfers rows in strict dependency order (parents before children).
2. Preserves existing primary key IDs and foreign key references.
3. Automatically resets PostgreSQL serial sequences via `pg_get_serial_sequence` so subsequent `INSERT` operations continue from `MAX(id) + 1`.

---

## 5. Backup & Restore Procedures

### 5.1 SQLite (Development / Staging)
- **Backup**:
  ```bash
  sqlite3 creatoriq.db ".backup 'creatoriq_backup_$(date +%Y%m%d).db'"
  ```
- **Restore**:
  ```bash
  cp creatoriq_backup_20261103.db creatoriq.db
  ```

### 5.2 PostgreSQL (Production / AWS RDS)
- **Backup (Custom Compressed Format)**:
  ```bash
  pg_dump -Fc -v -h $DB_HOST -U $DB_USER -d creatoriq -f "creatoriq_backup_$(date +%Y%m%d).dump"
  ```
- **Backup (Plain SQL Format)**:
  ```bash
  pg_dump -v -h $DB_HOST -U $DB_USER -d creatoriq -f "creatoriq_backup_$(date +%Y%m%d).sql"
  ```
- **Restore**:
  ```bash
  pg_restore -v -c -h $DB_HOST -U $DB_USER -d creatoriq "creatoriq_backup_$(date +%Y%m%d).dump"
  ```

---

## 6. Financial Precision & Type Safety

1. **Python Decimal Calculation**:
   All ROI, ROAS, CPM, CPE, CTR, and Conversion calculations in `roi_engine.py` convert inputs using `to_decimal()` and evaluate arithmetic using Python's `Decimal` type with `ROUND_HALF_UP` rounding.
2. **PostgreSQL Column Type Recommendation**:
   While `Float` is supported across both engines, production PostgreSQL tables can optionally migrate financial columns (`budget`, `spent`, `agreed_compensation`, `amount`, `revenue`) to `NUMERIC(14, 2)` via Alembic for strict on-disk database constraints.

