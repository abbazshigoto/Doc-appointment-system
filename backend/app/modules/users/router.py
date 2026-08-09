from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.users.models import UserRole
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserResponse
from app.modules.users.service import CannotDeactivateSelfError, UserNotFoundError, UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role(UserRole.ADMIN))])
async def list_users(service: UserService = Depends(get_user_service)) -> list[UserResponse]:
    users = await service.list_users()
    return [UserResponse.model_validate(user) for user in users]


@router.post(
    "/{user_id}/deactivate",
    response_model=UserResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def deactivate_user(
    user_id: int,
    admin: dict = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    try:
        updated = await service.deactivate(int(admin["sub"]), user_id)
    except CannotDeactivateSelfError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(updated)


@router.post(
    "/{user_id}/reactivate",
    response_model=UserResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def reactivate_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
) -> UserResponse:
    try:
        updated = await service.reactivate(user_id)
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(updated)
