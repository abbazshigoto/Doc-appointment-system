from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.availability.models import AvailabilityWindow


class AvailabilityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, window: AvailabilityWindow) -> AvailabilityWindow:
        self.db.add(window)
        await self.db.commit()
        await self.db.refresh(window)
        return window

    async def get_by_id(self, window_id: int) -> AvailabilityWindow | None:
        return await self.db.get(AvailabilityWindow, window_id)

    async def get_by_doctor_id(self, doctor_id: int) -> list[AvailabilityWindow]:
        result = await self.db.execute(
            select(AvailabilityWindow)
            .where(AvailabilityWindow.doctor_id == doctor_id)
            .order_by(AvailabilityWindow.start_time)
        )
        return list(result.scalars().all())

    async def get_overlapping(self, doctor_id: int, start_time: datetime, end_time: datetime) -> list[AvailabilityWindow]:
        result = await self.db.execute(
            select(AvailabilityWindow).where(
                AvailabilityWindow.doctor_id == doctor_id,
                AvailabilityWindow.start_time < end_time,
                AvailabilityWindow.end_time > start_time,
            )
        )
        return list(result.scalars().all())

    async def delete(self, window: AvailabilityWindow) -> None:
        await self.db.delete(window)
        await self.db.commit()
