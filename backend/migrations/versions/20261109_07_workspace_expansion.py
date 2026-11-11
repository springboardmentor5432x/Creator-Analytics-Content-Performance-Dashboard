"""CreatorIQ 1.0 workspace expansion.

Additive migration: existing creator data is preserved. New columns receive
safe server defaults so an upgraded database keeps working before the first
write from the new API.
"""

from alembic import op
import sqlalchemy as sa


revision = "20261109_07"
down_revision = "20261106_06"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    if table_name not in _tables():
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


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


def _add_index(table_name: str, index_name: str, columns: list[str]) -> None:
    inspector = sa.inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return
    existing = {index["name"] for index in inspector.get_indexes(table_name)}
    if index_name not in existing:
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    # --- users -----------------------------------------------------------
    _add_columns("users", [
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("address", sa.String(length=300), nullable=True),
        sa.Column("timezone", sa.String(length=60), nullable=False, server_default="UTC"),
        sa.Column("date_format", sa.String(length=20), nullable=False, server_default="DD/MM/YYYY"),
        sa.Column("notification_preferences", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    ])

    # --- creator profiles ------------------------------------------------
    _add_columns("creator_profiles", [
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("social_links", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    ])

    # --- agency profiles -------------------------------------------------
    _add_columns("agency_profiles", [
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("business_email", sa.String(length=255), nullable=True),
        sa.Column("contact_number", sa.String(length=40), nullable=True),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("address", sa.String(length=300), nullable=True),
    ])

    # --- revenue ---------------------------------------------------------
    _add_columns("revenue_records", [
        sa.Column("brand", sa.String(length=160), nullable=True),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="paid"),
        sa.Column("source_type", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    ])

    # --- notifications ---------------------------------------------------
    if "notifications" in _tables():
        if "user_id" not in _columns("notifications"):
            if _is_sqlite():
                # SQLite cannot add a foreign key without rebuilding the table;
                # the ORM and API enforce ownership, and fresh databases get
                # the real constraint from Base.metadata.create_all.
                with op.batch_alter_table("notifications") as batch_op:
                    batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
            else:
                op.add_column(
                    "notifications",
                    sa.Column(
                        "user_id",
                        sa.Integer(),
                        sa.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=True,
                    ),
                )
        _add_columns("notifications", [
            sa.Column("link", sa.String(length=120), nullable=True),
        ])
        if "creator_profile_id" in _columns("notifications"):
            with op.batch_alter_table("notifications") as batch_op:
                batch_op.alter_column(
                    "creator_profile_id",
                    existing_type=sa.Integer(),
                    nullable=True,
                )
        _add_index("notifications", "ix_notifications_user_id", ["user_id"])

    # --- reports ---------------------------------------------------------
    if "reports" in _tables():
        if "agency_user_id" not in _columns("reports"):
            if _is_sqlite():
                with op.batch_alter_table("reports") as batch_op:
                    batch_op.add_column(sa.Column("agency_user_id", sa.Integer(), nullable=True))
            else:
                op.add_column(
                    "reports",
                    sa.Column(
                        "agency_user_id",
                        sa.Integer(),
                        sa.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=True,
                    ),
                )
        _add_columns("reports", [
            sa.Column("platform", sa.String(length=40), nullable=True),
            sa.Column("start_date", sa.Date(), nullable=True),
            sa.Column("end_date", sa.Date(), nullable=True),
        ])
        if "creator_profile_id" in _columns("reports"):
            with op.batch_alter_table("reports") as batch_op:
                batch_op.alter_column(
                    "creator_profile_id",
                    existing_type=sa.Integer(),
                    nullable=True,
                )
        _add_index("reports", "ix_reports_agency_user_id", ["agency_user_id"])

    # --- workspace access ------------------------------------------------
    _add_columns("workspace_access", [
        sa.Column("requested_permissions", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("granted_permissions", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("access_count", sa.Integer(), nullable=False, server_default="0"),
    ])

    # --- new tables ------------------------------------------------------
    if "audit_logs" not in _tables():
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "actor_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("actor_email", sa.String(length=255), nullable=True),
            sa.Column("actor_role", sa.String(length=30), nullable=True),
            sa.Column("action", sa.String(length=80), nullable=False),
            sa.Column("target_type", sa.String(length=50), nullable=True),
            sa.Column("target_id", sa.Integer(), nullable=True),
            sa.Column("details", sa.JSON(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        _add_index("audit_logs", "ix_audit_logs_actor_user_id", ["actor_user_id"])
        _add_index("audit_logs", "ix_audit_logs_action", ["action"])
        _add_index("audit_logs", "ix_audit_logs_target_type", ["target_type"])
        _add_index("audit_logs", "ix_audit_logs_created_at", ["created_at"])

    if "agency_team_members" not in _tables():
        op.create_table(
            "agency_team_members",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "agency_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "member_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=120), nullable=False),
            sa.Column("role", sa.String(length=40), nullable=False, server_default="viewer"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="invited"),
            sa.Column(
                "invited_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("agency_user_id", "email", name="uq_agency_team_email"),
        )
        _add_index("agency_team_members", "ix_agency_team_members_agency_user_id", ["agency_user_id"])
        _add_index("agency_team_members", "ix_agency_team_members_member_user_id", ["member_user_id"])

    if "campaigns" not in _tables():
        op.create_table(
            "campaigns",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "agency_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("brand", sa.String(length=160), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("start_date", sa.Date(), nullable=True),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("budget", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
            sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
            sa.Column("platforms", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
            sa.Column("objectives", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        _add_index("campaigns", "ix_campaigns_agency_user_id", ["agency_user_id"])

    if "campaign_creators" not in _tables():
        op.create_table(
            "campaign_creators",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "campaign_id",
                sa.Integer(),
                sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "creator_profile_id",
                sa.Integer(),
                sa.ForeignKey("creator_profiles.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="assigned"),
            sa.Column("notes", sa.String(length=300), nullable=True),
            sa.Column(
                "assigned_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.UniqueConstraint("campaign_id", "creator_profile_id", name="uq_campaign_creator"),
        )
        _add_index("campaign_creators", "ix_campaign_creators_campaign_id", ["campaign_id"])
        _add_index("campaign_creators", "ix_campaign_creators_creator_profile_id", ["creator_profile_id"])


def downgrade() -> None:
    for table_name in ("campaign_creators", "campaigns", "agency_team_members", "audit_logs"):
        if table_name in _tables():
            op.drop_table(table_name)
    # Columns are intentionally not dropped in downgrade: this migration is
    # additive and restoring the previous revision must never destroy data.
