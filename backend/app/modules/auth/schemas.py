from pydantic import BaseModel, EmailStr, Field, field_validator

from app.modules.users.models import UserRole
from app.modules.users.schemas import UserResponse

SELF_REGISTERABLE_ROLES = {UserRole.PATIENT, UserRole.DOCTOR}

__all__ = ["RegisterRequest", "TokenResponse", "UserResponse"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole

    @field_validator("role")
    @classmethod
    def role_must_be_self_registerable(cls, role: UserRole) -> UserRole:
        if role not in SELF_REGISTERABLE_ROLES:
            raise ValueError("role must be one of: " + ", ".join(r.value for r in SELF_REGISTERABLE_ROLES))
        return role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
