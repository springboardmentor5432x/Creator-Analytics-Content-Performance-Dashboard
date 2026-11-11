
"""Repair missing public creator video-pagination columns."""

from alembic import op
import sqlalchemy as sa


revision = "20261031_03"
down_revision = "20261030_02"
branch_labels = None
depends_on = None


def _table_names():
    inspector = sa.inspect(op.get_bind())
    return set(inspector.get_table_names())


def _has_column(table: str, column: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    columns = inspector.get_columns(table)
    return any(item["name"] == column for item in columns)


def upgrade() -> None:
    # Do not modify anything if the table does not exist.
    if "tracked_creators" not in _table_names():
        return

    # Add missing pagination column.
    if not _has_column(
        "tracked_creators",
        "videos_next_page_token"
    ):
        op.add_column(
            "tracked_creators",
            sa.Column(
                "videos_next_page_token",
                sa.String(length=500),
                nullable=True
            )
        )

    # Add missing pagination status column.
    if not _has_column(
        "tracked_creators",
        "more_videos_available"
    ):
        op.add_column(
            "tracked_creators",
            sa.Column(
                "more_videos_available",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false()
            )
        )


def downgrade() -> None:
    if "tracked_creators" not in _table_names():
        return

    if _has_column(
        "tracked_creators",
        "more_videos_available"
    ):
        op.drop_column(
            "tracked_creators",
            "more_videos_available"
        )

    if _has_column(
        "tracked_creators",
        "videos_next_page_token"
    ):
        op.drop_column(
            "tracked_creators",
            "videos_next_page_token"
        )
