from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class UserNotFoundError(Exception):
    pass


class CannotDeactivateSelfError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def list_users(self) -> list[User]:
        return await self.repository.get_all()

    async def deactivate(self, current_admin_id: int, target_user_id: int) -> User:
        if current_admin_id == target_user_id:
            raise CannotDeactivateSelfError(target_user_id)

        user = await self.repository.get_by_id(target_user_id)
        if user is None:
            raise UserNotFoundError(target_user_id)
        return await self.repository.set_active(user, False)

    async def reactivate(self, target_user_id: int) -> User:
        user = await self.repository.get_by_id(target_user_id)
        if user is None:
            raise UserNotFoundError(target_user_id)
        return await self.repository.set_active(user, True)
