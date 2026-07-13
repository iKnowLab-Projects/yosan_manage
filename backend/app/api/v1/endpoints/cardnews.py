from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.content import CardNews
from app.models.user import User, UserRole
from app.schemas.content import CardNewsIn, CardNewsOut

router = APIRouter(prefix="/cardnews", tags=["cardnews"])


@router.get("", response_model=List[CardNewsOut])
def list_cardnews(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    include_unpublished: bool = Query(False),
) -> List[CardNewsOut]:
    """카드뉴스 목록. display_order 오름차순, 최신순.

    include_unpublished=true 는 관리자에게만 적용되어 미게시 항목까지 포함한다
    (관리자 웹의 카드뉴스 관리 화면용). 그 외에는 항상 게시된 항목만 반환.
    """
    q = db.query(CardNews)
    if not (include_unpublished and user.role == UserRole.ADMIN):
        q = q.filter(CardNews.is_published == True)  # noqa: E712
    rows = (
        q.order_by(CardNews.display_order.asc(), CardNews.created_at.desc())
        .limit(limit)
        .all()
    )
    return [CardNewsOut.model_validate(r) for r in rows]


@router.get("/{card_id}", response_model=CardNewsOut)
def get_cardnews(
    card_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardNewsOut:
    row = db.get(CardNews, card_id)
    if not row:
        raise HTTPException(status_code=404, detail="카드뉴스를 찾을 수 없습니다.")
    # 미게시 항목은 관리자만 조회 가능 (편집 화면용)
    if not row.is_published and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=404, detail="카드뉴스를 찾을 수 없습니다.")
    return CardNewsOut.model_validate(row)


# ---------- 관리자 작성/수정/삭제 ----------
@router.post("", response_model=CardNewsOut, status_code=status.HTTP_201_CREATED)
def create_cardnews(
    payload: CardNewsIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CardNewsOut:
    row = CardNews(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return CardNewsOut.model_validate(row)


@router.put("/{card_id}", response_model=CardNewsOut)
def update_cardnews(
    card_id: int,
    payload: CardNewsIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CardNewsOut:
    row = db.get(CardNews, card_id)
    if not row:
        raise HTTPException(status_code=404, detail="카드뉴스를 찾을 수 없습니다.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return CardNewsOut.model_validate(row)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cardnews(
    card_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    row = db.get(CardNews, card_id)
    if not row:
        raise HTTPException(status_code=404, detail="카드뉴스를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
