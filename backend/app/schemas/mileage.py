from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MileageMonth(BaseModel):
    month_index: int
    is_hospital_visit: bool
    amount: int
    completed: bool
    completed_at: Optional[datetime] = None
    note: Optional[str] = None


class MileageSummary(BaseModel):
    total_months: int
    completed_count: int
    earned_amount: int
    max_amount: int
    cycles_completed: int  # 6개월 단위로 모두 채워진 사이클 수
    months: List[MileageMonth]


class MileageToggleIn(BaseModel):
    month_index: int
    completed: bool
    note: Optional[str] = None
