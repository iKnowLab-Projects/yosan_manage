from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AppointmentMessageTemplate(Base):
    """관리자가 편집한 외래 진료일 알림 메시지(마일스톤별).

    행이 있으면 그 값을, 없으면 코드 기본값(app/data/appointment_messages.py)을 사용한다.
    """

    __tablename__ = "appointment_message_templates"
    __table_args__ = (
        UniqueConstraint("milestone_month", name="uq_appt_msg_milestone"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    milestone_month: Mapped[int] = mapped_column(Integer)  # 6 | 12 | 18 | 24
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
