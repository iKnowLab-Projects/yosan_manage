# 요산 환자 모니터링 통합 시스템

요산(통풍) 환자가 매일 자신의 식단과 건강 상태를 보고하고, 관리자는 이를 통합 관리하면서 미보고 환자에게 알림을 보낼 수 있는 풀스택 시스템.

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
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py              # SQLAlchemy Engine/Session/Base
│       │   └── init_db.py              # 부팅 시 테이블 생성 + 시드 관리자
│       ├── models/                     # SQLAlchemy ORM
│       │   ├── __init__.py
│       │   ├── user.py                 # User + UserRole(admin/patient)
│       │   ├── patient.py              # PatientProfile
│       │   ├── report.py               # DailyReport + MealEntry
│       │   ├── device.py               # DeviceToken
│       │   └── notification.py
│       ├── schemas/                    # Pydantic I/O 모델
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── user.py
│       │   ├── report.py
│       │   └── notification.py
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
│                   └── notifications.py # 푸시 발송 + 디바이스 토큰
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
│   │   └── AuthGuard.tsx               # 관리자 토큰 검증 + 헤더 UI
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
    ├── README.md
    ├── lib/
    │   ├── api.ts                      # fetch 래퍼 + AsyncStorage 세션
    │   └── push.ts                     # Expo Push 토큰 발급/등록
    └── app/
        ├── _layout.tsx
        ├── index.tsx                   # 로그인 상태에 따라 분기
        ├── (auth)/
        │   └── login.tsx
        └── (app)/
            ├── _layout.tsx             # 탭 네비게이션 + 푸시 권한 요청
            ├── home.tsx                # 오늘의 식단/건강 보고
            ├── history.tsx             # 보고 이력
            ├── notifications.tsx       # 관리자 알림함
            └── profile.tsx             # 내 정보 + 로그아웃
```
파일 70개 (백엔드 35 · 웹 관리자 17 · 모바일 15 · 루트 3).

| 역할 | 인터페이스 | 위치 |
|---|---|---|
| 관리자 | 웹 대시보드 | `web-admin/` (포트 3000) |
| 환자 | iOS/Android 앱 | `mobile/` (Expo) |
| 데이터/통신 | REST API | `backend/` (포트 8000) |

## 주요 기능

### 환자 (모바일 앱)
- 이메일/비밀번호 로그인
- 일일 보고 작성 (수정 가능)
  - 건강: 체중, 요산 수치, 수분 섭취, 운동 시간, 통증 강도/부위, 통풍 발작, 약 복용
  - 식단: 아침/점심/저녁/간식별 음식 내용 및 퓨린 함량 추정
  - 자유 메모
- 보고 이력 조회
- 관리자가 보낸 푸시 알림 수신 (Expo Notifications)
- 알림함에서 읽음 처리

### 관리자 (웹)
- 로그인
- 환자 목록 (최근 보고일·미보고 일수 표시, 오늘 미보고 강조)
- 환자 등록 (초기 비밀번호 발급 + 의료 프로필 입력)
- 환자 상세 + 일일 보고 이력
- 푸시 알림 발송 (오늘 미보고 일괄 선택 가능)

## 빠른 시작

전제: Docker / Node 20+ / Python 3.11+ 가 설치되어 있어야 합니다.

### 1. 백엔드
```powershell
cd backend
docker compose up --build
```
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- 시드 관리자: `admin@yosan.local` / `admin1234`

### 2. 관리자 웹
```powershell
cd web-admin
npm install
Copy-Item .env.local.example .env.local
npm run dev
```
http://localhost:3000 → 관리자 계정으로 로그인 → 환자 등록.

### 3. 환자 모바일
```powershell
cd mobile
npm install
npx expo start
```
Expo Go 또는 시뮬레이터로 접속. 관리자가 등록해 준 환자 계정으로 로그인.

> ⚠️ Android 에뮬레이터에서 백엔드에 접속하려면 `mobile/app.json`의 `extra.apiBase`가 `http://10.0.2.2:8000` 으로 설정되어야 합니다. iOS 시뮬레이터는 `http://localhost:8000`을 사용합니다.

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
전체 명세는 `http://localhost:8000/docs` 에서 확인. 핵심:
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
