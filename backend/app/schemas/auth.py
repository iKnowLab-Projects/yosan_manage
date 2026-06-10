from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str


class PatientRegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    baseline_weight_kg: Optional[float] = None
    baseline_uric_acid: Optional[float] = None
    medications: Optional[str] = None
    notes: Optional[str] = None


class ApproveIn(BaseModel):
    survey_group: Literal["B", "C"]


class PasswordResetRequestIn(BaseModel):
    email: EmailStr
    new_password: str
    note: Optional[str] = None


class PasswordResetRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    user_email: EmailStr
    user_name: str
    note: Optional[str] = None
    requested_at: datetime
