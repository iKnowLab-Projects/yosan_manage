from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

TOTAL_MONTHS = 24
HOSPITAL_VISIT_INTERVAL = 6
SMALL_AMOUNT = 3000
LARGE_AMOUNT = 5000


def is_hospital_visit(month_index: int) -> bool:
    """6, 12, 18, 24 차월이 병원 방문(큰 동그라미)."""
    return month_index % HOSPITAL_VISIT_INTERVAL == 0


def amount_for(month_index: int) -> int:
    return LARGE_AMOUNT if is_hospital_visit(month_index) else SMALL_AMOUNT


class MileageCompletion(Base):
    __tablename__ = "mileage_completions"
    __table_args__ = (
        UniqueConstraint("patient_id", "month_index", name="uq_mileage_patient_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    month_index: Mapped[int] = mapped_column(Integer)  # 1..24
    note: Mapped[str | None] = mapped_column(String(200))
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
