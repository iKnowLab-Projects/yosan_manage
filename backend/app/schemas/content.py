from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


# ---------- 공지 / FAQ 게시판 ----------
class AnnouncementIn(BaseModel):
    title: str
    body: str
    category: str = "notice"  # notice | faq
    is_pinned: bool = False
    is_published: bool = True


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str
    category: str
    is_pinned: bool
    is_published: bool
    created_at: datetime
    updated_at: datetime


# ---------- 카드뉴스 ----------
class CardNewsIn(BaseModel):
    title: str
    summary: Optional[str] = None
    body: Optional[str] = None
    image_key: str
    images: List[str] = []
    link_url: Optional[str] = None
    display_order: int = 0
    is_published: bool = True


class CardNewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    summary: Optional[str] = None
    body: Optional[str] = None
    image_key: str
    images: List[str] = []
    link_url: Optional[str] = None
    display_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("images", mode="before")
    @classmethod
    def _none_to_list(cls, v: object) -> object:
        # 마이그레이션 이전 행이 NULL 일 수 있으므로 빈 배열로 보정
        return v or []
