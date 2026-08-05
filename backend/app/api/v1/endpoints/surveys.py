from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.data.survey_templates import (
    TEMPLATES,
    all_question_codes,
    get_template,
    question_options,
)
from app.db.session import get_db
from app.models.mileage import TOTAL_MONTHS, MileageCompletion
from app.models.patient import PatientProfile
from app.models.survey import SurveyAnswer, SurveySubmission
from app.models.user import User, UserRole
from app.schemas.survey import (
    SurveySubmissionOut,
    SurveySubmitIn,
    SurveyTemplateOut,
)

router = APIRouter(prefix="/surveys", tags=["surveys"])


def _auto_complete_mileage(
    db: Session, patient_id: int, check_date: date, submission_id: int
) -> None:
    """설문 제출 시, 제출한 달력 월에 해당하는 마일리지 월차를 완료 처리.

    월차 1 = 환자 등록(프로필 생성) 달력 월, 이후 매월 순차(절대 달력 기준).
    같은 달 슬롯이 이미 완료돼 있으면(월 1회) 건너뛴다.
    """
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == patient_id)
        .first()
    )
    d = profile.created_at if (profile and profile.created_at) else None
    start_ord = (
        (d.year * 12 + d.month - 1)
        if d
        else (check_date.year * 12 + check_date.month - 1)
    )
    idx = (check_date.year * 12 + check_date.month - 1) - start_ord + 1
    if idx < 1 or idx > TOTAL_MONTHS:
        return

    existing = (
        db.query(MileageCompletion)
        .filter(
            MileageCompletion.patient_id == patient_id,
            MileageCompletion.month_index == idx,
        )
        .first()
    )
    if existing:
        return

    db.add(
        MileageCompletion(
            patient_id=patient_id,
            month_index=idx,
            note="설문 제출 자동 완료",
            survey_submission_id=submission_id,
        )
    )
    db.commit()


def _patient_group(db: Session, user: User) -> str:
    profile = (
        db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
    )
    if not profile or not profile.survey_group:
        raise HTTPException(
            status_code=400,
            detail="설문 그룹(B/C)이 지정되지 않았습니다. 관리자에게 문의해 주세요.",
        )
    return profile.survey_group


@router.get("/template", response_model=SurveyTemplateOut)
def my_template(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SurveyTemplateOut:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")
    group = _patient_group(db, user)
    tpl = get_template(group)
    if not tpl:
        raise HTTPException(status_code=500, detail="설문 템플릿 누락")
    return tpl  # type: ignore[return-value]


@router.get("/template/{group}", response_model=SurveyTemplateOut)
def template_by_group(
    group: str,
    _: User = Depends(require_admin),
) -> SurveyTemplateOut:
    tpl = get_template(group)
    if not tpl:
        raise HTTPException(status_code=404, detail="존재하지 않는 설문 그룹")
    return tpl  # type: ignore[return-value]


@router.post(
    "",
    response_model=SurveySubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
def submit(
    payload: SurveySubmitIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SurveySubmissionOut:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자만 제출할 수 있습니다.")

    group = _patient_group(db, user)
    valid_codes = all_question_codes(group)

    submitted_codes = {a.question_code for a in payload.answers}
    missing = valid_codes - submitted_codes
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"누락된 응답: {sorted(missing)}",
        )
    unknown = submitted_codes - valid_codes
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"이 그룹에 없는 문항: {sorted(unknown)}",
        )

    submission = SurveySubmission(
        patient_id=user.id,
        survey_group=group,
        check_date=payload.check_date or date.today(),
        notes=payload.notes,
    )

    for a in payload.answers:
        opts = question_options(group, a.question_code)
        if opts is None or not (0 <= a.choice_index < len(opts)):
            raise HTTPException(
                status_code=400,
                detail=f"{a.question_code}의 choice_index 범위 오류",
            )
        submission.answers.append(
            SurveyAnswer(
                question_code=a.question_code,
                choice_index=a.choice_index,
                choice_label=opts[a.choice_index],
            )
        )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    # 설문 제출 → 이번 달 마일리지 미션 자동 완료(체크). 해당 제출과 연결한다.
    _auto_complete_mileage(db, user.id, submission.check_date, submission.id)

    return SurveySubmissionOut.model_validate(submission)


@router.get("/me", response_model=List[SurveySubmissionOut])
def my_submissions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[SurveySubmissionOut]:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="환자 계정 전용입니다.")
    rows = (
        db.query(SurveySubmission)
        .options(joinedload(SurveySubmission.answers))
        .filter(SurveySubmission.patient_id == user.id)
        .order_by(SurveySubmission.check_date.desc(), SurveySubmission.id.desc())
        .all()
    )
    return [SurveySubmissionOut.model_validate(r) for r in rows]


