from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class MealScore(Base):
    """월별 식사 점수(0~100)와 관리자 코멘트.

    현재는 관리자가 환자별로 매월 수동 입력한다(추후 자동 계산식으로 대체 가능).
    환자 앱에서는 최근 6개월 본인 점수(파란 점)와 같은 설문군 평균(빨간 점),
    그리고 월별 코멘트를 확인한다.
    """

    __tablename__ = "meal_scores"
    __table_args__ = (
        UniqueConstraint("patient_id", "year_month", name="uq_meal_score_patient_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    year_month: Mapped[str] = mapped_column(String(7), index=True)  # 'YYYY-MM'
    score: Mapped[float] = mapped_column(Float)  # 0~100
    comment: Mapped[str | None] = mapped_column(Text)  # 관리자 코멘트

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
