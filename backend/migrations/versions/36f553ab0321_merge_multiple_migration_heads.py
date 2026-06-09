"""merge multiple migration heads

Revision ID: 36f553ab0321
Revises: 3fb124d584b4, 59ff338bf471
Create Date: 2026-03-28 23:27:49.619831

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '36f553ab0321'
down_revision = ('3fb124d584b4', '59ff338bf471')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
