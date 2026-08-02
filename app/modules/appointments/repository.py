from sqlalchemy.ext.asyncio import AsyncSession


class AppointmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
