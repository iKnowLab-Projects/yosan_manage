from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.meal_score import MealScore
from app.models.user import User, UserRole
from app.schemas.meal_score import (
    MealScoreIn,
    MealScoreOut,
    MealScorePoint,
    MealScoreTrend,
)

router = APIRouter(prefix="/meal-scores", tags=["meal-scores"])

RECENT_MONTHS = 6


@router.get("/me", response_model=MealScoreTrend)
def my_meal_trend(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MealScoreTrend:
    """환자 본인 최근 6개월 식사 점수 + 같은 설문군 평균 + 월별 코멘트."""
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")

    grp = user.patient_profile.survey_group if user.patient_profile else None

    mine = (
        db.query(MealScore)
        .filter(MealScore.patient_id == user.id)
        .order_by(MealScore.year_month.desc())
        .limit(RECENT_MONTHS)
        .all()
    )
    mine = list(reversed(mine))  # 과거→현재
    months = [m.year_month for m in mine]

    # 모든 참여자 월별 평균 (single-blind — 군 구분 없이 전체 기준)
    avg_map: dict[str, float] = {}
    if months:
        rows = (
            db.query(MealScore.year_month, func.avg(MealScore.score))
            .filter(MealScore.year_month.in_(months))
            .group_by(MealScore.year_month)
            .all()
        )
        avg_map = {ym: round(float(a), 1) for ym, a in rows}

    points = [
        MealScorePoint(
            year_month=m.year_month,
            my_score=m.score,
            group_avg=avg_map.get(m.year_month),
            comment=m.comment,
        )
        for m in mine
    ]
    return MealScoreTrend(survey_group=grp, points=points)


# ---------- 관리자 입력/관리 ----------
@router.get("/patient/{patient_id}", response_model=List[MealScoreOut])
def patient_meal_scores(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[MealScoreOut]:
    rows = (
        db.query(MealScore)
        .filter(MealScore.patient_id == patient_id)
        .order_by(MealScore.year_month.desc())
        .all()
    )
    return [MealScoreOut.model_validate(r) for r in rows]


@router.post(
    "/patient/{patient_id}",
    response_model=MealScoreOut,
    status_code=status.HTTP_201_CREATED,
)
def upsert_meal_score(
    patient_id: int,
    payload: MealScoreIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MealScoreOut:
    """(patient_id, year_month) 기준 upsert — 같은 달이 있으면 갱신, 없으면 생성."""
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    row = (
        db.query(MealScore)
        .filter(
            MealScore.patient_id == patient_id,
            MealScore.year_month == payload.year_month,
        )
        .first()
    )
    if row:
        row.score = payload.score
        row.comment = payload.comment
    else:
        row = MealScore(patient_id=patient_id, **payload.model_dump())
        db.add(row)
    db.commit()
    db.refresh(row)
    return MealScoreOut.model_validate(row)


@router.put("/{score_id}", response_model=MealScoreOut)
def update_meal_score(
    score_id: int,
    payload: MealScoreIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MealScoreOut:
    row = db.get(MealScore, score_id)
    if not row:
        raise HTTPException(status_code=404, detail="식사 점수를 찾을 수 없습니다.")
    row.year_month = payload.year_month
    row.score = payload.score
    row.comment = payload.comment
    db.commit()
    db.refresh(row)
    return MealScoreOut.model_validate(row)


@router.delete("/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_score(
    score_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    row = db.get(MealScore, score_id)
    if not row:
        raise HTTPException(status_code=404, detail="식사 점수를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
