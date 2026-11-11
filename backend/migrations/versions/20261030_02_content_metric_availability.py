"""Track which daily content metrics were actually reported by providers."""

from alembic import op
import sqlalchemy as sa

revision = "20261030_02"
down_revision = "20261030_01"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    return column in {
        item["name"] for item in sa.inspect(op.get_bind()).get_columns(table)
    }


def upgrade() -> None:
    default = sa.text("'[]'")
    for table in ("content_metrics", "audience_insights"):
        if not _has_column(table, "metrics_available"):
            op.add_column(
                table,
                sa.Column(
                    "metrics_available",
                    sa.JSON(),
                    nullable=False,
                    server_default=default,
                ),
            )


def downgrade() -> None:
    for table in ("audience_insights", "content_metrics"):
        if _has_column(table, "metrics_available"):
            with op.batch_alter_table(table) as batch_op:
                batch_op.drop_column("metrics_available")
