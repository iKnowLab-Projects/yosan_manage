from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class PasswordResetRequest(Base):
    """환자가 신청한 비밀번호 초기화 요청.

    환자가 평문 새 비밀번호를 보내면 즉시 해시해서 보관한다.
    관리자가 승인하면 user.hashed_password 를 이 값으로 덮어쓰고 요청은 삭제.
    거절하면 요청만 삭제.

    UniqueConstraint(user_id) 로 사용자당 1건만 유지. 재신청 시 이전 신청을
    먼저 삭제하고 새로 insert (auth.py 의 request_password_reset 참고).
    """

    __tablename__ = "password_reset_requests"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_password_reset_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    new_hashed_password: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user = relationship("User")
