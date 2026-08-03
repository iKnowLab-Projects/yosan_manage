from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- 관리자 입력/조회 ----------
class MealScoreIn(BaseModel):
    year_month: str = Field(pattern=r"^\d{4}-\d{2}$")  # 'YYYY-MM'
    score: float = Field(ge=0, le=100)
    comment: Optional[str] = None


class MealScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_id: int
    year_month: str
    score: float
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- 환자 추이(최근 6개월) ----------
class MealScorePoint(BaseModel):
    year_month: str
    my_score: Optional[float] = None       # 본인 점수(파란 점)
    group_avg: Optional[float] = None       # 같은 설문군 평균(빨간 점)
    comment: Optional[str] = None           # 해당 월 관리자 코멘트


class MealScoreTrend(BaseModel):
    survey_group: Optional[str] = None      # 'B' | 'C' | None
    points: List[MealScorePoint] = []       # 과거→현재 순, 최대 6개
