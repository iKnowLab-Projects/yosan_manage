from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


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
    link_url: Optional[str] = None
    display_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
