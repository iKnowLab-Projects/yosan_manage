from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.device import DeviceToken
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import DeviceTokenIn, NotificationOut, NotificationSendIn
from app.services.push import send_push

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/device-token", status_code=status.HTTP_204_NO_CONTENT)
def register_device(
    payload: DeviceTokenIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(DeviceToken).filter(DeviceToken.token == payload.token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = payload.platform
    else:
        db.add(DeviceToken(user_id=user.id, token=payload.token, platform=payload.platform))
    db.commit()


@router.post("/send", response_model=List[NotificationOut])
def send_notification(
    payload: NotificationSendIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> List[NotificationOut]:
    if not payload.recipient_ids:
        raise HTTPException(status_code=400, detail="수신자를 1명 이상 지정해야 합니다.")

    recipients = (
        db.query(User)
        .filter(User.id.in_(payload.recipient_ids), User.role == UserRole.PATIENT)
        .all()
    )
    if not recipients:
        raise HTTPException(status_code=404, detail="수신 가능한 환자가 없습니다.")

    tokens = (
        db.query(DeviceToken)
        .filter(DeviceToken.user_id.in_([r.id for r in recipients]))
        .all()
    )
    tokens_by_user: dict[int, list[str]] = {}
    for t in tokens:
        tokens_by_user.setdefault(t.user_id, []).append(t.token)

    saved: list[Notification] = []
    for r in recipients:
        notif = Notification(
            sender_id=admin.id,
            recipient_id=r.id,
            title=payload.title,
            body=payload.body,
            category=payload.category,
        )
        success = send_push(
            tokens_by_user.get(r.id, []),
            payload.title,
            payload.body,
            data={"category": payload.category, "notification_id": "pending"},
        )
        notif.delivered = success > 0
        db.add(notif)
        saved.append(notif)

    db.commit()
    for n in saved:
        db.refresh(n)
    return [NotificationOut.model_validate(n) for n in saved]


@router.get("/me", response_model=List[NotificationOut])
def my_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[NotificationOut]:
    notifs = (
        db.query(Notification)
        .filter(Notification.recipient_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [NotificationOut.model_validate(n) for n in notifs]


@router.post("/{notif_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.get(Notification, notif_id)
    if not notif or notif.recipient_id != user.id:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    notif.read = True
    db.commit()


@router.post("/appointment-reminders/run")
def run_appointment_reminders_now(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    """외래 진료일 알림을 수동으로 즉시 점검·발송(테스트/보정용).

    평소에는 매일 자동 실행되며, 중복 발송은 DB unique 로 방지된다.
    """
    from app.services.reminders import run_appointment_reminders

    return {"sent": run_appointment_reminders(db)}


@router.get("/appointment-reminders/status")
def appointment_reminders_status(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    """환자별 외래 마일스톤 일정 + 알림 발송 현황(관리자 현황판)."""
    from app.services.reminders import appointment_schedule

    return appointment_schedule(db)
