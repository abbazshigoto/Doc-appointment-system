"""create appointments table

Revision ID: 849b4ff772e4
Revises: f5f28be73e86
Create Date: 2026-08-07 21:21:12.353020

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '849b4ff772e4'
down_revision: Union[str, None] = 'f5f28be73e86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


appointment_status = sa.Enum("confirmed", "cancelled", name="appointment_status")


def upgrade() -> None:
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", appointment_status, nullable=False, server_default="confirmed"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("doctor_id", "start_time", name="uq_appointment_doctor_start"),
        sa.CheckConstraint("end_time > start_time", name="ck_appointment_end_after_start"),
    )
    op.create_index(op.f("ix_appointments_doctor_id"), "appointments", ["doctor_id"])
    op.create_index(op.f("ix_appointments_patient_id"), "appointments", ["patient_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_appointments_patient_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_doctor_id"), table_name="appointments")
    op.drop_table("appointments")
    appointment_status.drop(op.get_bind(), checkfirst=True)
