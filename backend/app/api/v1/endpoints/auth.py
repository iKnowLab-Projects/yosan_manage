from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.password_reset import PasswordResetRequest
from app.models.patient import PatientProfile
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    PasswordResetRequestIn,
    PasswordResetRequestOut,
    PatientRegisterIn,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """환자 본인 계정 삭제(회원 탈퇴). 프로필/보고/설문/마일리지/InBody/알림/조회 등
    연관 데이터는 DB의 ON DELETE CASCADE 로 함께 삭제된다."""
    if user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="환자 계정만 탈퇴할 수 있습니다.",
        )
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 승인 대기 중인 계정입니다.",
        )

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        user_id=user.id,
        name=user.name,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
def register(payload: PatientRegisterIn, db: Session = Depends(get_db)) -> dict:
    """환자 본인이 직접 가입 신청. 관리자 승인 전까지 is_active=False 유지."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        role=UserRole.PATIENT,
        is_active=False,
    )
    db.add(user)
    db.flush()

    profile = PatientProfile(
        user_id=user.id,
        phone=payload.phone,
        birth_date=payload.birth_date,
        gender=payload.gender,
        height_cm=payload.height_cm,
        baseline_weight_kg=payload.baseline_weight_kg,
        baseline_uric_acid=payload.baseline_uric_acid,
        medications=payload.medications,
        notes=payload.notes,
    )
    db.add(profile)
    db.commit()

    return {
        "ok": True,
        "message": "가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
    }


# ===== 비밀번호 초기화 (환자 신청 → 관리자 승인) =====


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
)
def request_password_reset(
    payload: PasswordResetRequestIn,
    db: Session = Depends(get_db),
) -> dict:
    """환자가 비밀번호 초기화 신청.

    - 새 비밀번호는 즉시 해시 후 보관 (평문 보관 X)
    - 같은 사용자의 기존 대기 요청은 자동으로 교체
    - 승인 전까지 user.hashed_password 는 변경되지 않음 → 기존 비밀번호로 로그인 계속 가능
    """
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="비밀번호는 6자 이상이어야 합니다."
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="등록된 이메일이 아닙니다.")
    if user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=403, detail="환자 계정만 초기화 신청 가능합니다."
        )

    db.query(PasswordResetRequest).filter(
        PasswordResetRequest.user_id == user.id
    ).delete()

    req = PasswordResetRequest(
        user_id=user.id,
        new_hashed_password=hash_password(payload.new_password),
        note=payload.note,
    )
    db.add(req)
    db.commit()

    return {
        "ok": True,
        "message": (
            "비밀번호 초기화 신청이 접수되었습니다.\n"
            "관리자 승인 후 새 비밀번호로 로그인할 수 있습니다."
        ),
    }


@router.get(
    "/password-reset/pending",
    response_model=List[PasswordResetRequestOut],
)
def list_pending_resets(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[PasswordResetRequestOut]:
    rows = (
        db.query(PasswordResetRequest, User)
        .join(User, User.id == PasswordResetRequest.user_id)
        .order_by(PasswordResetRequest.requested_at.asc())
        .all()
    )
    return [
        PasswordResetRequestOut(
            id=r.id,
            user_id=r.user_id,
            user_email=u.email,
            user_name=u.name,
            note=r.note,
            requested_at=r.requested_at,
        )
        for r, u in rows
    ]


@router.post(
    "/password-reset/{request_id}/approve",
    status_code=status.HTTP_204_NO_CONTENT,
)
def approve_password_reset(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    req = db.get(PasswordResetRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="초기화 요청을 찾을 수 없습니다.")
    user = db.get(User, req.user_id)
    if not user:
        db.delete(req)
        db.commit()
        raise HTTPException(status_code=404, detail="대상 환자를 찾을 수 없습니다.")
    user.hashed_password = req.new_hashed_password
    db.delete(req)
    db.commit()


@router.delete(
    "/password-reset/{request_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def reject_password_reset(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    req = db.get(PasswordResetRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="초기화 요청을 찾을 수 없습니다.")
    db.delete(req)
    db.commit()
