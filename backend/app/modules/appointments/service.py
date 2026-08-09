from datetime import datetime, timedelta

from arq.connections import ArqRedis
from sqlalchemy.exc import IntegrityError

from app.modules.appointments.hold_store import AppointmentHoldStore
from app.modules.appointments.models import Appointment
from app.modules.appointments.repository import AppointmentRepository
from app.modules.appointments.schemas import AppointmentBookRequest
from app.modules.availability.repository import AvailabilityRepository
from app.modules.doctors.repository import DoctorRepository

APPOINTMENT_DURATION = timedelta(minutes=30)


class DoctorNotFoundError(Exception):
    pass


class OutsideAvailabilityError(Exception):
    pass


class SlotConflictError(Exception):
    pass


class AppointmentNotFoundError(Exception):
    pass


class SlotAlreadyHeldError(Exception):
    pass


class HoldExpiredOrNotFoundError(Exception):
    pass


class HoldOwnedBySomeoneElseError(Exception):
    pass


class AppointmentService:
    def __init__(
        self,
        repository: AppointmentRepository,
        doctor_repository: DoctorRepository,
        availability_repository: AvailabilityRepository,
        hold_store: AppointmentHoldStore,
        arq_redis: ArqRedis,
    ):
        self.repository = repository
        self.doctor_repository = doctor_repository
        self.availability_repository = availability_repository
        self.hold_store = hold_store
        self.arq_redis = arq_redis

    async def book_appointment(self, patient_id: int, data: AppointmentBookRequest) -> Appointment:
        doctor = await self.doctor_repository.lock_for_update(data.doctor_id)
        if doctor is None:
            raise DoctorNotFoundError(data.doctor_id)

        start_time = data.start_time
        end_time = start_time + APPOINTMENT_DURATION

        windows = await self.availability_repository.get_by_doctor_id(doctor.id)
        if not any(window.start_time <= start_time and window.end_time >= end_time for window in windows):
            raise OutsideAvailabilityError(data.doctor_id)

        overlapping = await self.repository.get_overlapping(doctor.id, start_time, end_time)
        if overlapping:
            raise SlotConflictError(data.doctor_id)

        appointment = Appointment(
            doctor_id=doctor.id,
            patient_id=patient_id,
            start_time=start_time,
            end_time=end_time,
        )
        try:
            created = await self.repository.create(appointment)
        except IntegrityError as exc:
            raise SlotConflictError(data.doctor_id) from exc

        await self.arq_redis.enqueue_job("notify_doctor_of_booking", created.id)
        return created

    async def hold_slot(self, patient_id: int, doctor_id: int, start_time: datetime) -> None:
        acquired = await self.hold_store.hold(doctor_id, start_time, patient_id)
        if not acquired:
            raise SlotAlreadyHeldError(doctor_id)

    async def confirm_hold(self, patient_id: int, doctor_id: int, start_time: datetime) -> Appointment:
        holder_id = await self.hold_store.get_holder(doctor_id, start_time)
        if holder_id is None:
            raise HoldExpiredOrNotFoundError(doctor_id)
        if holder_id != patient_id:
            raise HoldOwnedBySomeoneElseError(doctor_id)

        appointment = await self.book_appointment(patient_id, AppointmentBookRequest(doctor_id=doctor_id, start_time=start_time))
        await self.hold_store.release(doctor_id, start_time)
        return appointment

    async def list_own_appointments(self, patient_id: int) -> list[Appointment]:
        return await self.repository.get_by_patient_id(patient_id)

    async def cancel_own_appointment(self, patient_id: int, appointment_id: int) -> Appointment:
        appointment = await self.repository.get_by_id(appointment_id)
        if appointment is None or appointment.patient_id != patient_id:
            raise AppointmentNotFoundError(appointment_id)

        cancelled = await self.repository.cancel(appointment)
        await self.arq_redis.enqueue_job("notify_doctor_of_cancellation", cancelled.id)
        return cancelled
