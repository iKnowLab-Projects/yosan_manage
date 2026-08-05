from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AppointmentReminder(Base):
    """외래 진료일 '일주일 전' 알림 발송 로그(중복 방지).

    (환자, 마일스톤 개월수) 조합당 1회만 발송되도록 unique 로 보장한다.
    동시(멀티워커) 실행 시에도 insert-first + unique 로 중복 발송을 막는다.
    """

    __tablename__ = "appointment_reminders"
    __table_args__ = (
        UniqueConstraint(
            "patient_id", "milestone_month", name="uq_appt_reminder_patient_milestone"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    milestone_month: Mapped[int] = mapped_column(Integer)  # 6 | 12 | 18 | 24
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
