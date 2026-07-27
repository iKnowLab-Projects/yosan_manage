from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ContentView(Base):
    """환자의 콘텐츠 조회 이벤트 (카드뉴스/알림). 열람 1회 = 1행."""

    __tablename__ = "content_views"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[str] = mapped_column(String(20), index=True)  # cardnews | notification
    content_id: Mapped[int] = mapped_column(Integer, index=True)
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
