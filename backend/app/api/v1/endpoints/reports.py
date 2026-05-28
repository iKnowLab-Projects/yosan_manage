from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.report import DailyReport, MealEntry
from app.models.user import User, UserRole
from app.schemas.report import DailyReportIn, DailyReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=DailyReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: DailyReportIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DailyReportOut:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자만 보고할 수 있습니다.")

    existing = (
        db.query(DailyReport)
        .filter(DailyReport.patient_id == user.id, DailyReport.report_date == payload.report_date)
        .first()
    )

    if existing:
        for key, value in payload.model_dump(exclude={"meals"}).items():
            setattr(existing, key, value)
        existing.meals.clear()
        db.flush()
        for meal in payload.meals:
            existing.meals.append(MealEntry(**meal.model_dump()))
        report = existing
    else:
        report = DailyReport(
            patient_id=user.id,
            **payload.model_dump(exclude={"meals"}),
        )
        for meal in payload.meals:
            report.meals.append(MealEntry(**meal.model_dump()))
        db.add(report)

    db.commit()
    db.refresh(report)
    return DailyReportOut.model_validate(report)


@router.get("/me", response_model=List[DailyReportOut])
def my_reports(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=365),
) -> List[DailyReportOut]:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자만 조회 가능합니다.")
    reports = (
        db.query(DailyReport)
        .options(joinedload(DailyReport.meals))
        .filter(DailyReport.patient_id == user.id)
        .order_by(DailyReport.report_date.desc())
        .limit(limit)
        .all()
    )
    return [DailyReportOut.model_validate(r) for r in reports]


@router.get("/me/today", response_model=Optional[DailyReportOut])
def my_today(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자만 조회 가능합니다.")
    today = date.today()
    report = (
        db.query(DailyReport)
        .options(joinedload(DailyReport.meals))
        .filter(DailyReport.patient_id == user.id, DailyReport.report_date == today)
        .first()
    )
    return DailyReportOut.model_validate(report) if report else None


@router.get("/patient/{patient_id}", response_model=List[DailyReportOut])
def patient_reports(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    limit: int = Query(60, ge=1, le=365),
) -> List[DailyReportOut]:
    reports = (
        db.query(DailyReport)
        .options(joinedload(DailyReport.meals))
        .filter(DailyReport.patient_id == patient_id)
        .order_by(DailyReport.report_date.desc())
        .limit(limit)
        .all()
    )
    return [DailyReportOut.model_validate(r) for r in reports]
