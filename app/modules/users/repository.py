from sqlalchemy.ext.asyncio import AsyncSession


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
