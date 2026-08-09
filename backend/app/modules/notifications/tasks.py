from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.modules.appointments.models import Appointment
from app.modules.appointments.repository import AppointmentRepository
from app.modules.auth.repository import AuthRepository
from app.modules.doctors.models import Doctor
from app.modules.doctors.repository import DoctorRepository
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User


def _format_appointment_time(start_time: datetime) -> str:
    return start_time.strftime("%B %d, %Y at %I:%M %p UTC")


async def _load_booking_context(
    session: AsyncSession, appointment_id: int
) -> tuple[Appointment, Doctor, User] | None:
    appointment = await AppointmentRepository(session).get_by_id(appointment_id)
    if appointment is None:
        return None

    doctor = await DoctorRepository(session).get_by_id(appointment.doctor_id)
    patient = await AuthRepository(session).get_by_id(appointment.patient_id)
    if doctor is None or patient is None:
        return None

    return appointment, doctor, patient


async def notify_doctor_of_booking(ctx: dict, appointment_id: int) -> None:
    async with AsyncSessionLocal() as session:
        context = await _load_booking_context(session, appointment_id)
        if context is None:
            return
        appointment, doctor, patient = context

        message = f"New appointment with {patient.full_name} at {_format_appointment_time(appointment.start_time)}"
        await NotificationService(NotificationRepository(session)).create_notification(doctor.user_id, message)


async def notify_doctor_of_cancellation(ctx: dict, appointment_id: int) -> None:
    async with AsyncSessionLocal() as session:
        context = await _load_booking_context(session, appointment_id)
        if context is None:
            return
        appointment, doctor, patient = context

        message = f"{patient.full_name} cancelled their appointment at {_format_appointment_time(appointment.start_time)}"
        await NotificationService(NotificationRepository(session)).create_notification(doctor.user_id, message)
