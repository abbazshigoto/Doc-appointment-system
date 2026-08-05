from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.users.models import UserRole
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserResponse
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role(UserRole.ADMIN))])
async def list_users(service: UserService = Depends(get_user_service)) -> list[UserResponse]:
    users = await service.list_users()
    return [UserResponse.model_validate(user) for user in users]
