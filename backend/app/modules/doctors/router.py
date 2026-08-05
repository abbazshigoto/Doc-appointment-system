from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.doctors.repository import DoctorRepository
from app.modules.doctors.schemas import DoctorProfileRequest, DoctorProfileUpdateRequest, DoctorResponse
from app.modules.doctors.service import (
    DoctorProfileAlreadyExistsError,
    DoctorProfileNotFoundError,
    DoctorService,
)
from app.modules.users.models import UserRole

router = APIRouter(prefix="/doctors", tags=["doctors"])


def get_doctor_service(db: AsyncSession = Depends(get_db)) -> DoctorService:
    return DoctorService(DoctorRepository(db))


@router.post(
    "/me",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.DOCTOR))],
)
async def create_my_profile(
    data: DoctorProfileRequest,
    user: dict = Depends(get_current_user),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorResponse:
    try:
        doctor = await service.create_profile(int(user["sub"]), data)
    except DoctorProfileAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Doctor profile already exists")
    return DoctorResponse.model_validate(doctor)


@router.get("/me", response_model=DoctorResponse)
async def get_my_profile(
    user: dict = Depends(get_current_user),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorResponse:
    try:
        doctor = await service.get_own_profile(int(user["sub"]))
    except DoctorProfileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return DoctorResponse.model_validate(doctor)


@router.patch("/me", response_model=DoctorResponse)
async def update_my_profile(
    data: DoctorProfileUpdateRequest,
    user: dict = Depends(get_current_user),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorResponse:
    try:
        doctor = await service.update_own_profile(int(user["sub"]), data)
    except DoctorProfileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return DoctorResponse.model_validate(doctor)


@router.get("", response_model=list[DoctorResponse])
async def list_doctors(
    _: dict = Depends(get_current_user),
    service: DoctorService = Depends(get_doctor_service),
) -> list[DoctorResponse]:
    doctors = await service.list_doctors()
    return [DoctorResponse.model_validate(doctor) for doctor in doctors]


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    _: dict = Depends(get_current_user),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorResponse:
    try:
        doctor = await service.get_by_id(doctor_id)
    except DoctorProfileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return DoctorResponse.model_validate(doctor)
