from typing import List

from pydantic import BaseModel


class ViewIn(BaseModel):
    content_type: str  # cardnews | notification
    content_id: int


class CardNewsViewStat(BaseModel):
    content_id: int
    title: str
    count: int


class PatientViewStat(BaseModel):
    patient_id: int
    name: str
    cardnews_views: int
    notification_views: int
    total: int


class ViewSummaryOut(BaseModel):
    cardnews_total: int
    notification_total: int
    by_cardnews: List[CardNewsViewStat]
    by_patient: List[PatientViewStat]
