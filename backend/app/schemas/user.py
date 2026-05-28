from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class PatientProfileIn(BaseModel):
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    baseline_weight_kg: Optional[float] = None
    baseline_uric_acid: Optional[float] = None
    medications: Optional[str] = None
    notes: Optional[str] = None


class PatientProfileOut(PatientProfileIn):
    model_config = ConfigDict(from_attributes=True)


class PatientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    profile: PatientProfileIn = PatientProfileIn()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class PatientOut(UserOut):
    profile: Optional[PatientProfileOut] = None


class PatientListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    is_active: bool
    last_report_date: Optional[date] = None
    days_since_last_report: Optional[int] = None
    missed_today: bool = False
