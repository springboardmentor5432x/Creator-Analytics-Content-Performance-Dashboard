"""milestone 2 analytics schema

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. social_accounts
    op.create_table(
        'social_accounts',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('platform_user_id', sa.String(length=255), nullable=False),
        sa.Column('followers', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('connected_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['creator_id'], ['creators.creator_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('account_id'),
        sa.UniqueConstraint('platform', 'platform_user_id', name='uq_social_platform_user')
    )

    # 2. posts
    op.create_table(
        'posts',
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('platform_post_id', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('hashtags', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=255), nullable=True),
        sa.Column('post_url', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['social_accounts.account_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('post_id'),
        sa.UniqueConstraint('account_id', 'platform_post_id', name='uq_account_platform_post')
    )

    # 3. post_analytics
    op.create_table(
        'post_analytics',
        sa.Column('analytics_id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('views', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('likes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('comments', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('shares', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('saves', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reach', sa.BigInteger(), nullable=True),
        sa.Column('impressions', sa.BigInteger(), nullable=True),
        sa.Column('watch_time', sa.Float(), nullable=True),
        sa.Column('engagement_rate', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['posts.post_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('analytics_id'),
        sa.UniqueConstraint('post_id')
    )

    # 4. audience_analytics
    op.create_table(
        'audience_analytics',
        sa.Column('audience_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('followers', sa.Integer(), nullable=True),
        sa.Column('following', sa.Integer(), nullable=True),
        sa.Column('impressions', sa.BigInteger(), nullable=True),
        sa.Column('reach', sa.BigInteger(), nullable=True),
        sa.Column('profile_visits', sa.Integer(), nullable=True),
        sa.Column('male_percentage', sa.Float(), nullable=True),
        sa.Column('female_percentage', sa.Float(), nullable=True),
        sa.Column('top_location', sa.String(length=100), nullable=True),
        sa.Column('active_hours', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['social_accounts.account_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('audience_id'),
        sa.UniqueConstraint('account_id', 'date', name='uq_account_audience_date')
    )


def downgrade() -> None:
    op.drop_table('audience_analytics')
    op.drop_table('post_analytics')
    op.drop_table('posts')
    op.drop_table('social_accounts')
