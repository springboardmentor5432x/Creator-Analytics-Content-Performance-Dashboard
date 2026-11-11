"""Persist report windows and generated report data."""

from alembic import op
import sqlalchemy as sa


revision = "20261106_06"
down_revision = "20261105_05"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    # Defaults make this safe for existing reports: they retain the historic
    # 30-day download behavior until the next report is generated.
    for table_name in ("reports", "report_schedules"):
        if table_name in sa.inspect(op.get_bind()).get_table_names() and "days" not in _columns(table_name):
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.add_column(sa.Column("days", sa.Integer(), nullable=False, server_default="30"))
    if "reports" in sa.inspect(op.get_bind()).get_table_names() and "rows" not in _columns("reports"):
        with op.batch_alter_table("reports") as batch_op:
            batch_op.add_column(sa.Column("rows", sa.JSON(), nullable=True))


def downgrade() -> None:
    for table_name in ("reports", "report_schedules"):
        if table_name in sa.inspect(op.get_bind()).get_table_names() and "days" in _columns(table_name):
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.drop_column("days")
    if "reports" in sa.inspect(op.get_bind()).get_table_names() and "rows" in _columns("reports"):
        with op.batch_alter_table("reports") as batch_op:
            batch_op.drop_column("rows")
