from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

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
    survey_group: Optional[Literal["B", "C"]] = None

    @field_validator("survey_group", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        if v in ("", None):
            return None
        return v


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
    last_submission_date: Optional[date] = None  # 최근 설문 제출일
    days_since_last_submission: Optional[int] = None
    missed_this_month: bool = False  # 이번 달 설문 미제출
