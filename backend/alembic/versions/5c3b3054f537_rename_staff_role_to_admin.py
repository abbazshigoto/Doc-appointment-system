"""rename staff role to admin

Revision ID: 5c3b3054f537
Revises: 062755535f20
Create Date: 2026-08-04 21:21:54.364178

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c3b3054f537'
down_revision: Union[str, None] = '062755535f20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role RENAME VALUE 'staff' TO 'admin'")


def downgrade() -> None:
    op.execute("ALTER TYPE user_role RENAME VALUE 'admin' TO 'staff'")
