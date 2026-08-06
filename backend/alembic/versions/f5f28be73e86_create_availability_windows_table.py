"""create availability windows table

Revision ID: f5f28be73e86
Revises: 8ead84eca6ba
Create Date: 2026-08-06 23:01:10.421938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5f28be73e86'
down_revision: Union[str, None] = '8ead84eca6ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "availability_windows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("end_time > start_time", name="ck_availability_end_after_start"),
    )
    op.create_index(op.f("ix_availability_windows_doctor_id"), "availability_windows", ["doctor_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_availability_windows_doctor_id"), table_name="availability_windows")
    op.drop_table("availability_windows")
