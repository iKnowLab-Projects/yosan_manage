from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.content import Announcement
from app.models.user import User, UserRole
from app.schemas.content import AnnouncementIn, AnnouncementOut

router = APIRouter(prefix="/board", tags=["board"])


@router.get("", response_model=List[AnnouncementOut])
def list_announcements(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    include_unpublished: bool = Query(False),
) -> List[AnnouncementOut]:
    """공지/FAQ 목록. 고정글 우선, 최신순.

    include_unpublished=true 는 관리자에게만 적용되어 미게시 항목까지 포함한다
    (관리자 웹의 공지·FAQ 관리 화면용). category 로 notice/faq 필터 가능.
    """
    q = db.query(Announcement)
    if not (include_unpublished and user.role == UserRole.ADMIN):
        q = q.filter(Announcement.is_published == True)  # noqa: E712
    if category:
        q = q.filter(Announcement.category == category)
    rows = (
        q.order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .limit(limit)
        .all()
    )
    return [AnnouncementOut.model_validate(r) for r in rows]


@router.get("/{announcement_id}", response_model=AnnouncementOut)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnnouncementOut:
    row = db.get(Announcement, announcement_id)
    if not row:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    # 미게시 항목은 관리자만 조회 가능 (편집 화면용)
    if not row.is_published and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    return AnnouncementOut.model_validate(row)


# ---------- 관리자 작성/수정/삭제 ----------
@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnnouncementOut:
    row = Announcement(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return AnnouncementOut.model_validate(row)


@router.put("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AnnouncementOut:
    row = db.get(Announcement, announcement_id)
    if not row:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return AnnouncementOut.model_validate(row)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    row = db.get(Announcement, announcement_id)
    if not row:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
