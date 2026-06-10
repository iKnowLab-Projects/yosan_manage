"""Expo Push Service 연동.

모바일 앱은 `Notifications.getExpoPushTokenAsync()` 로 `ExponentPushToken[...]`
형태의 토큰을 발급받아 백엔드에 등록한다. 이 토큰은 FCM 토큰이 아니므로
Firebase Admin SDK 로는 보낼 수 없고, Expo Push Service 엔드포인트에 직접
POST 해야 한다.
"""

from __future__ import annotations

import logging
from typing import Iterable

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_expo_token(token: str) -> bool:
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


def send_push(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> int:
    """Expo Push 서비스로 알림 전송. 성공 건수 반환."""
    token_list = [t for t in tokens if t and _is_expo_token(t)]
    if not token_list:
        logger.info(
            "[push] 보낼 Expo 토큰 없음 (입력 %d개 중 유효 0개)",
            sum(1 for _ in tokens),
        )
        return 0

    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "default",
            "data": {k: str(v) for k, v in (data or {}).items()},
        }
        for t in token_list
    ]

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            result = resp.json()
    except Exception as exc:
        logger.exception("[push] Expo Push 호출 실패: %s", exc)
        return 0

    tickets = result.get("data", [])
    if not isinstance(tickets, list):
        logger.warning("[push] 예상치 못한 응답 형식: %s", result)
        return 0

    success = sum(1 for r in tickets if r.get("status") == "ok")
    errors = [r for r in tickets if r.get("status") != "ok"]
    if errors:
        logger.warning("[push] %d개 실패: %s", len(errors), errors)
    logger.info("[push] %d/%d 전송 성공", success, len(token_list))
    return success
