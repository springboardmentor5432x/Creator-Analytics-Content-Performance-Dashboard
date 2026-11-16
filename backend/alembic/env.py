import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.database import Base
from app import models  # Ensures all 16 models are registered with Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Resolve target database URL in order of priority:
# 1. Alembic CLI parameter: -x db_url=...
# 2. Environment variable: DATABASE_URL
# 3. Application settings: settings.DATABASE_URL
x_args = context.get_x_argument(as_dictionary=True)
db_url = (
    x_args.get("db_url")
    or os.environ.get("DATABASE_URL")
    or config.get_main_option("sqlalchemy.url")
    or settings.DATABASE_URL
)

# Replace placeholder url if found
if "driver://user:pass@localhost/dbname" in db_url:
    db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL

config.set_main_option("sqlalchemy.url", db_url)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = config.attributes.get("connection", None)
    if connectable is None:
        section = config.get_section(config.config_ini_section, {})
        section["sqlalchemy.url"] = config.get_main_option("sqlalchemy.url")

        # SQLite specific connect args
        connect_args = {}
        if section["sqlalchemy.url"].startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        connectable = engine_from_config(
            section,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            connect_args=connect_args,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Enables non-locking schema updates on SQLite
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
