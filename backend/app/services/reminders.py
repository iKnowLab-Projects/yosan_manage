"""외래 진료일 자동 알림.

등록일(PatientProfile.created_at)로부터 6/12/18/24개월 후를 외래 진료일로 보고,
그 '일주일 전'이 오늘이면 마일스톤별 안내 알림을 발송한다. (매일 1회 실행)
멀티워커 환경에서도 insert-first + unique 로 중복 발송을 방지한다.
"""

import calendar
import logging
from datetime import date, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.data.appointment_messages import (
    CATEGORY,
    LEAD_DAYS,
    MILESTONES,
    message_for,
)
from app.models.appointment_reminder import AppointmentReminder
from app.models.device import DeviceToken
from app.models.notification import Notification
from app.models.patient import PatientProfile
from app.services.push import send_push

logger = logging.getLogger(__name__)


def add_months(d: date, months: int) -> date:
    """월 단위 가산(말일 보정)."""
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    last = calendar.monthrange(y, m)[1]
    return date(y, m, min(d.day, last))


def run_appointment_reminders(db: Session, today: date | None = None) -> int:
    """오늘 발송 대상(진료일 D-7)에게 알림 발송. 발송 건수 반환."""
    today = today or date.today()
    sent = 0

    # 반복 commit 로 ORM 객체가 만료되어도 안전하도록 값을 미리 캡처
    enrollments = [
        (p.user_id, p.created_at.date()) for p in db.query(PatientProfile).all() if p.created_at
    ]
    for user_id, enrollment in enrollments:
        for milestone in MILESTONES:
            appt = add_months(enrollment, milestone)
            if appt - timedelta(days=LEAD_DAYS) != today:
                continue

            # 1) 중복방지 로그를 먼저 insert (unique). 성공한 워커만 실제 발송.
            db.add(
                AppointmentReminder(
                    patient_id=user_id, milestone_month=milestone
                )
            )
            try:
                db.flush()
            except IntegrityError:
                db.rollback()  # 이미 발송됨 → 건너뜀
                continue

            # 2) 알림 저장 + 푸시 발송
            title, body = message_for(milestone)
            tokens = [
                t.token
                for t in db.query(DeviceToken)
                .filter(DeviceToken.user_id == user_id)
                .all()
            ]
            success = send_push(tokens, title, body, data={"category": CATEGORY})
            db.add(
                Notification(
                    sender_id=None,
                    recipient_id=user_id,
                    title=title,
                    body=body,
                    category=CATEGORY,
                    delivered=success > 0,
                )
            )
            db.commit()
            sent += 1

    if sent:
        logger.info("[reminders] 외래 진료일 알림 %d건 발송", sent)
    return sent
