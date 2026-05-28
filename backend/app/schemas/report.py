from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.report import MealType


class MealEntryIn(BaseModel):
    meal_type: MealType
    description: str
    purine_estimate: Optional[str] = None


class MealEntryOut(MealEntryIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class DailyReportIn(BaseModel):
    report_date: date
    weight_kg: Optional[float] = None
    uric_acid: Optional[float] = None
    water_intake_ml: Optional[int] = None
    exercise_minutes: Optional[int] = None
    pain_level: Optional[int] = None
    pain_location: Optional[str] = None
    flare_up: Optional[bool] = None
    medication_taken: Optional[bool] = None
    notes: Optional[str] = None
    meals: List[MealEntryIn] = []


class DailyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    report_date: date
    weight_kg: Optional[float] = None
    uric_acid: Optional[float] = None
    water_intake_ml: Optional[int] = None
    exercise_minutes: Optional[int] = None
    pain_level: Optional[int] = None
    pain_location: Optional[str] = None
    flare_up: Optional[bool] = None
    medication_taken: Optional[bool] = None
    notes: Optional[str] = None
    meals: List[MealEntryOut] = []
    created_at: datetime
    updated_at: datetime
