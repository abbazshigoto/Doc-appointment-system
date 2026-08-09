from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.modules.appointments.models import AppointmentStatus


class AppointmentBookRequest(BaseModel):
    doctor_id: int
    start_time: datetime


class AppointmentHoldResponse(BaseModel):
    doctor_id: int
    start_time: datetime
    expires_in_seconds: int


class BookedSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_time: datetime
    end_time: datetime


class AppointmentPatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    patient_id: int
    patient: AppointmentPatientSummary
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    created_at: datetime
