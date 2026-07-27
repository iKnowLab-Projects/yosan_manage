from typing import Dict

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.content import CardNews
from app.models.user import User, UserRole
from app.models.view import ContentView
from app.schemas.view import (
    CardNewsViewStat,
    PatientViewStat,
    ViewIn,
    ViewSummaryOut,
)

router = APIRouter(prefix="/views", tags=["views"])

VALID_TYPES = {"cardnews", "notification"}


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def record_view(
    payload: ViewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """환자의 콘텐츠 조회 1회 기록. (관리자 계정은 집계에서 제외하기 위해 기록하지 않음)"""
    if user.role != UserRole.PATIENT:
        return
    if payload.content_type not in VALID_TYPES:
        return
    db.add(
        ContentView(
            patient_id=user.id,
            content_type=payload.content_type,
            content_id=payload.content_id,
        )
    )
    db.commit()


@router.get("/summary", response_model=ViewSummaryOut)
def view_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ViewSummaryOut:
    """조회수 통합 집계 (관리자)."""
    cardnews_total = (
        db.query(func.count(ContentView.id))
        .filter(ContentView.content_type == "cardnews")
        .scalar()
        or 0
    )
    notification_total = (
        db.query(func.count(ContentView.id))
        .filter(ContentView.content_type == "notification")
        .scalar()
        or 0
    )

    # 카드뉴스별 조회수
    card_rows = (
        db.query(ContentView.content_id, func.count(ContentView.id))
        .filter(ContentView.content_type == "cardnews")
        .group_by(ContentView.content_id)
        .all()
    )
    titles = {c.id: c.title for c in db.query(CardNews.id, CardNews.title).all()}
    by_cardnews = [
        CardNewsViewStat(
            content_id=cid, title=titles.get(cid, f"#{cid} (삭제됨)"), count=cnt
        )
        for cid, cnt in card_rows
    ]
    by_cardnews.sort(key=lambda x: -x.count)

    # 환자별 조회수 (유형별)
    prows = (
        db.query(
            ContentView.patient_id,
            ContentView.content_type,
            func.count(ContentView.id),
        )
        .group_by(ContentView.patient_id, ContentView.content_type)
        .all()
    )
    agg: Dict[int, Dict[str, int]] = {}
    for pid, ctype, cnt in prows:
        a = agg.setdefault(pid, {"cardnews": 0, "notification": 0})
        if ctype in a:
            a[ctype] = cnt
    names = (
        {
            u.id: u.name
            for u in db.query(User.id, User.name)
            .filter(User.id.in_(list(agg.keys())))
            .all()
        }
        if agg
        else {}
    )
    by_patient = [
        PatientViewStat(
            patient_id=pid,
            name=names.get(pid, f"#{pid}"),
            cardnews_views=v["cardnews"],
            notification_views=v["notification"],
            total=v["cardnews"] + v["notification"],
        )
        for pid, v in agg.items()
    ]
    by_patient.sort(key=lambda x: -x.total)

    return ViewSummaryOut(
        cardnews_total=cardnews_total,
        notification_total=notification_total,
        by_cardnews=by_cardnews,
        by_patient=by_patient,
    )
