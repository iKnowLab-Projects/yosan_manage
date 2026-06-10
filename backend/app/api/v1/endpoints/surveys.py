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
from app.models.patient import PatientProfile
from app.models.survey import SurveyAnswer, SurveySubmission
from app.models.user import User, UserRole
from app.schemas.survey import (
    SurveySubmissionOut,
    SurveySubmitIn,
    SurveyTemplateOut,
)

router = APIRouter(prefix="/surveys", tags=["surveys"])


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
