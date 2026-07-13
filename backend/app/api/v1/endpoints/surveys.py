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
    """설문 제출 시 이번 달 마일리지 미션(다음 미완료 월)을 자동 완료 처리.

    한 달에 1회만 진행하는 미션이므로, 같은 달에 이미 제출 이력이 있으면
    중복 완료를 방지한다. (프론트도 월 1회로 제한하지만 백엔드에서도 방어)
    """
    month_start = check_date.replace(day=1)
    if check_date.month == 12:
        next_start = check_date.replace(year=check_date.year + 1, month=1, day=1)
    else:
        next_start = check_date.replace(month=check_date.month + 1, day=1)

    submissions_this_month = (
        db.query(SurveySubmission)
        .filter(
            SurveySubmission.patient_id == patient_id,
            SurveySubmission.check_date >= month_start,
            SurveySubmission.check_date < next_start,
        )
        .count()
    )
    # 방금 커밋한 제출 포함. 이번이 이번 달 첫 제출이 아니면 건너뜀.
    if submissions_this_month != 1:
        return

    completed = {
        r.month_index
        for r in db.query(MileageCompletion)
        .filter(MileageCompletion.patient_id == patient_id)
        .all()
    }
    for m in range(1, TOTAL_MONTHS + 1):
        if m not in completed:
            db.add(
                MileageCompletion(
                    patient_id=patient_id,
                    month_index=m,
                    note="설문 제출 자동 완료",
                    survey_submission_id=submission_id,
                )
            )
            db.commit()
            break


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
