from app.modules.doctors.models import Doctor
from app.modules.doctors.repository import DoctorRepository
from app.modules.doctors.schemas import DoctorProfileRequest, DoctorProfileUpdateRequest


class DoctorProfileAlreadyExistsError(Exception):
    pass


class DoctorProfileNotFoundError(Exception):
    pass


class DoctorService:
    def __init__(self, repository: DoctorRepository):
        self.repository = repository

    async def create_profile(self, user_id: int, data: DoctorProfileRequest) -> Doctor:
        existing = await self.repository.get_by_user_id(user_id)
        if existing is not None:
            raise DoctorProfileAlreadyExistsError(user_id)

        doctor = Doctor(user_id=user_id, **data.model_dump())
        return await self.repository.create(doctor)

    async def get_own_profile(self, user_id: int) -> Doctor:
        doctor = await self.repository.get_by_user_id(user_id)
        if doctor is None:
            raise DoctorProfileNotFoundError(user_id)
        return doctor

    async def update_own_profile(self, user_id: int, data: DoctorProfileUpdateRequest) -> Doctor:
        doctor = await self.get_own_profile(user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(doctor, field, value)
        return await self.repository.update(doctor)

    async def list_doctors(self) -> list[Doctor]:
        return await self.repository.get_all()

    async def get_by_id(self, doctor_id: int) -> Doctor:
        doctor = await self.repository.get_by_id(doctor_id)
        if doctor is None:
            raise DoctorProfileNotFoundError(doctor_id)
        return doctor
