from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Announcement(Base):
    """읽기 전용 공지 / FAQ 게시판 글 (관리자 작성, 환자 열람)."""

    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), default="notice")  # notice | faq
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CardNews(Base):
    """카드뉴스 (관리자 작성, 환자 열람). image_key 는 앱 번들 샘플 키 또는 외부 URL."""

    __tablename__ = "card_news"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(String(300))
    body: Mapped[str | None] = mapped_column(Text)
    image_key: Mapped[str] = mapped_column(String(300))
    link_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
