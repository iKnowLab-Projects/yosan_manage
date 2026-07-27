from datetime import date
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.mileage import (
    HOSPITAL_VISIT_INTERVAL,
    LARGE_AMOUNT,
    SMALL_AMOUNT,
    TOTAL_MONTHS,
    MileageCompletion,
    amount_for,
    is_hospital_visit,
)
from app.models.patient import PatientProfile
from app.models.user import User, UserRole
from app.schemas.mileage import (
    MileageMonth,
    MileageSummary,
    MileageToggleIn,
)

router = APIRouter(prefix="/mileage", tags=["mileage"])


def _enrollment_ym(db: Session, patient_id: int) -> int:
    """환자 등록(프로필 생성) 달력 월을 '월 서수'(year*12+month-1)로 반환. 없으면 이번 달."""
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == patient_id)
        .first()
    )
    d = profile.created_at if (profile and profile.created_at) else None
    if d is None:
        t = date.today()
        return t.year * 12 + (t.month - 1)
    return d.year * 12 + (d.month - 1)


def _build_summary(db: Session, patient_id: int) -> MileageSummary:
    rows = (
        db.query(MileageCompletion)
        .filter(MileageCompletion.patient_id == patient_id)
        .all()
    )
    by_month: Dict[int, MileageCompletion] = {r.month_index: r for r in rows}

    # 월차 1 = 등록 달력 월, 이후 매월 순차. 절대 달력 기준으로 '지난 달 미완료'를 X 표시.
    start_ord = _enrollment_ym(db, patient_id)
    today = date.today()
    current_ord = today.year * 12 + (today.month - 1)

    months: List[MileageMonth] = []
    earned = 0
    completed_count = 0
    max_amount = 0
    for m in range(1, TOTAL_MONTHS + 1):
        amount = amount_for(m)
        max_amount += amount
        rec = by_month.get(m)
        if rec:
            earned += amount
            completed_count += 1
        cal_ord = start_ord + (m - 1)
        cal_ym = f"{cal_ord // 12:04d}-{cal_ord % 12 + 1:02d}"
        missed = rec is None and cal_ord < current_ord  # 달력상 지난 달인데 미완료
        months.append(
            MileageMonth(
                month_index=m,
                is_hospital_visit=is_hospital_visit(m),
                amount=amount,
                completed=rec is not None,
                completed_at=rec.completed_at if rec else None,
                note=rec.note if rec else None,
                survey_submission_id=rec.survey_submission_id if rec else None,
                calendar_ym=cal_ym,
                missed=missed,
            )
        )

    # 사이클 = 6개월씩, 모두 채워졌으면 1
    cycles_completed = 0
    for start in range(1, TOTAL_MONTHS + 1, HOSPITAL_VISIT_INTERVAL):
        if all(by_month.get(m) for m in range(start, start + HOSPITAL_VISIT_INTERVAL)):
            cycles_completed += 1

    return MileageSummary(
        total_months=TOTAL_MONTHS,
        completed_count=completed_count,
        earned_amount=earned,
        max_amount=max_amount,
        cycles_completed=cycles_completed,
        months=months,
    )


@router.get("/me", response_model=MileageSummary)
def my_mileage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MileageSummary:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")
    return _build_summary(db, user.id)


@router.get("/patient/{patient_id}", response_model=MileageSummary)
def patient_mileage(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MileageSummary:
    return _build_summary(db, patient_id)


@router.post(
    "/patient/{patient_id}/toggle",
    response_model=MileageSummary,
)
def toggle_completion(
    patient_id: int,
    payload: MileageToggleIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MileageSummary:
    if not (1 <= payload.month_index <= TOTAL_MONTHS):
        raise HTTPException(
            status_code=400,
            detail=f"month_index 는 1..{TOTAL_MONTHS} 범위여야 합니다.",
        )

    existing = (
        db.query(MileageCompletion)
        .filter(
            MileageCompletion.patient_id == patient_id,
            MileageCompletion.month_index == payload.month_index,
        )
        .first()
    )
    if payload.completed:
        if existing:
            if payload.note is not None:
                existing.note = payload.note
        else:
            db.add(
                MileageCompletion(
                    patient_id=patient_id,
                    month_index=payload.month_index,
                    note=payload.note,
                )
            )
    else:
        if existing:
            db.delete(existing)
    db.commit()
    return _build_summary(db, patient_id)


@router.get("/config", response_model=dict, status_code=status.HTTP_200_OK)
def mileage_config():
    """클라이언트가 격자 렌더에 참조할 상수."""
    return {
        "total_months": TOTAL_MONTHS,
        "cycle_length": HOSPITAL_VISIT_INTERVAL,
        "small_amount": SMALL_AMOUNT,
        "large_amount": LARGE_AMOUNT,
    }
