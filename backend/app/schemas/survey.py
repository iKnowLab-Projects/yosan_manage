from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class SurveyQuestion(BaseModel):
    code: str
    text: str
    options: List[str]


class SurveySection(BaseModel):
    title: str
    questions: List[SurveyQuestion]


class SurveyTemplateOut(BaseModel):
    group: Literal["B", "C"]
    name: str
    description: str
    sections: List[SurveySection]


class SurveyAnswerIn(BaseModel):
    question_code: str
    choice_index: int


class SurveySubmitIn(BaseModel):
    check_date: Optional[date] = None  # 미지정 시 서버가 오늘 사용
    notes: Optional[str] = None
    answers: List[SurveyAnswerIn]


class SurveyAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    question_code: str
    choice_index: int
    choice_label: str


class SurveySubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    survey_group: Literal["B", "C"]
    check_date: date
    notes: Optional[str] = None
    submitted_at: datetime
    answers: List[SurveyAnswerOut]
