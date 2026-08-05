from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DoctorProfileRequest(BaseModel):
    specialty: str = Field(min_length=1, max_length=255)
    bio: str | None = None
    years_of_experience: int = Field(ge=0)
    consultation_fee: Decimal = Field(ge=0)


class DoctorProfileUpdateRequest(BaseModel):
    specialty: str | None = Field(default=None, min_length=1, max_length=255)
    bio: str | None = None
    years_of_experience: int | None = Field(default=None, ge=0)
    consultation_fee: Decimal | None = Field(default=None, ge=0)


class DoctorUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user: DoctorUserSummary
    specialty: str
    bio: str | None
    years_of_experience: int
    consultation_fee: Decimal
    created_at: datetime
