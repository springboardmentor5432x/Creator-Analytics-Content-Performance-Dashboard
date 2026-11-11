"""Add persistent creator-owned report schedules."""

from alembic import op
import sqlalchemy as sa


revision = "20261105_04"
down_revision = "20261031_03"
branch_labels = None
depends_on = None


def _table_names() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "report_schedules" in _table_names():
        return
    op.create_table(
        "report_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "creator_profile_id",
            sa.Integer(),
            sa.ForeignKey("creator_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_type", sa.String(length=50), nullable=False, server_default="performance"),
        sa.Column("format", sa.String(length=10), nullable=False, server_default="PDF"),
        sa.Column("cadence", sa.String(length=12), nullable=False, server_default="weekly"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_on", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_report_schedules_creator_profile_id", "report_schedules", ["creator_profile_id"])
    op.create_index("ix_report_schedules_next_run_on", "report_schedules", ["next_run_on"])


def downgrade() -> None:
    if "report_schedules" not in _table_names():
        return
    op.drop_index("ix_report_schedules_next_run_on", table_name="report_schedules")
    op.drop_index("ix_report_schedules_creator_profile_id", table_name="report_schedules")
    op.drop_table("report_schedules")
