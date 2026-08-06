from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.availability.repository import AvailabilityRepository
from app.modules.availability.schemas import AvailabilityWindowRequest, AvailabilityWindowResponse
from app.modules.availability.service import (
    AvailabilityService,
    AvailabilityWindowNotFoundError,
    DoctorProfileRequiredError,
    OverlappingAvailabilityError,
)
from app.modules.doctors.repository import DoctorRepository
from app.modules.users.models import UserRole

router = APIRouter(prefix="/availability", tags=["availability"])


def get_availability_service(db: AsyncSession = Depends(get_db)) -> AvailabilityService:
    return AvailabilityService(AvailabilityRepository(db), DoctorRepository(db))


@router.post(
    "/me",
    response_model=AvailabilityWindowResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.DOCTOR))],
)
async def create_my_window(
    data: AvailabilityWindowRequest,
    user: dict = Depends(get_current_user),
    service: AvailabilityService = Depends(get_availability_service),
) -> AvailabilityWindowResponse:
    try:
        window = await service.create_window(int(user["sub"]), data)
    except DoctorProfileRequiredError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create your doctor profile first")
    except OverlappingAvailabilityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Window overlaps an existing one")
    return AvailabilityWindowResponse.model_validate(window)


@router.get(
    "/me",
    response_model=list[AvailabilityWindowResponse],
    dependencies=[Depends(require_role(UserRole.DOCTOR))],
)
async def list_my_windows(
    user: dict = Depends(get_current_user),
    service: AvailabilityService = Depends(get_availability_service),
) -> list[AvailabilityWindowResponse]:
    try:
        windows = await service.list_own_windows(int(user["sub"]))
    except DoctorProfileRequiredError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create your doctor profile first")
    return [AvailabilityWindowResponse.model_validate(window) for window in windows]


@router.delete(
    "/me/{window_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.DOCTOR))],
)
async def delete_my_window(
    window_id: int,
    user: dict = Depends(get_current_user),
    service: AvailabilityService = Depends(get_availability_service),
) -> None:
    try:
        await service.delete_own_window(int(user["sub"]), window_id)
    except (DoctorProfileRequiredError, AvailabilityWindowNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability window not found")


@router.get("/doctors/{doctor_id}", response_model=list[AvailabilityWindowResponse])
async def list_windows_for_doctor(
    doctor_id: int,
    _: dict = Depends(get_current_user),
    service: AvailabilityService = Depends(get_availability_service),
) -> list[AvailabilityWindowResponse]:
    windows = await service.list_windows_for_doctor(doctor_id)
    return [AvailabilityWindowResponse.model_validate(window) for window in windows]
