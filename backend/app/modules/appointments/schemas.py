from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.appointments.models import AppointmentStatus


class AppointmentBookRequest(BaseModel):
    doctor_id: int
    start_time: datetime


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    patient_id: int
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    created_at: datetime
