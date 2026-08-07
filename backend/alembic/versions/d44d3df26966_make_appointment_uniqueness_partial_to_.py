"""make appointment uniqueness partial to confirmed only

Revision ID: d44d3df26966
Revises: 849b4ff772e4
Create Date: 2026-08-07 22:31:23.215722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd44d3df26966'
down_revision: Union[str, None] = '849b4ff772e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_appointment_doctor_start", "appointments", type_="unique")
    op.create_index(
        "uq_appointment_doctor_start_confirmed",
        "appointments",
        ["doctor_id", "start_time"],
        unique=True,
        postgresql_where=sa.text("status = 'confirmed'"),
    )


def downgrade() -> None:
    op.drop_index("uq_appointment_doctor_start_confirmed", table_name="appointments")
    op.create_unique_constraint("uq_appointment_doctor_start", "appointments", ["doctor_id", "start_time"])
