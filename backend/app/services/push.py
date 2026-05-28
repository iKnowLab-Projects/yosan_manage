from __future__ import annotations

import logging
from typing import Iterable

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False
_firebase_messaging = None


def _try_init_firebase() -> bool:
    global _firebase_initialized, _firebase_messaging
    if _firebase_initialized:
        return _firebase_messaging is not None
    _firebase_initialized = True

    if not settings.firebase_credentials_path:
        logger.info("Firebase credentials not configured; push notifications will be logged only.")
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        cred = credentials.Certificate(settings.firebase_credentials_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _firebase_messaging = messaging
        return True
    except Exception as exc:
        logger.warning("Failed to initialize Firebase: %s", exc)
        return False


def send_push(tokens: Iterable[str], title: str, body: str, data: dict | None = None) -> int:
    """Send a push to the given device tokens. Returns number of successful sends."""
    token_list = [t for t in tokens if t]
    if not token_list:
        return 0

    if not _try_init_firebase() or _firebase_messaging is None:
        logger.info("[push:stub] title=%s body=%s tokens=%d", title, body, len(token_list))
        return len(token_list)

    messages = [
        _firebase_messaging.Message(
            notification=_firebase_messaging.Notification(title=title, body=body),
            token=t,
            data={k: str(v) for k, v in (data or {}).items()},
        )
        for t in token_list
    ]
    response = _firebase_messaging.send_each(messages)
    return response.success_count
