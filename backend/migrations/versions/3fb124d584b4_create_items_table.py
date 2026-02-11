"""create items table

Revision ID: 3fb124d584b4
Revises: 3e53bf73eeec
Create Date: 2026-01-21 21:59:20.047538

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3fb124d584b4'
down_revision = '3e53bf73eeec'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "items",
        sa.Column("id", sa.Integer(), primary_key=True),

        # Core identifiers (OTM required)
        sa.Column("item_gid", sa.String(length=255), nullable=False),
        sa.Column("item_xid", sa.String(length=255), nullable=False),
        sa.Column("domain_name", sa.String(length=255), nullable=False),
        sa.Column("item_name", sa.String(length=255)),

        # Full OTM payload
        sa.Column(
            "payload",
            postgresql.JSONB(),
            nullable=False
        ),

        # OTM Sync
        sa.Column(
            "otm_sync_status",
            sa.String(length=20),
            nullable=False,
            server_default="PENDING"
        ),
        sa.Column("otm_error", postgresql.JSONB()),

        # Audit
        sa.Column("created_by", sa.String(length=100)),
        sa.Column("updated_by", sa.String(length=100)),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now()
        ),

        # Constraints
        sa.UniqueConstraint("item_gid", name="uq_item_gid"),
        sa.UniqueConstraint("domain_name", "item_xid", name="uq_domain_xid"),
    )

    # Indexes
    op.create_index("ix_item_gid", "items", ["item_gid"])
    op.create_index("ix_item_xid", "items", ["item_xid"])
    op.create_index("ix_item_domain", "items", ["domain_name"])
    op.create_index("ix_item_sync_status", "items", ["otm_sync_status"])


def downgrade():
    op.drop_index("ix_item_sync_status", table_name="items")
    op.drop_index("ix_item_domain", table_name="items")
    op.drop_index("ix_item_xid", table_name="items")
    op.drop_index("ix_item_gid", table_name="items")
    op.drop_table("items")