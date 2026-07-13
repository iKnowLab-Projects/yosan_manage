from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.inbody import InBodyResult
from app.models.user import User, UserRole
from app.schemas.inbody import InBodyIn, InBodyOut

router = APIRouter(prefix="/inbody", tags=["inbody"])


@router.get("/me", response_model=List[InBodyOut])
def my_inbody(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[InBodyOut]:
    """환자 본인 InBody 결과 목록 (최신순). 열람 전용."""
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")
    rows = (
        db.query(InBodyResult)
        .filter(InBodyResult.patient_id == user.id)
        .order_by(InBodyResult.measured_date.desc(), InBodyResult.id.desc())
        .all()
    )
    return [InBodyOut.model_validate(r) for r in rows]


@router.get("/patient/{patient_id}", response_model=List[InBodyOut])
def patient_inbody(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[InBodyOut]:
    rows = (
        db.query(InBodyResult)
        .filter(InBodyResult.patient_id == patient_id)
        .order_by(InBodyResult.measured_date.desc(), InBodyResult.id.desc())
        .all()
    )
    return [InBodyOut.model_validate(r) for r in rows]


@router.post(
    "/patient/{patient_id}",
    response_model=InBodyOut,
    status_code=status.HTTP_201_CREATED,
)
def create_inbody(
    patient_id: int,
    payload: InBodyIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> InBodyOut:
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    row = InBodyResult(patient_id=patient_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return InBodyOut.model_validate(row)


@router.put("/{result_id}", response_model=InBodyOut)
def update_inbody(
    result_id: int,
    payload: InBodyIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> InBodyOut:
    row = db.get(InBodyResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="InBody 결과를 찾을 수 없습니다.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return InBodyOut.model_validate(row)


@router.delete("/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inbody(
    result_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    row = db.get(InBodyResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="InBody 결과를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
