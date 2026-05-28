# 요산 모니터링 — 환자 모바일 앱 (Expo / React Native)

## 실행
```powershell
npm install
npx expo start
```
- iOS: 시뮬레이터 또는 Expo Go 앱에서 QR 스캔
- Android: 에뮬레이터(에뮬레이터의 호스트는 `10.0.2.2`로 백엔드 접근) 또는 Expo Go

## API 베이스 변경
`app.json`의 `expo.extra.apiBase` 값을 환경에 맞게 수정하세요.

| 환경 | apiBase 예시 |
|---|---|
| Android 에뮬레이터 | `http://10.0.2.2:8000` |
| iOS 시뮬레이터 | `http://localhost:8000` |
| 실제 디바이스 (같은 LAN) | `http://192.168.X.X:8000` |

## 화면
- `(auth)/login` — 환자 로그인
- `(app)/home` — 오늘의 식단/건강 보고 작성·수정
- `(app)/history` — 보고 이력
- `(app)/notifications` — 관리자 푸시 알림함
- `(app)/profile` — 내 정보 / 로그아웃

## 푸시 알림
- `expo-notifications`로 Expo Push Token 발급 후 백엔드의 `/api/v1/notifications/device-token`에 등록
- 실 기기에서만 동작 (시뮬레이터에서는 토큰 발급 불가)
