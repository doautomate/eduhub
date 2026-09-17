"""add academic profile fields (board, board_other, standard)

Revision ID: 7a1c9e2f5b3d
Revises: 3f9a2c6b1d40
Create Date: 2026-09-14 22:03:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7a1c9e2f5b3d'
down_revision: str | None = '3f9a2c6b1d40'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Additive, nullable columns only - no backfill (009-profile-onboarding-setup,
    # FR-012/research.md "Migration strategy for existing users"). Pre-existing users
    # are intentionally left with NULL board/standard so they are treated as
    # first-time users and forced through the setup step, the same as brand-new users.
    op.add_column('users', sa.Column('board', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('board_other', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('standard', sa.String(length=4), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'standard')
    op.drop_column('users', 'board_other')
    op.drop_column('users', 'board')
