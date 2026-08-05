from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.doctors.models import Doctor


class DoctorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: int) -> Doctor | None:
        result = await self.db.execute(select(Doctor).where(Doctor.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_by_id(self, doctor_id: int) -> Doctor | None:
        return await self.db.get(Doctor, doctor_id)

    async def get_all(self) -> list[Doctor]:
        result = await self.db.execute(select(Doctor).order_by(Doctor.id))
        return list(result.scalars().all())

    async def create(self, doctor: Doctor) -> Doctor:
        self.db.add(doctor)
        await self.db.commit()
        return await self.get_by_id(doctor.id)

    async def update(self, doctor: Doctor) -> Doctor:
        await self.db.commit()
        return await self.get_by_id(doctor.id)
