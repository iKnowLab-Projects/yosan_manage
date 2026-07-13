# 통풍식이 마일리지 — 요산 환자 모니터링 통합 시스템

요산(통풍) 환자가 매일 자신의 식단과 건강 상태를 보고하고, 관리자는 이를 통합 관리하면서 미보고 환자에게 알림을 보낼 수 있는 풀스택 시스템.

## 📚 문서

| 문서 | 내용 |
|---|---|
| **[REPORT.md](REPORT.md)** | 시스템 설계 및 구현 보고서 — 도메인, ER, API, 모바일 흐름 전반 (현재 v0.4) |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | 운영 배포 가이드 — Caddy + Let's Encrypt + 자체 도메인으로 Cloudflare 임시 터널 종료 |
| **[DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)** | 새 디바이스에서 백지 상태로부터 동일 환경 재현 절차 |
| **[backend/README.md](backend/README.md)** | 백엔드 모듈 사용법 |
| **[web-admin/README.md](web-admin/README.md)** | 관리자 웹 모듈 사용법 |
| **[mobile/README.md](mobile/README.md)** | 모바일 앱 사용법 |
| **[mobile/BUILD.md](mobile/BUILD.md)** | APK 빌드/배포 상세 가이드 |

## 모듈 구성

```
yosan/
├── README.md
├── REPORT.md
├── .gitignore
│
├── backend/                            # FastAPI + PostgreSQL
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│   └── app/
│       ├── __init__.py
│       ├── main.py                     # FastAPI 엔트리, CORS, 라우터 등록
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py               # pydantic-settings 환경설정
│       │   └── security.py             # JWT / bcrypt 헬퍼
│       ├── data/                       # 정적 데이터 (설문 템플릿)
│       │   ├── __init__.py
│       │   └── survey_templates.py     # B군/C군 + MARS-5 문항·선택지
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py              # SQLAlchemy Engine/Session/Base
│       │   └── init_db.py              # 부팅 시 테이블 생성 + 시드 관리자
│       ├── models/                     # SQLAlchemy ORM
│       │   ├── __init__.py
│       │   ├── user.py                 # User + UserRole(admin/patient)
│       │   ├── patient.py              # PatientProfile (+ survey_group)
│       │   ├── report.py               # DailyReport + MealEntry
│       │   ├── device.py               # DeviceToken
│       │   ├── notification.py
│       │   ├── survey.py               # SurveySubmission + SurveyAnswer
│       │   └── mileage.py              # MileageCompletion (+ 금액·사이클 상수)
│       ├── schemas/                    # Pydantic I/O 모델
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── user.py
│       │   ├── report.py
│       │   ├── notification.py
│       │   ├── survey.py
│       │   └── mileage.py
│       ├── services/
│       │   ├── __init__.py
│       │   └── push.py                 # Firebase Admin 래퍼 (+ 스텁 모드)
│       └── api/
│           ├── __init__.py
│           ├── deps.py                 # JWT 인증 + admin/patient 권한 의존성
│           └── v1/
│               ├── __init__.py
│               ├── router.py
│               └── endpoints/
│                   ├── __init__.py
│                   ├── auth.py         # POST /auth/login
│                   ├── patients.py     # 환자 CRUD + 미보고 식별
│                   ├── reports.py      # 일일 보고 upsert/조회
│                   ├── notifications.py # 푸시 발송 + 디바이스 토큰
│                   ├── surveys.py      # 설문 템플릿/제출/이력
│                   └── mileage.py      # 마일리지 조회/토글/config
│
├── web-admin/                          # Next.js 14 (App Router) + Tailwind
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .env.local.example
│   ├── README.md
│   ├── lib/
│   │   └── api.ts                      # fetch 래퍼 + localStorage 세션
│   ├── components/
│   │   ├── AuthGuard.tsx               # 관리자 토큰 검증 + 헤더 UI
│   │   └── MileagePanel.tsx            # 24칸 마일리지 격자 + 클릭 토글
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                    # 토큰 보유 여부에 따라 분기
│       ├── globals.css
│       ├── login/
│       │   └── page.tsx                # 관리자 로그인
│       ├── patients/
│       │   ├── page.tsx                # 환자 목록 + 미보고 강조/필터
│       │   ├── new/
│       │   │   └── page.tsx            # 신규 환자 등록
│       │   └── [id]/
│       │       └── page.tsx            # 환자 상세 + 보고 이력
│       └── notifications/
│           └── page.tsx                # 푸시 발송 (다중 선택)
│
└── mobile/                             # React Native + Expo Router
    ├── package.json
    ├── app.json                        # Expo 설정 (apiBase 포함)
    ├── babel.config.js
    ├── tsconfig.json
    ├── eas.json                        # EAS Build 프로파일 (preview=APK, production=AAB)
    ├── README.md
    ├── BUILD.md                        # APK/IPA 빌드 및 설치 가이드
    ├── lib/
    │   ├── api.ts                      # fetch 래퍼 + AsyncStorage 세션
    │   └── push.ts                     # Expo Push 토큰 발급/등록 (Expo Go 자동 우회)
    └── app/
        ├── _layout.tsx
        ├── index.tsx                   # 로그인 상태에 따라 분기
        ├── (auth)/
        │   └── login.tsx
        └── (app)/
            ├── _layout.tsx             # 탭 네비게이션 + 푸시 권한 요청
            ├── mileage.tsx             # 24개월 마일리지 격자 + 누적 금액
            ├── home.tsx                # 오늘의 식단/건강 보고
            ├── survey.tsx              # B/C군 설문 제출 + 최근 제출 이력
            ├── history.tsx             # 보고 이력
            ├── notifications.tsx       # 관리자 알림함
            └── profile.tsx             # 내 정보 + 로그아웃
```
파일 83개 (백엔드 43 · 웹 관리자 18 · 모바일 19 · 루트 3) — 사용자 제공 xlsx 2개 별도.

