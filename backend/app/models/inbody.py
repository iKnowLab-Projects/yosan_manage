from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class InBodyResult(Base):
    """InBody(체성분) 측정 결과.

    관리자(연구원)가 병원 방문(6개월)마다 등록하고, 환자는 앱에서 열람만 한다.
    수치 항목과 결과지 이미지를 함께 보관한다.
    """

    __tablename__ = "inbody_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    measured_date: Mapped[date] = mapped_column(Date, index=True)

    uric_acid: Mapped[float | None] = mapped_column(Float)  # 혈액 요산 수치(mg/dL)
    weight_kg: Mapped[float | None] = mapped_column(Float)  # 체중(kg)
    skeletal_muscle_mass: Mapped[float | None] = mapped_column(Float)  # 골격근량(kg)
    body_fat_mass: Mapped[float | None] = mapped_column(Float)  # 체지방량(kg)
    bmi: Mapped[float | None] = mapped_column(Float)  # 체질량지수
    percent_body_fat: Mapped[float | None] = mapped_column(Float)  # 체지방률(%)
    basal_metabolic_rate: Mapped[float | None] = mapped_column(Float)  # 기초대사량(kcal)
    total_body_water: Mapped[float | None] = mapped_column(Float)  # 체수분(L)
    inbody_score: Mapped[int | None] = mapped_column(Integer)  # InBody 점수

    image_key: Mapped[str | None] = mapped_column(String(300))  # 결과지 이미지 업로드 URL/키
    note: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
