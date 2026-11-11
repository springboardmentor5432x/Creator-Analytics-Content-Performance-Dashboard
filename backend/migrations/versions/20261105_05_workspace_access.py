"""Add explicit creator-to-collaborator workspace access records."""

from alembic import op
import sqlalchemy as sa


revision = "20261105_05"
down_revision = "20261105_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "workspace_access" in inspector.get_table_names():
        return
    op.create_table(
        "workspace_access",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("creator_profile_id", sa.Integer(), sa.ForeignKey("creator_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("collaborator_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("collaborator_role", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("request_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("creator_profile_id", "collaborator_user_id", name="uq_workspace_access_creator_collaborator"),
    )
    op.create_index("ix_workspace_access_creator_profile_id", "workspace_access", ["creator_profile_id"])
    op.create_index("ix_workspace_access_collaborator_user_id", "workspace_access", ["collaborator_user_id"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "workspace_access" not in inspector.get_table_names():
        return
    op.drop_index("ix_workspace_access_collaborator_user_id", table_name="workspace_access")
    op.drop_index("ix_workspace_access_creator_profile_id", table_name="workspace_access")
    op.drop_table("workspace_access")
