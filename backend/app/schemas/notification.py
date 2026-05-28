from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class NotificationSendIn(BaseModel):
    recipient_ids: List[int]
    title: str
    body: str
    category: str = "reminder"


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sender_id: Optional[int] = None
    recipient_id: int
    title: str
    body: str
    category: str
    delivered: bool
    read: bool
    created_at: datetime


class DeviceTokenIn(BaseModel):
    token: str
    platform: str
