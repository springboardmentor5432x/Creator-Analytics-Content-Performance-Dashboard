from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

# SQLite needs check_same_thread=False when used with FastAPI; PostgreSQL uses connection pooling.
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 20}
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
    )
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db(target_engine=None):
    """Safely creates missing tables and applies non-destructive column additions."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    try:
        inspector = inspect(eng)
        table_names = inspector.get_table_names()
        if "audience_metrics" in table_names:
            cols = [c["name"] for c in inspector.get_columns("audience_metrics")]
            if "device_distribution" not in cols:
                with eng.connect() as conn:
                    conn.execute(text("ALTER TABLE audience_metrics ADD COLUMN device_distribution JSON"))
                    conn.commit()

        if "social_connections" in table_names:
            cols = [c["name"] for c in inspector.get_columns("social_connections")]
            for col_name, col_type in [
                ("external_id", "VARCHAR(100)"),
                ("sync_status", "VARCHAR(30)"),
                ("last_synced_at", "DATETIME"),
                ("metadata_json", "JSON"),
            ]:
                if col_name not in cols:
                    with eng.connect() as conn:
                        conn.execute(text(f"ALTER TABLE social_connections ADD COLUMN {col_name} {col_type}"))
                        conn.commit()

        if "campaigns" in table_names:
            cols = [c["name"] for c in inspector.get_columns("campaigns")]
            for col_name, col_type in [
                ("brand_id", "INTEGER REFERENCES brands(id) ON DELETE SET NULL"),
                ("objective", "VARCHAR(150) DEFAULT 'Brand Awareness'"),
                ("updated_at", "DATETIME"),
            ]:
                if col_name not in cols:
                    with eng.connect() as conn:
                        conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_type}"))
                        conn.commit()

        for tname in ("brands", "campaign_creators", "sponsorships", "campaign_performances", "revenue_records"):
            if tname in table_names:
                tcols = [c["name"] for c in inspector.get_columns(tname)]
                if "is_archived" not in tcols:
                    with eng.connect() as conn:
                        conn.execute(text(f"ALTER TABLE {tname} ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
                        conn.commit()
    except Exception:
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