| 역할 | 인터페이스 | 위치 |
|---|---|---|
| 관리자 | 웹 대시보드 | `web-admin/` (포트 3000) |
| 환자 | iOS/Android 앱 | `mobile/` (Expo) |
| 데이터/통신 | REST API | `backend/` (내부 포트 26610) |

## 주요 기능

### 환자 (모바일 앱 — "통풍식이 마일리지")
- 이메일/비밀번호 로그인
- **마일리지 현황** — 24개월 × 4 사이클 격자, 매월 채우는 작은 동그라미(3,000원) + 6/12/18/24개월차 큰 동그라미(병원 방문, 5,000원), 누적 금액 표시
- 일일 보고 작성 (수정 가능)
  - 건강: 체중, 요산 수치, 수분 섭취, 운동 시간, 통증 강도/부위, 통풍 발작, 약 복용
  - 식단: 아침/점심/저녁/간식별 음식 내용 및 퓨린 함량 추정
  - 자유 메모
- **설문 제출** — 환자가 배정된 그룹에 따라 다음 중 한 가지를 응답
  - **B군 (저요산식단)**: 식이 빈도 11문항 + MARS-5 복약 행동 5문항
  - **C군 (DASH식단)**: 식이 빈도 11문항 + MARS-5 복약 행동 5문항
- 보고 / 설문 이력 조회
- 관리자가 보낸 푸시 알림 수신 (Expo Notifications)
- 알림함에서 읽음 처리

### 관리자 (웹)
- 로그인
- 환자 목록 (최근 보고일·미보고 일수 표시, 오늘 미보고 강조)
- 환자 등록 (초기 비밀번호 발급 + 의료 프로필 입력 + **설문 그룹 B/C 지정**)
- 환자 상세 + 일일 보고 이력 + **설문 제출 이력** + **마일리지 토글 격자**
- 푸시 알림 발송 (오늘 미보고 일괄 선택 가능)

### 마일리지 구조 (요약)
| 구분 | 단위 | 금액 | 위치 |
|---|---|---|---|
| 매월 미션 | 1개월 | 3,000원 | 1~5, 7~11, 13~17, 19~23 월차 |
| 병원 방문 | 6개월 | 5,000원 | 6, 12, 18, 24 월차 |
| **사이클당** | 6개월 | **20,000원** | 3,000 × 5 + 5,000 × 1 |
| **전체 24개월** | 4 사이클 | **80,000원** | — |

## 빠른 시작

전제: Docker / Node 20+ / Python 3.11+ 가 설치되어 있어야 합니다.

### 1. 백엔드
```powershell
cd backend
docker compose up --build
```
- API: http://localhost:26610
- Swagger: http://localhost:26610/docs
- 시드 관리자: `admin@yosan.local` / `admin1234`

### 2. 관리자 웹
```powershell
cd web-admin
npm install
Copy-Item .env.local.example .env.local
npm run dev
```
http://localhost:3000 → 관리자 계정으로 로그인 → 환자 등록.

### 3. 환자 모바일 (Android APK)

본 프로젝트의 모바일 배포 방식은 **EAS Build로 생성한 APK를 환자 디바이스에 직접 설치**하는 단일 경로입니다. Expo Go는 SDK 53+에서 백그라운드 푸시를 제거했기 때문에 운영은 물론 푸시 테스트 단계에서도 사용하지 않습니다. iOS는 후속 마일스톤에서 다룹니다.

#### 최초 1회 준비
```powershell
cd mobile
npm install
npm install -g eas-cli
eas login                     # 무료 Expo 계정
eas init                      # app.json에 projectId 기입
```

#### 환자 배포용 APK
```powershell
eas build --platform android --profile preview
```
빌드 완료 후 EAS 대시보드의 다운로드 링크 → 카카오톡/USB로 환자 폰 전달 → 설치 → 백그라운드 푸시 정상 동작.

