"""Add PKCE code_verifier to oauth_states.

Additive migration: existing rows keep working (the new column is nullable) and
the Twitter/X OAuth login route can now persist the PKCE code_verifier
alongside the one-time state for callback verification.
"""
from alembic import op
import sqlalchemy as sa


revision = "20261110_08"
down_revision = "20261109_07"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    if table_name not in _tables():
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _add_columns(table_name: str, columns: list[sa.Column]) -> None:
    if table_name not in _tables():
        return
    existing = _columns(table_name)
    missing = [column for column in columns if column.name not in existing]
    if not missing:
        return
    with op.batch_alter_table(table_name) as batch_op:
        for column in missing:
            batch_op.add_column(column)


def upgrade() -> None:
    _add_columns(
        "oauth_states",
        [sa.Column("code_verifier", sa.String(length=128), nullable=True)],
    )


def downgrade() -> None:
    # Column is intentionally not dropped: this migration is additive and
    # restoring the previous revision must never destroy data.
    pass
