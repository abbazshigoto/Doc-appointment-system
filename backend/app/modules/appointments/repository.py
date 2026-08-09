from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.appointments.models import Appointment, AppointmentStatus


class AppointmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, appointment: Appointment) -> Appointment:
        self.db.add(appointment)
        await self.db.commit()
        await self.db.refresh(appointment, attribute_names=["patient"])
        return appointment

    async def get_overlapping(self, doctor_id: int, start_time: datetime, end_time: datetime) -> list[Appointment]:
        result = await self.db.execute(
            select(Appointment).where(
                Appointment.doctor_id == doctor_id,
                Appointment.status == AppointmentStatus.CONFIRMED,
                Appointment.start_time < end_time,
                Appointment.end_time > start_time,
            )
        )
        return list(result.scalars().all())

    async def get_by_id(self, appointment_id: int) -> Appointment | None:
        return await self.db.get(Appointment, appointment_id)

    async def get_by_patient_id(self, patient_id: int) -> list[Appointment]:
        result = await self.db.execute(
            select(Appointment).where(Appointment.patient_id == patient_id).order_by(Appointment.start_time)
        )
        return list(result.scalars().all())

    async def get_by_doctor_id(self, doctor_id: int) -> list[Appointment]:
        result = await self.db.execute(
            select(Appointment).where(Appointment.doctor_id == doctor_id).order_by(Appointment.start_time)
        )
        return list(result.scalars().all())

    async def get_confirmed_by_doctor_id(self, doctor_id: int) -> list[Appointment]:
        result = await self.db.execute(
            select(Appointment)
            .where(Appointment.doctor_id == doctor_id, Appointment.status == AppointmentStatus.CONFIRMED)
            .order_by(Appointment.start_time)
        )
        return list(result.scalars().all())

    async def cancel(self, appointment: Appointment) -> Appointment:
        appointment.status = AppointmentStatus.CANCELLED
        await self.db.commit()
        await self.db.refresh(appointment, attribute_names=["patient"])
        return appointment