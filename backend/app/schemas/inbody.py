from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InBodyIn(BaseModel):
    measured_date: date
    uric_acid: Optional[float] = None
    weight_kg: Optional[float] = None
    skeletal_muscle_mass: Optional[float] = None
    body_fat_mass: Optional[float] = None
    bmi: Optional[float] = None
    percent_body_fat: Optional[float] = None
    basal_metabolic_rate: Optional[float] = None
    total_body_water: Optional[float] = None
    inbody_score: Optional[int] = None
    image_key: Optional[str] = None
    note: Optional[str] = None


class InBodyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    measured_date: date
    uric_acid: Optional[float] = None
    weight_kg: Optional[float] = None
    skeletal_muscle_mass: Optional[float] = None
    body_fat_mass: Optional[float] = None
    bmi: Optional[float] = None
    percent_body_fat: Optional[float] = None
    basal_metabolic_rate: Optional[float] = None
    total_body_water: Optional[float] = None
    inbody_score: Optional[int] = None
    image_key: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
