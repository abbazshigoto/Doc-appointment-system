from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.appointments.repository import AppointmentRepository
from app.modules.appointments.schemas import AppointmentBookRequest, AppointmentResponse
from app.modules.appointments.service import (
    AppointmentNotFoundError,
    AppointmentService,
    DoctorNotFoundError,
    OutsideAvailabilityError,
    SlotConflictError,
)
from app.modules.availability.repository import AvailabilityRepository
from app.modules.doctors.repository import DoctorRepository
from app.modules.users.models import UserRole

router = APIRouter(prefix="/appointments", tags=["appointments"])


def get_appointment_service(db: AsyncSession = Depends(get_db)) -> AppointmentService:
    return AppointmentService(AppointmentRepository(db), DoctorRepository(db), AvailabilityRepository(db))


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.PATIENT))],
)
async def book_appointment(
    data: AppointmentBookRequest,
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentResponse:
    try:
        appointment = await service.book_appointment(int(user["sub"]), data)
    except DoctorNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    except OutsideAvailabilityError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Requested time is outside the doctor's availability",
        )
    except SlotConflictError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This time slot is no longer available")
    return AppointmentResponse.model_validate(appointment)


@router.get(
    "/me",
    response_model=list[AppointmentResponse],
    dependencies=[Depends(require_role(UserRole.PATIENT))],
)
async def list_my_appointments(
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> list[AppointmentResponse]:
    appointments = await service.list_own_appointments(int(user["sub"]))
    return [AppointmentResponse.model_validate(appointment) for appointment in appointments]


@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentResponse,
    dependencies=[Depends(require_role(UserRole.PATIENT))],
)
async def cancel_my_appointment(
    appointment_id: int,
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentResponse:
    try:
        appointment = await service.cancel_own_appointment(int(user["sub"]), appointment_id)
    except AppointmentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return AppointmentResponse.model_validate(appointment)
