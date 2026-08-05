from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def list_users(self) -> list[User]:
        return await self.repository.get_all()
