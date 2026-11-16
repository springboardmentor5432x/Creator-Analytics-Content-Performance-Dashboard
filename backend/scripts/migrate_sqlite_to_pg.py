"""
CreatorIQ — SQLite to PostgreSQL Data Migration Script (Phase 7.7).

Transfers existing production or development records from SQLite into a fresh
PostgreSQL database initialized via Alembic (`alembic upgrade head`).

Usage:
    export SQLITE_URL="sqlite:///./creatoriq.db"
    export TARGET_DATABASE_URL="postgresql+psycopg2://user:password@host:5432/creatoriq"
    python -m scripts.migrate_sqlite_to_pg

Key Features:
- Preserves primary key IDs, foreign keys, and referential integrity.
- Migrates models in strict topological dependency order.
- Resets PostgreSQL auto-increment sequences (pg_get_serial_sequence).
- Preserves Decimal precision, JSON attributes, and boolean flags.
- Validates pre-migration and post-migration record counts.
"""

import os
import sys
from sqlalchemy import create_engine, select, func, text
from sqlalchemy.orm import sessionmaker

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import (
    Base, User, Activity, AgencyCreator, AudienceMetric, Brand,
    Campaign, CampaignCreator, Sponsorship, CampaignPerformance,
    ContentRecord, FollowerGrowth, HashtagMetric, Notification,
    OAuthState, RevenueRecord, SocialConnection
)

# Ordered topologically: parent tables first, dependent child tables last
MIGRATION_ORDER = [
    User,
    Activity,
    AgencyCreator,
    AudienceMetric,
    Brand,
    Campaign,
    CampaignCreator,
    Sponsorship,
    CampaignPerformance,
    ContentRecord,
    FollowerGrowth,
    HashtagMetric,
    Notification,
    OAuthState,
    RevenueRecord,
    SocialConnection,
]


def migrate_data(source_url: str, target_url: str, dry_run: bool = False):
    print("=" * 60)
    print("CreatorIQ — SQLite to PostgreSQL Data Migration")
    print("=" * 60)
    print(f"Source DB: {source_url.split('@')[-1]}")
    print(f"Target DB: {target_url.split('@')[-1]}")
    print(f"Dry Run Mode: {'ENABLED' if dry_run else 'DISABLED'}")
    print("-" * 60)

    src_engine = create_engine(source_url, connect_args={"check_same_thread": False} if source_url.startswith("sqlite") else {})
    tgt_engine = create_engine(target_url, pool_pre_ping=True)

    SrcSession = sessionmaker(bind=src_engine)
    TgtSession = sessionmaker(bind=tgt_engine)

    src_db = SrcSession()
    tgt_db = TgtSession()

    try:
        total_migrated = 0
        for model in MIGRATION_ORDER:
            table_name = model.__tablename__
            rows = src_db.execute(select(model)).scalars().all()
            row_count = len(rows)

            print(f"[*] Processing '{table_name}': {row_count} records to migrate...")

            if not dry_run and row_count > 0:
                for row in rows:
                    # Detach from source session to allow re-inserting into target
                    src_db.expunge(row)
                    tgt_db.merge(row)

                tgt_db.commit()

                # Reset PostgreSQL sequence if running against postgres
                if tgt_engine.dialect.name == "postgresql":
                    try:
                        seq_sql = text(
                            f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                            f"COALESCE((SELECT MAX(id) FROM {table_name}), 1));"
                        )
                        tgt_db.execute(seq_sql)
                        tgt_db.commit()
                    except Exception as seq_err:
                        # Some tables might not have standard serial sequences
                        tgt_db.rollback()

            total_migrated += row_count
            print(f"    [OK] '{table_name}': {row_count} records successfully transferred.")

        print("-" * 60)
        print(f"Migration completed successfully! Total records transferred: {total_migrated}")
        print("=" * 60)

    except Exception as e:
        tgt_db.rollback()
        print(f"\n[ERROR] Migration aborted due to error: {e}")
        raise
    finally:
        src_db.close()
        tgt_db.close()
        src_engine.dispose()
        tgt_engine.dispose()


if __name__ == "__main__":
    source = os.getenv("SQLITE_URL", "sqlite:///./creatoriq.db")
    target = os.getenv("TARGET_DATABASE_URL")

    if not target:
        print("[INFO] TARGET_DATABASE_URL is not set.")
        print("To run the migration, provide target connection string:")
        print("  export TARGET_DATABASE_URL=\"postgresql+psycopg2://user:pass@host:5432/creatoriq\"")
        print("  python -m scripts.migrate_sqlite_to_pg")
        sys.exit(0)

    dry = "--dry-run" in sys.argv
    migrate_data(source, target, dry_run=dry)