@router.get("/submission/{submission_id}", response_model=SurveySubmissionOut)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SurveySubmissionOut:
    """단일 설문 제출 조회. 환자는 본인 것만, 관리자는 전체 열람 가능."""
    row = (
        db.query(SurveySubmission)
        .options(joinedload(SurveySubmission.answers))
        .filter(SurveySubmission.id == submission_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="설문 제출을 찾을 수 없습니다.")
    if user.role == UserRole.PATIENT and row.patient_id != user.id:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return SurveySubmissionOut.model_validate(row)


@router.post(
    "/patient/{patient_id}",
    response_model=SurveySubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_submit_for_patient(
    patient_id: int,
    payload: SurveySubmitIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> SurveySubmissionOut:
    """관리자가 환자를 대신하여 설문을 입력한다(대면 작성 등)."""
    patient = db.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다.")
    profile = (
        db.query(PatientProfile)
        .filter(PatientProfile.user_id == patient_id)
        .first()
    )
    if not profile or not profile.survey_group:
        raise HTTPException(
            status_code=400,
            detail="환자의 설문 그룹(B/C)이 지정되지 않았습니다.",
        )
    group = profile.survey_group
    valid_codes = all_question_codes(group)

    submitted_codes = {a.question_code for a in payload.answers}
    missing = valid_codes - submitted_codes
    if missing:
        raise HTTPException(status_code=400, detail=f"누락된 응답: {sorted(missing)}")
    unknown = submitted_codes - valid_codes
    if unknown:
        raise HTTPException(
            status_code=400, detail=f"이 그룹에 없는 문항: {sorted(unknown)}"
        )

    submission = SurveySubmission(
        patient_id=patient_id,
        survey_group=group,
        check_date=payload.check_date or date.today(),
        notes=payload.notes,
    )
    for a in payload.answers:
        opts = question_options(group, a.question_code)
        if opts is None or not (0 <= a.choice_index < len(opts)):
            raise HTTPException(
                status_code=400,
                detail=f"{a.question_code}의 choice_index 범위 오류",
            )
        submission.answers.append(
            SurveyAnswer(
                question_code=a.question_code,
                choice_index=a.choice_index,
                choice_label=opts[a.choice_index],
            )
        )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    _auto_complete_mileage(db, patient_id, submission.check_date, submission.id)
    return SurveySubmissionOut.model_validate(submission)


@router.get("/patient/{patient_id}", response_model=List[SurveySubmissionOut])
def patient_submissions(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[SurveySubmissionOut]:
    rows = (
        db.query(SurveySubmission)
        .options(joinedload(SurveySubmission.answers))
        .filter(SurveySubmission.patient_id == patient_id)
        .order_by(SurveySubmission.check_date.desc(), SurveySubmission.id.desc())
        .all()
    )
    return [SurveySubmissionOut.model_validate(r) for r in rows]


@router.get("/groups", response_model=List[str])
def list_groups(_: User = Depends(require_admin)) -> List[str]:
    return sorted(TEMPLATES.keys())
