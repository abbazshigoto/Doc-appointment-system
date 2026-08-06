from app.modules.availability.models import AvailabilityWindow
from app.modules.availability.repository import AvailabilityRepository
from app.modules.availability.schemas import AvailabilityWindowRequest
from app.modules.doctors.repository import DoctorRepository


class DoctorProfileRequiredError(Exception):
    pass


class OverlappingAvailabilityError(Exception):
    pass


class AvailabilityWindowNotFoundError(Exception):
    pass


class AvailabilityService:
    def __init__(self, repository: AvailabilityRepository, doctor_repository: DoctorRepository):
        self.repository = repository
        self.doctor_repository = doctor_repository

    async def _get_doctor_id_for_user(self, user_id: int) -> int:
        doctor = await self.doctor_repository.get_by_user_id(user_id)
        if doctor is None:
            raise DoctorProfileRequiredError(user_id)
        return doctor.id

    async def create_window(self, user_id: int, data: AvailabilityWindowRequest) -> AvailabilityWindow:
        doctor_id = await self._get_doctor_id_for_user(user_id)

        overlapping = await self.repository.get_overlapping(doctor_id, data.start_time, data.end_time)
        if overlapping:
            raise OverlappingAvailabilityError(doctor_id)

        window = AvailabilityWindow(doctor_id=doctor_id, start_time=data.start_time, end_time=data.end_time)
        return await self.repository.create(window)

    async def list_own_windows(self, user_id: int) -> list[AvailabilityWindow]:
        doctor_id = await self._get_doctor_id_for_user(user_id)
        return await self.repository.get_by_doctor_id(doctor_id)

    async def list_windows_for_doctor(self, doctor_id: int) -> list[AvailabilityWindow]:
        return await self.repository.get_by_doctor_id(doctor_id)

    async def delete_own_window(self, user_id: int, window_id: int) -> None:
        doctor_id = await self._get_doctor_id_for_user(user_id)

        window = await self.repository.get_by_id(window_id)
        if window is None or window.doctor_id != doctor_id:
            raise AvailabilityWindowNotFoundError(window_id)

        await self.repository.delete(window)
