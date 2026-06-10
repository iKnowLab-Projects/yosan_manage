# 통풍식이 마일리지 — 환자 모바일 앱 (React Native / Expo)

본 앱은 **EAS Build로 생성한 Android APK를 환자 디바이스에 직접 설치**하는 방식으로 배포합니다. **Expo Go는 사용하지 않습니다** — SDK 53+ 부터 백그라운드 푸시 알림이 제거되어 환자가 잠금화면/알림센터에서 메시지를 받을 수 없기 때문입니다. iOS는 후속 마일스톤에서 진행합니다.

## APK 빌드 (모든 사용 케이스)

### 최초 1회
```powershell
npm install
npm install -g eas-cli
eas login
eas init
```

### 환자 배포용 APK
```powershell
eas build --platform android --profile preview
```
완료 후 다운로드 링크로 APK 받아 환자에게 전달.

### 개발 빠른 반복 (선택)
```powershell
eas build --platform android --profile development   # 본인 폰에 1회 설치
npx expo start --dev-client                          # 이후 JS 핫리로드
```

자세한 절차·OTA 업데이트·문제 해결: [`BUILD.md`](BUILD.md)

## API 베이스 변경
`app.json` 의 `expo.extra.apiBase` 값이 PC의 LAN IP와 일치해야 합니다.

| 환경 | apiBase |
|---|---|
| 공인 IP (포트포워딩 경로) | `http://<공인 IP>:26610` ← 현재: `http://210.107.197.58:26610` |
| 실 디바이스 (같은 LAN) | `http://<PC LAN IP>:26610` (예: `http://192.168.0.152:26610`) |
| Android 에뮬레이터 (개발만) | `http://10.0.2.2:26610` |

PC의 IP는 `ipconfig` 로 확인. 변경 후엔 APK를 다시 빌드해야 반영됨 (또는 `eas update` 로 JS-only OTA 패치).

## 화면
- `(auth)/login` — 환자 로그인
- `(app)/mileage` — **랜딩 탭**, 24개월 마일리지 격자 + 누적 금액
- `(app)/home` — 오늘의 식단/건강 보고
- `(app)/survey` — B/C군 설문 (배정 그룹에 따라 자동 분기)
- `(app)/history` — 보고 이력
- `(app)/notifications` — 관리자 푸시 알림함
- `(app)/profile` — 내 정보 / 로그아웃

## 푸시 알림
- 앱 진입 시 권한 요청 → Expo Push Token 발급 → 백엔드의 `/api/v1/notifications/device-token` 에 등록
- 백엔드는 Firebase Admin SDK 로 발송 (`FIREBASE_CREDENTIALS_PATH` 미설정 시 로그 스텁 — 운영 시 반드시 설정)
- 실 동작 검증은 EAS Build 결과물(APK)에서만 가능. Expo Go에서는 `Constants.appOwnership === "expo"` 감지 시 토큰 발급을 의도적으로 건너뜀
