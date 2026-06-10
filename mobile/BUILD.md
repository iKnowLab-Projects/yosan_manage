# Android APK 빌드 가이드

본 프로젝트의 모바일 배포는 **EAS Build로 생성한 Android APK를 환자 디바이스에 직접 설치**하는 단일 경로입니다. Expo Go는 사용하지 않습니다 — SDK 53+ 부터 백그라운드 푸시가 제거되어 환자가 잠금화면/알림센터에서 알림을 받을 수 없기 때문입니다. iOS 빌드는 본 문서 마지막의 부록에 향후 작업 메모로만 남깁니다.

---

## 0. 사전 준비 (최초 1회)

```powershell
# Node 20+ / npm 설치되어 있다고 가정
npm install -g eas-cli

# Expo 무료 계정 로그인 (없으면 expo.dev 가입)
eas login

# 프로젝트와 EAS 연결 → app.json의 expo.extra.eas.projectId 자동 기입
cd mobile
eas init
```

`mobile/eas.json` 에 세 가지 빌드 프로파일이 이미 정의돼 있습니다.

| 프로파일 | 용도 | 결과물 | 환자 배포 가능 |
|---|---|---|---|
| `development` | 본인 폰에 dev client 설치 후 JS 핫리로드로 개발 | APK | ❌ (개발자 전용) |
| `preview` | 환자에게 배포할 사내 시험 빌드 | **APK** | ✅ |
| `production` | Google Play 정식 업로드용 | AAB | (Play 등록 후) |

---

## 1. 환자 배포용 APK (가장 일반적 경로)

```powershell
cd mobile
eas build --platform android --profile preview
```

- 빌드 시간: 약 10~20분 (EAS 클라우드)
- 완료 후 터미널 또는 EAS 대시보드 (https://expo.dev) 에서 `.apk` 다운로드 링크 표시
- 배포 방법:
  - 카카오톡 / 이메일 / Google Drive 링크로 환자에게 전송 → 실행 → "출처를 알 수 없는 앱 설치 허용" 토글 → 설치
  - USB 케이블이 가능하면 `adb install yosan.apk`
- 환자는 한 번 설치 후 같은 `preview` 채널의 JS 변경분은 다음 실행 시 OTA 로 자동 수신 (재설치 불필요)

---

## 2. 개발용 빠른 반복 (선택)

JS 코드를 자주 바꿔가며 푸시 동작까지 디바이스에서 검증하고 싶다면 dev client APK를 한 번 빌드해 본인 폰에 설치합니다. 이후엔 `expo start` 가 dev client 와 연결돼 JS 핫리로드만으로 작업할 수 있습니다.

```powershell
eas build --platform android --profile development
# 빌드된 APK를 본인 폰에 설치 (최초 1회)
npx expo start --dev-client
```

폰의 dev client 앱을 열면 자동으로 Metro 번들러에 붙어 코드 변경이 즉시 반영됩니다. 푸시 알림 동작도 dev client에서 정상 검증 가능합니다.

---

## 3. OTA 업데이트 (네이티브 변경 없을 때)

새 패키지를 추가하거나 `app.json` plugins 를 손대지 않았다면 JS/TS 변경은 다시 빌드할 필요 없이 OTA 로 즉시 배포:

```powershell
eas update --branch preview --message "설문 문항 텍스트 수정"
```

설치된 앱은 다음 실행 시 자동으로 신규 번들을 받아 적용합니다. 환자에게 재설치를 요청할 필요 없음.

빌드 vs OTA 판단:
- **빌드 필요**: 새 라이브러리 설치, `app.json`의 `plugins`/`android`/`ios` 변경, 네이티브 모듈 추가
- **OTA 충분**: JS/TS 코드, 스타일, 텍스트, 이미지 자산 변경

---

## 4. 푸시 알림 동작 확인

APK 설치 후:

1. 환자 계정으로 로그인 → 첫 진입 시 알림 권한 팝업 허용
2. 백엔드 로그 또는 DB의 `device_tokens` 테이블에 Expo Push Token 1행 등록 확인
3. 관리자 웹 → 알림 발송 → 해당 환자 선택 → "알림 발송"
4. 디바이스 잠금화면 / 알림 센터에 표시되면 성공

동작하지 않을 때:
- 백엔드 `.env` 의 `FIREBASE_CREDENTIALS_PATH` 가 실제 서비스 계정 JSON 경로를 가리키는지 확인 (미설정이면 스텁 모드라 실제 발송되지 않음)
- 폰 설정 → 앱 정보 → "통풍식이 마일리지" → 알림 권한 ON
- 배터리 최적화 설정에서 앱이 "최적화 안 함" 상태인지 (특히 삼성/샤오미 등 OEM)

---

## 5. 자주 만나는 빌드 문제

| 증상 | 해결 |
|---|---|
| `eas init` 시 projectId 충돌 | 기존 `app.json` 의 `extra.eas.projectId` 삭제 후 재실행 |
| Gradle 메모리 부족 | EAS 클라우드 빌드에서는 거의 없음. 로컬 빌드라면 `gradle.properties`에 `org.gradle.jvmargs=-Xmx4g` |
| `Default FirebaseApp is not initialized` | google-services.json 누락 — 운영 푸시를 쓸 때만 필요. dev/preview 빌드에서는 Expo Push 채널 사용이라 무관 |
| APK 설치 시 "앱이 설치되지 않았습니다" | 이전 버전이 이미 깔려 있고 서명이 다른 경우. 기존 앱 제거 후 재설치 |
| LAN 환경에서 백엔드 접속 실패 | PC 방화벽에서 8000 포트 허용 / `app.json` 의 `apiBase` 와 PC IP 일치 확인 |

---

## 부록. iOS (향후 마일스톤)

iOS 빌드는 본 마일스톤 범위 밖이지만 동일한 EAS 워크플로로 처리됩니다. **Apple Developer Program ($99/년) 멤버십이 반드시 필요**합니다.

```powershell
eas build --platform ios --profile preview
eas submit --platform ios --latest    # TestFlight 업로드
```

배포 옵션:
- TestFlight 내부 테스터로 환자 초대
- Ad-hoc 프로비저닝 (소수 UDID)

지금은 Android 트랙에 집중하므로 Apple Developer 가입은 보류해도 무방합니다.
