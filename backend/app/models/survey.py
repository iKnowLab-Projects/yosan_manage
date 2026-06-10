from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SurveySubmission(Base):
    __tablename__ = "survey_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    survey_group: Mapped[str] = mapped_column(String(1))  # 'B' or 'C'
    check_date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    answers = relationship(
        "SurveyAnswer",
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("survey_submissions.id", ondelete="CASCADE"), index=True
    )
    question_code: Mapped[str] = mapped_column(String(40))
    choice_index: Mapped[int] = mapped_column(Integer)
    choice_label: Mapped[str] = mapped_column(String(200))

    submission = relationship("SurveySubmission", back_populates="answers")
