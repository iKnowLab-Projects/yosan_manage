from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.patient import PatientProfile
from app.models.report import DailyReport
from app.models.user import User, UserRole
from app.schemas.auth import ApproveIn
from app.schemas.user import (
    PatientCreate,
    PatientListItem,
    PatientOut,
    PatientProfileIn,
    PatientProfileOut,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=List[PatientListItem])
def list_patients(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[PatientListItem]:
    today = date.today()

    last_report_subq = (
        select(
            DailyReport.patient_id.label("pid"),
            func.max(DailyReport.report_date).label("last_date"),
        )
        .group_by(DailyReport.patient_id)
        .subquery()
    )

    rows = (
        db.query(User, last_report_subq.c.last_date)
        .outerjoin(last_report_subq, last_report_subq.c.pid == User.id)
        .filter(User.role == UserRole.PATIENT, User.is_active == True)  # noqa: E712
        .order_by(User.created_at.desc())
        .all()
    )

    items: List[PatientListItem] = []
    for user, last_date in rows:
        days = None
        missed_today = True
        if last_date is not None:
            days = (today - last_date).days
            missed_today = last_date < today
        items.append(
            PatientListItem(
                id=user.id,
                email=user.email,
                name=user.name,
                is_active=user.is_active,
                last_report_date=last_date,
                days_since_last_report=days,
                missed_today=missed_today,
            )
        )
    return items


@router.get("/pending", response_model=List[PatientOut])
def list_pending(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[PatientOut]:
    """가입 신청 후 승인 대기 중인 환자 목록."""
    users = (
        db.query(User)
        .options(joinedload(User.patient_profile))
        .filter(User.role == UserRole.PATIENT, User.is_active == False)  # noqa: E712
        .order_by(User.created_at.asc())
        .all()
    )
    return [_to_patient_out(u) for u in users]


@router.post("/{patient_id}/approve", response_model=PatientOut)
def approve_patient(
    patient_id: int,
    payload: ApproveIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PatientOut:
    """가입 신청 환자 승인 + 설문 그룹 지정."""
    user = (
        db.query(User)
        .options(joinedload(User.patient_profile))
        .filter(User.id == patient_id, User.role == UserRole.PATIENT)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    user.is_active = True
    if user.patient_profile:
        user.patient_profile.survey_group = payload.survey_group
    db.commit()
    db.refresh(user)
    return _to_patient_out(user)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    """환자 계정 삭제 (가입 거절 / 탈퇴 처리). cascade로 프로필·보고·설문·마일리지 모두 함께 삭제."""
    user = (
        db.query(User)
        .filter(User.id == patient_id, User.role == UserRole.PATIENT)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    db.delete(user)
    db.commit()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PatientOut:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        role=UserRole.PATIENT,
    )
    db.add(user)
    db.flush()

    profile = PatientProfile(user_id=user.id, **payload.profile.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(user)
    return _to_patient_out(user)


@router.get("/me", response_model=PatientOut)
def me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PatientOut:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")
    return _to_patient_out(user)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PatientOut:
    user = (
        db.query(User)
        .options(joinedload(User.patient_profile))
        .filter(User.id == patient_id, User.role == UserRole.PATIENT)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    return _to_patient_out(user)


@router.put("/{patient_id}/profile", response_model=PatientProfileOut)
def update_profile(
    patient_id: int,
    payload: PatientProfileIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PatientProfileOut:
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return PatientProfileOut.model_validate(profile)


def _to_patient_out(user: User) -> PatientOut:
    profile_out = (
        PatientProfileOut.model_validate(user.patient_profile) if user.patient_profile else None
    )
    return PatientOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        profile=profile_out,
    )
