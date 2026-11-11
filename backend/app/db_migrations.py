"""Apply pending Alembic migrations during application startup.

``Base.metadata.create_all`` creates missing tables but never alters existing
ones. Running the checked-in migrations as part of startup keeps deployed
databases compatible with the current models, so an older local database cannot
crash the report scheduler with a missing-column error.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    # Startup migrations must not replace uvicorn's logging configuration.
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")
