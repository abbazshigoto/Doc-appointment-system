from arq.connections import ArqRedis
from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.arq_pool import get_arq_redis
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.redis import get_redis
from app.modules.appointments.hold_store import AppointmentHoldStore, HOLD_TTL_SECONDS
from app.modules.appointments.repository import AppointmentRepository
from app.modules.appointments.schemas import (
    AppointmentBookRequest,
    AppointmentHoldResponse,
    AppointmentResponse,
    BookedSlotResponse,
)
from app.modules.appointments.service import (
    AppointmentNotFoundError,
    AppointmentService,
    DoctorNotFoundError,
    DoctorProfileRequiredError,
    HoldExpiredOrNotFoundError,
    HoldOwnedBySomeoneElseError,
    OutsideAvailabilityError,
    SlotAlreadyHeldError,
    SlotConflictError,
)
from app.modules.availability.repository import AvailabilityRepository
from app.modules.doctors.repository import DoctorRepository
from app.modules.users.models import UserRole

router = APIRouter(prefix="/appointments", tags=["appointments"])


def get_appointment_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    arq_redis: ArqRedis = Depends(get_arq_redis),
) -> AppointmentService:
    return AppointmentService(
        AppointmentRepository(db),
        DoctorRepository(db),
        AvailabilityRepository(db),
        AppointmentHoldStore(redis),
        arq_redis,
    )


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


@router.post(
    "/hold",
    response_model=AppointmentHoldResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.PATIENT))],
)
async def hold_appointment(
    data: AppointmentBookRequest,
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentHoldResponse:
    try:
        await service.hold_slot(int(user["sub"]), data.doctor_id, data.start_time)
    except SlotAlreadyHeldError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This slot is currently being booked by someone else"
        )
    return AppointmentHoldResponse(
        doctor_id=data.doctor_id, start_time=data.start_time, expires_in_seconds=HOLD_TTL_SECONDS
    )


@router.post(
    "/confirm",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.PATIENT))],
)
async def confirm_appointment(
    data: AppointmentBookRequest,
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentResponse:
    try:
        appointment = await service.confirm_hold(int(user["sub"]), data.doctor_id, data.start_time)
    except HoldExpiredOrNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hold not found or expired")
    except HoldOwnedBySomeoneElseError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This hold belongs to a different patient")
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


@router.get(
    "/doctor/me",
    response_model=list[AppointmentResponse],
    dependencies=[Depends(require_role(UserRole.DOCTOR))],
)
async def list_my_doctor_appointments(
    user: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> list[AppointmentResponse]:
    try:
        appointments = await service.list_appointments_for_doctor_user(int(user["sub"]))
    except DoctorProfileRequiredError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create your doctor profile first")
    return [AppointmentResponse.model_validate(appointment) for appointment in appointments]


@router.get("/doctor/{doctor_id}/booked-slots", response_model=list[BookedSlotResponse])
async def list_booked_slots(
    doctor_id: int,
    _: dict = Depends(get_current_user),
    service: AppointmentService = Depends(get_appointment_service),
) -> list[BookedSlotResponse]:
    appointments = await service.list_booked_slots_for_doctor(doctor_id)
    return [BookedSlotResponse.model_validate(appointment) for appointment in appointments]


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
