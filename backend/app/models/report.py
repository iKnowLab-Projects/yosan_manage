import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    report_date: Mapped[date] = mapped_column(Date, index=True)

    weight_kg: Mapped[float | None] = mapped_column(Float)
    uric_acid: Mapped[float | None] = mapped_column(Float)
    water_intake_ml: Mapped[int | None] = mapped_column(Integer)
    exercise_minutes: Mapped[int | None] = mapped_column(Integer)
    pain_level: Mapped[int | None] = mapped_column(Integer)
    pain_location: Mapped[str | None] = mapped_column(String(100))
    flare_up: Mapped[bool | None] = mapped_column()
    medication_taken: Mapped[bool | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    patient = relationship("User", back_populates="reports")
    meals = relationship("MealEntry", back_populates="report", cascade="all, delete-orphan")


class MealEntry(Base):
    __tablename__ = "meal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("daily_reports.id", ondelete="CASCADE"))
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type"))
    description: Mapped[str] = mapped_column(Text)
    purine_estimate: Mapped[str | None] = mapped_column(String(20))

    report = relationship("DailyReport", back_populates="meals")
