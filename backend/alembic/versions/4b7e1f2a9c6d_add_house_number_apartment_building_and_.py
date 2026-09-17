"""add house_number/apartment_building to users; add profile-change audit event types

Revision ID: 4b7e1f2a9c6d
Revises: 7a1c9e2f5b3d
Create Date: 2026-09-16 22:10:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4b7e1f2a9c6d'
down_revision: str | None = '7a1c9e2f5b3d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# New AuditEventType members introduced by 013-profile-popover-management (FR-021). Plain
# text (not encrypted) per data-model.md - only the enum LABELS are added here; no table
# rows are backfilled since these are only ever produced by new code paths going forward.
_NEW_AUDIT_EVENT_TYPES = (
    "profile_mobile_number_changed",
    "profile_address_changed",
    "profile_academic_profile_changed",
)


def upgrade() -> None:
    # Additive, nullable columns only - no backfill (FR-019/FR-011): pre-existing users
    # are left with NULL house_number/apartment_building until they explicitly supply one.
    op.add_column('users', sa.Column('house_number', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('apartment_building', sa.String(length=150), nullable=True))

    # `ALTER TYPE ... ADD VALUE` cannot run inside the same transaction as a statement that
    # uses the new value, but can run as its own statement on PostgreSQL 12+. SQLite (used
    # by the test suite via `Base.metadata.create_all`, not this migration) has no native
    # enum type, so this step is a no-op there and is guarded accordingly.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for value in _NEW_AUDIT_EVENT_TYPES:
            op.execute(f"ALTER TYPE auditeventtype ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL does not support removing a value from an enum type without recreating
    # it; downgrading the enum is intentionally a no-op (consistent with how this project
    # has already handled enum growth for AuditEventType in prior features). The two new
    # columns are safely reversible.
    op.drop_column('users', 'apartment_building')
    op.drop_column('users', 'house_number')
