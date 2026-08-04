from sqlalchemy.ext.asyncio import AsyncSession


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