#### 개발 빠른 반복 (선택)
JS 코드를 자주 변경하며 푸시 포함 동작을 디바이스에서 보고 싶다면 dev client APK를 한 번 빌드해 본인 폰에 설치한 뒤, 이후엔 `npx expo start --dev-client` 로 핫리로드:
```powershell
eas build --platform android --profile development
# 빌드된 APK 본인 폰에 설치 (최초 1회)
npx expo start --dev-client
```

> 📡 **백엔드 LAN 접근 설정**
> - `mobile/app.json` 의 `extra.apiBase` 가 공인 IP:포트 (예: `http://210.107.197.58:26610`) 또는 LAN IP (예: `http://192.168.0.152:26610`) 인지 확인
> - Windows 방화벽에서 26610 포트를 같은 네트워크에 허용:
>   ```powershell
>   New-NetFirewallRule -DisplayName "Yosan API 26610" -Direction Inbound -LocalPort 26610 -Protocol TCP -Action Allow
>   ```

#### 개발용 백엔드 연결 — Cloudflare 임시 터널 + OTA(`eas update`)

개발 단계에서는 공인 도메인 없이 **Cloudflare 퀵 터널**로 로컬 백엔드를 외부에 노출하고, 앱에는 **OTA(`eas update`)** 로 접속 주소만 갱신합니다(앱 재빌드 불필요). 단, **터널을 재실행하면 URL이 매번 바뀌므로** 아래 과정을 그때마다 반복합니다.

```powershell
# 1) 백엔드 실행 (포트 26610)
cd backend
docker compose up --build

# 2) Cloudflare 퀵 터널 발급 (cloudflared 설치 필요)
cloudflared tunnel --url http://localhost:26610
#   → 출력된 https://xxxxx.trycloudflare.com 주소를 복사
```

3) `mobile/app.json` 의 `extra.apiBase` 를 발급받은 주소로 교체:
```jsonc
{
  "expo": {
    "extra": {
      "apiBase": "https://xxxxx.trycloudflare.com"
    }
  }
}
```

4) OTA로 반영 — 재빌드 없이 앱을 재시작하면 새 백엔드 주소로 접속:
```powershell
cd mobile
eas update --branch preview --message "apiBase 갱신"
```

> ⚠️ 화면 코드·`apiBase` 등 **JS 변경만이면 `eas update` 로 충분**합니다. APK 재빌드는 아이콘/스플래시/네이티브 의존성이 바뀔 때만 필요합니다.
> ⚠️ 배포용 APK는 `preview` 프로파일(=`preview` 채널)로 빌드하므로 OTA도 반드시 `--branch preview` 로 올려야 해당 기기에 반영됩니다.
> ⚠️ `trycloudflare` 퀵 터널 URL은 재실행 시마다 바뀝니다. 고정 주소가 필요하면 named tunnel 또는 자체 도메인(운영 배포: [`DEPLOYMENT.md`](DEPLOYMENT.md))을 사용하세요.
> 📎 백엔드가 이미지 업로드(`/uploads`)를 정적 서빙하므로, 앱에서 카드뉴스·InBody 이미지도 이 터널 주소를 통해 그대로 로드됩니다.

자세한 빌드·서명·OTA 업데이트·문제 해결 가이드: [`mobile/BUILD.md`](mobile/BUILD.md)

## 푸시 알림 설정 (선택)

기본값은 스텁 모드(로그만 출력)로 동작합니다. 실제 발송을 하려면:

1. Firebase 프로젝트 생성 → 서비스 계정 JSON 다운로드
2. `backend/.env` 에 `FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccount.json` 설정
3. 모바일 앱에서 토큰을 등록하면 백엔드가 FCM(Expo Push)을 통해 알림 전송

## 데이터 모델 요약
- `users` (admin/patient, 공용 계정 테이블)
- `patient_profiles` (의료 정보)
- `daily_reports` + `meal_entries` (1:N)
- `device_tokens` (FCM/Expo 토큰)
- `notifications` (관리자 발송 이력)

## API 개요
전체 명세는 `http://localhost:26610/docs` 에서 확인. 핵심:
- `POST /api/v1/auth/login`
- `GET  /api/v1/patients` (admin) — 미보고 환자 식별 포함
- `POST /api/v1/patients` (admin)
- `POST /api/v1/reports` (patient) — 같은 날짜 재보고 시 자동 갱신
- `POST /api/v1/notifications/send` (admin)
- `POST /api/v1/notifications/device-token` (patient)

## 향후 작업 후보
- Alembic 마이그레이션 도입 (현재는 `create_all`로 부팅 시 생성)
- 관리자용 통계 차트 (요산 추이, 발작 빈도)
- 환자 비밀번호 재설정 흐름
- 보고 누락 시 자동 푸시 (스케줄러 / cron)
- 환자별 권장 식단 / 푸린 데이터베이스 연동
