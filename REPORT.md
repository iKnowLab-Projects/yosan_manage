# 통풍식이 마일리지 — 시스템 설계 및 구현 보고서

문서 버전 0.4 · 2026-06-10

> **v0.4 변경 요약 (현재)**
> - **운영 배포 인프라 완성**: `backend/docker-compose.prod.yml` + `Caddyfile` + `.env.production.example` 추가. Caddy 가 Let's Encrypt 자동 발급으로 HTTPS 처리. 개발용 Cloudflare quick tunnel 영구 종료 가능
> - **푸시 알림 정식 동작**: 백엔드 `services/push.py` 를 Firebase Admin 에서 **Expo Push Service HTTP API** 로 재작성. EAS Credentials 에 Firebase FCM V1 서비스 계정 키 등록 완료. 실 기기 백그라운드/잠금 화면 푸시 검증됨
> - **회원가입 + 관리자 승인 흐름**: 환자가 모바일에서 직접 가입 신청 → `is_active=false` 로 저장 → 관리자 웹의 "가입 요청" 페이지에서 검토·설문 그룹 지정 후 승인. `/api/v1/auth/register`, `/patients/pending`, `/patients/{id}/approve`, `DELETE /patients/{id}` 4종 엔드포인트 신설
> - **비밀번호 초기화 — 환자 신청 / 관리자 승인**: 환자가 모바일에서 새 비밀번호와 함께 신청 (즉시 bcrypt 해시, 평문 미보관) → 관리자 웹 "비밀번호 초기화" 메뉴에서 본인 확인 후 승인. 신규 테이블 `password_reset_requests` (사용자당 1건 unique), `/api/v1/auth/password-reset/*` 4종 엔드포인트 신설. 승인 전엔 기존 비밀번호로 계속 로그인 가능
> - **월간(monthly) 주기 명시**: 마일리지/설문 모두 "월 1회" 단위임이 UI 에 명확하게 드러나도록 정리. 마일리지 alert 제목 "이번 달 미션", 설문 화면은 이번 달에 이미 제출한 기록이 있으면 폼 숨김 + 제출 완료 패널 + 다음 작성 가능 월 안내 + 응답 요약 표시 (다중 제출 클라이언트 잠금)
> - **모바일 UX 단순화**: "보고" / "이력" 탭 제거. 마일리지 화면은 한 화면에 1 사이클만 표시(←/→ 네비게이션), 현재 진행해야 할 월차는 초록 점선 + ▶ 표시로 강조, 탭하면 "전화 연결 / 설문 작성 / 취소" 이지선다. 금액(원) 표시는 모두 삭제
> - **에러 가시성 강화**: 모바일 fetch wrapper 가 네트워크 실패 시 시도한 URL 을 alert 에 함께 표시. 관리자 웹의 환자 상세에 "설문 그룹 변경" 인라인 편집기 추가
> - 문서: `DEPLOYMENT.md` (운영 배포 가이드), `DEVELOPMENT_SETUP.md` (새 디바이스 부트스트랩 가이드) 신설

> **v0.3 변경 요약**
> - 모바일 앱 이름을 **"통풍식이 마일리지"** 로 변경 (`mobile/app.json`)
> - **마일리지 점검 기능** 추가: 24개월 × 4 사이클 격자, 매월 3,000원 작은 동그라미 + 6/12/18/24개월차 5,000원 큰 동그라미(병원 방문). 사이클당 20,000원, 전체 80,000원
> - `mileage_completions` 테이블 신규, `/api/v1/mileage/*` 4종 엔드포인트, 관리자 토글 UI와 환자 격자 화면 추가
> - 카드뉴스 기능은 본 마일스톤에서 의도적으로 제외

> **v0.2 변경 요약**
> - 환자 그룹별 설문지(B군 = 저요산식단, C군 = DASH식단)와 공통 MARS-5 복약 행동 척도를 시스템에 통합
> - `PatientProfile.survey_group` 컬럼, `survey_submissions / survey_answers` 테이블, `/api/v1/surveys/*` 4종 엔드포인트 추가
> - 모바일 앱에 "설문" 탭 추가, 관리자 웹의 환자 등록/상세에 설문 그룹·이력 표시
> - 배포 모델 변경: Expo Go가 SDK 53+ 부터 백그라운드 푸시를 제거 → **EAS Build로 APK/IPA를 만들어 직접 설치**하는 방식을 정식 채택 (`mobile/eas.json` + `mobile/BUILD.md`)

---

## 1. 개요

### 1.1 배경
요산(통풍) 질환자는 식이·수분·운동·약물 복용이 발작 빈도와 직결되기 때문에 **매일** 자신의 식단과 건강 상태를 점검·기록할 필요가 있다. 그러나 기존 운영 방식은 환자가 관리자에게 **전화로 보고**하는 형태이므로 다음과 같은 한계가 있었다.

- 어떤 환자가 며칠째 보고를 하지 않았는지 관리자가 즉시 파악하기 어려움
- 보고 내용이 비정형 텍스트/구두로 축적되어 추세 분석이 불가능
- 미보고 환자에게 개별 연락 시 운영 비용이 크게 증가

### 1.2 목표
- 환자는 **모바일 앱**으로 1일 1회 식단·건강 상태를 디지털 보고
- 관리자는 **웹 콘솔**에서 전 환자의 보고 상태를 한 화면에서 파악
- 관리자는 **미보고 환자에게 푸시 알림으로 독촉**할 수 있어야 함
- 모든 데이터는 서버에 저장되어 추후 통계/분석에 사용 가능해야 함

### 1.3 범위 (MVP)
| 영역 | 포함 | 보류 |
|---|---|---|
| 환자 인증 | 이메일/비밀번호 로그인, **자가 가입 신청 + 관리자 승인 (v0.4)**, **비밀번호 초기화 신청 + 관리자 승인 (v0.4)** | 소셜 로그인, 자동 본인 인증(SMS/이메일 OTP) |
| 보고 | 식단(아침/점심/저녁/간식) + 건강(체중·요산·통증·복약 등) | 음성/사진 업로드, 푸린 DB 자동 매칭 |
| **설문** | **B군(저요산식단) / C군(DASH식단) FFQ 11문항 + MARS-5 5문항, 그룹별 템플릿 분기, 응답 저장** | **자동 점수화·통계 리포트, 주기적 알림 트리거** |
| **마일리지** | **24개월 격자(소 3,000 / 대 5,000) · 누적 금액 표시 · 관리자 토글** | **자동 적립(설문/보고 제출 연계), 송금 자동화, 환자 자가 신청** |
| **카드뉴스** | — | 본 마일스톤에서 제외 |
| 관리자 | 환자 등록·목록·상세, 설문 그룹 지정, 미보고 식별, 푸시 발송, **마일리지 토글** | 통계 차트, 권한 분리(슈퍼관리자 등) |
| 푸시 | Expo Push / FCM 발송, 토큰 등록, 알림함, **EAS Build APK/IPA 배포** | 자동 스케줄러(미보고 자동 푸시), 인앱 채팅 |

---

## 2. 시스템 아키텍처

### 2.1 전체 구성도
```
            ┌──────────────────────┐
            │  관리자 (브라우저)   │
            │  Next.js 14 SPA      │
            └─────────┬────────────┘
                      │ HTTPS / REST
                      ▼
┌──────────────────────────────────────────┐
│  FastAPI 백엔드 (Python 3.11)             │
│  ├ JWT 인증 · 역할 분기 (admin/patient)  │
│  ├ SQLAlchemy 2.x ORM                    │
│  └ Firebase Admin (푸시 발송, 옵션)      │
└────────────┬────────────────┬────────────┘
             │                │
             ▼                ▼
   ┌──────────────────┐  ┌────────────────────┐
   │  PostgreSQL 16   │  │  Expo Push / FCM   │
   └──────────────────┘  └─────────┬──────────┘
                                   │ Push
                                   ▼
                       ┌──────────────────────┐
                       │   환자 (iOS/Android) │
                       │   Expo / RN 앱       │
                       └──────────────────────┘
```

### 2.2 모듈 책임
| 모듈 | 디렉터리 | 책임 |
|---|---|---|
| 백엔드 | `backend/` | 인증, 도메인 모델, REST API, 푸시 발송, DB 마이그레이션 |
| 관리자 웹 | `web-admin/` | 관리자 인증 UI, 환자 관리/대시보드, 알림 발송 UI |
| 환자 모바일 | `mobile/` | 환자 인증, 일일 보고 입력, 보고 이력, 푸시 수신 |

### 2.3 통신 프로토콜
- **모든 클라이언트 ↔ 백엔드**: HTTPS 위의 JSON REST. 인증은 `Authorization: Bearer <JWT>`.
- **백엔드 ↔ 푸시 서비스**: Firebase Admin SDK (`messaging.send_each`). 자격증명 미설정 시 로그 스텁으로 폴백.
- **DB**: SQLAlchemy + psycopg2 (PostgreSQL).

---

## 3. 기술 스택 선정 근거

| 컴포넌트 | 선택 | 근거 |
|---|---|---|
| 백엔드 | **FastAPI + PostgreSQL** | OpenAPI 자동 생성, Pydantic 검증, 의료 데이터 처리에 강한 Python 생태계, 트랜잭션 안정성 |
| 관리자 웹 | **Next.js 14 (App Router) + Tailwind** | 빠른 개발, TypeScript 통일, SSR 옵션 보유, 디자인 시스템 부담 ↓ |
| 모바일 | **React Native + Expo Router** | 단일 코드베이스로 iOS/Android 동시 지원, Expo Notifications로 푸시 인프라 구축 비용 최소화 |
| 인증 | **JWT (HS256)** | 모바일/웹 동일 토큰, 서버 stateless |
| 푸시 | **Firebase Admin (FCM) / Expo Push** | Expo 토큰 → FCM 위임. 운영 진입 비용 낮음 |
| 컨테이너 | **Docker Compose** | DB + API를 1 커맨드로 기동 |

---

## 4. 디렉터리 구조

v0.4 기준 전체 소스 파일의 완전한 트리. 빌드 산출물(`mobile/dist/`), 런타임 자격증명(`google-services.json`, Firebase 서비스 계정 JSON), 운영 비밀(`.env.production`), npm/next 가 생성하는 lockfile·`next-env.d.ts` 는 별도이며 `.gitignore` 처리됨. 사용자 제공 xlsx 2개도 별도 보관.

```
yosan/
├── README.md                            # 모듈 구성 + 빠른 시작 + 문서 인덱스
├── REPORT.md                            # 본 문서
├── DEPLOYMENT.md                        # 운영 배포 가이드 (Caddy + Let's Encrypt) — v0.4
├── DEVELOPMENT_SETUP.md                 # 새 디바이스 부트스트랩 가이드 — v0.4
├── .gitignore                           # .env.production, google-services.json, *firebase-adminsdk* 등 제외
│
├── backend/                            # FastAPI + PostgreSQL  ── 47 files (v0.4)
│   ├── Dockerfile
│   ├── docker-compose.yml               # 개발 (포트 26610 노출, uvicorn --reload)
│   ├── docker-compose.prod.yml          # 운영 (Caddy + 워커4, 백엔드 포트 비노출) — v0.4
│   ├── Caddyfile                        # 리버스 프록시 + Let's Encrypt — v0.4
│   ├── requirements.txt                 # FastAPI / SQLAlchemy / Pydantic / passlib[bcrypt] / httpx
│   ├── .env.example                     # 개발용 환경변수 템플릿
│   ├── .env.production.example          # 운영용 환경변수 템플릿 — v0.4
│   ├── README.md
│   └── app/
│       ├── __init__.py
│       ├── main.py                      # FastAPI 엔트리, CORS, 라우터 등록, startup 훅
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py                # pydantic-settings 기반 Settings + lru_cache
│       │   └── security.py              # hash_password / verify / JWT encode·decode
│       ├── data/                        # 정적 데이터 (DB로 이전 가능)
│       │   ├── __init__.py
│       │   └── survey_templates.py      # B군/C군 FFQ + MARS-5 문항·선택지 상수
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py               # SQLAlchemy Engine·SessionLocal·Base + get_db()
│       │   └── init_db.py               # create_all() + 시드 관리자 자동 생성
│       ├── models/                      # SQLAlchemy 2.x ORM (Mapped 타이핑)
│       │   ├── __init__.py
│       │   ├── user.py                  # User + UserRole enum + is_active
│       │   ├── patient.py               # PatientProfile (+ survey_group: 'B'|'C'|None)
│       │   ├── report.py                # DailyReport + MealEntry + MealType enum (보존)
│       │   ├── device.py                # DeviceToken (token unique)
│       │   ├── notification.py
│       │   ├── survey.py                # SurveySubmission + SurveyAnswer (1:N)
│       │   ├── mileage.py               # MileageCompletion (+ TOTAL_MONTHS / 금액 상수 / 헬퍼)
│       │   └── password_reset.py        # PasswordResetRequest (user_id unique) — v0.4
│       ├── schemas/                     # Pydantic I/O DTO
│       │   ├── __init__.py
│       │   ├── auth.py                  # LoginRequest / TokenResponse / PatientRegisterIn /
│       │   │                            #   ApproveIn / PasswordResetRequestIn / Out — v0.4 확장
│       │   ├── user.py                  # PatientCreate / PatientOut / PatientListItem 등
│       │   ├── report.py                # DailyReportIn/Out + MealEntryIn/Out
│       │   ├── notification.py          # NotificationSendIn / DeviceTokenIn 등
│       │   ├── survey.py                # SurveyTemplateOut / SurveySubmitIn / SurveySubmissionOut
│       │   └── mileage.py               # MileageSummary / MileageMonth / MileageToggleIn
│       ├── services/
│       │   ├── __init__.py
│       │   └── push.py                  # Expo Push HTTP API 호출 (v0.4 재작성)
│       └── api/
│           ├── __init__.py
│           ├── deps.py                  # oauth2_scheme + get_current_user / require_admin / require_patient
│           └── v1/
│               ├── __init__.py
│               ├── router.py            # /api/v1 prefix + 6개 라우터 include
│               └── endpoints/
│                   ├── __init__.py
│                   ├── auth.py          # login / register / password-reset/* — v0.4 확장
│                   ├── patients.py      # 환자 CRUD + 미보고 식별 + pending/approve/delete — v0.4 확장
│                   ├── reports.py       # upsert (POST), 본인/특정환자 이력 (GET) — 백엔드 보존
│                   ├── notifications.py # device-token / send / me / read
│                   ├── surveys.py       # 그룹별 template / submit / me / patient/{id} / groups
│                   └── mileage.py       # me / patient/{id} / patient/{id}/toggle / config
│
├── web-admin/                          # Next.js 14 (App Router)  ── 21 files (v0.4)
│   ├── package.json
│   ├── next.config.mjs                  # NEXT_PUBLIC_API_BASE 주입
│   ├── tailwind.config.ts               # brand 컬러 팔레트 확장
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .env.local.example               # 개발용
│   ├── .env.production.example          # 운영용 (Vercel 등 호스팅) — v0.4
│   ├── README.md
│   ├── lib/
│   │   └── api.ts                       # fetch 래퍼 + localStorage 세션 + 도메인 타입
│   ├── components/
│   │   ├── AuthGuard.tsx                # admin 토큰 검증 + 4개 메뉴 네비 — v0.4 확장
│   │   │                                #   (환자 관리 / 가입 요청 / 비밀번호 초기화 / 알림 발송)
│   │   └── MileagePanel.tsx             # 24칸 격자 + 토글 호출 + 진행률 헤더 (금액 표시 제거)
│   └── app/
│       ├── layout.tsx                   # 한글 폰트 폴백 (Noto Sans KR)
│       ├── page.tsx                     # 로그인 여부에 따라 분기
│       ├── globals.css
│       ├── login/
│       │   └── page.tsx                 # 관리자 로그인 (admin 외 차단)
│       ├── patients/
│       │   ├── page.tsx                 # 목록 + 미보고 강조 + 필터
│       │   ├── new/page.tsx             # 신규 환자 등록 (관리자 직접 생성)
│       │   └── [id]/page.tsx            # 환자 상세 + 설문그룹 인라인 편집 + 마일리지 토글
│       ├── pending/
│       │   └── page.tsx                 # 가입 요청 검토 + 설문그룹 지정 + 승인/거절 — v0.4
│       ├── password-resets/
│       │   └── page.tsx                 # 비밀번호 초기화 요청 검토 + 승인/거절 — v0.4
│       └── notifications/
│           └── page.tsx                 # 다중 수신자 선택 + "오늘 미보고 전체" 원클릭
│
└── mobile/                             # React Native + Expo Router  ── 19 files (v0.4)
    ├── package.json
    ├── app.json                         # Expo SDK 54 / extra.apiBase / FCM google-services.json 경로
    ├── babel.config.js
    ├── tsconfig.json
    ├── eas.json                         # EAS Build 프로파일: development / preview(APK) / production(AAB)
    ├── README.md
    ├── BUILD.md                         # APK 빌드 + 설치 + OTA 업데이트 가이드
    ├── lib/
    │   ├── api.ts                       # fetch 래퍼 + AsyncStorage 세션 + 도메인 타입
    │   └── push.ts                      # Expo Go 환경 자동 우회 + 권한 요청 + 토큰 등록
    └── app/
        ├── _layout.tsx                  # SafeAreaProvider + Stack
        ├── index.tsx                    # 로그인 상태에 따라 분기 (→ /(app)/mileage 또는 /(auth)/login)
        ├── (auth)/
        │   ├── login.tsx                # 환자 로그인 + "가입 신청" + "비밀번호 초기화" 링크
        │   ├── register.tsx             # 가입 신청 (이메일/비밀번호/이름/의료 정보) — v0.4
        │   └── reset-password.tsx       # 비밀번호 초기화 신청 — v0.4
        └── (app)/
            ├── _layout.tsx              # Tabs 4개 (마일리지/설문/알림/내정보) + 푸시 권한/토큰 등록
            ├── mileage.tsx              # 1 사이클씩 격자 + 현재 미션 강조 + 이지선다 — v0.4 재설계
            │                            #   (home.tsx, history.tsx 는 v0.4 에서 삭제)
            ├── survey.tsx               # B/C군 설문 + 월 1회 잠금 + 제출 완료 패널 — v0.4 재작성
            ├── notifications.tsx        # 알림함 + 탭 시 read 처리
            └── profile.tsx              # 의료 프로필 + 로그아웃
```

**구성 요약** (v0.4): 백엔드 47 · 웹 관리자 21 · 모바일 19 · 루트 5 = **총 92개 파일** (xlsx 원본 2개 별도 보관).

**v0.3 → v0.4 변동**:
- **추가**: 루트 2 (DEPLOYMENT, DEVELOPMENT_SETUP), 백엔드 4 (.env.production.example, Caddyfile, docker-compose.prod.yml, models/password_reset.py), 웹 3 (.env.production.example, app/pending, app/password-resets), 모바일 2 (register, reset-password) = +11
- **삭제**: 모바일 2 (app/(app)/home.tsx, app/(app)/history.tsx) = -2
- **순 증가**: +9 (83 → 92)

---

## 5. 데이터 모델

### 5.1 ER 다이어그램
```
┌──────────┐ 1   1 ┌──────────────────┐
│  users   ├───────┤ patient_profiles │  (+ survey_group: 'B' | 'C' | NULL)
│ (admin/  │       └──────────────────┘
│  patient)│
│          │ 1   N ┌──────────────────┐ 1   N ┌──────────────┐
│          ├───────┤  daily_reports   ├───────┤ meal_entries │
│          │       └──────────────────┘       └──────────────┘
│          │ 1   N ┌────────────────────┐ 1  N ┌────────────────┐
│          ├───────┤ survey_submissions ├──────┤ survey_answers │
│          │       └────────────────────┘      └────────────────┘
│          │ 1   N ┌──────────────────────┐
│          ├───────┤ mileage_completions  │  (patient_id + month_index unique)
│          │       └──────────────────────┘
│          │ 1   1 ┌──────────────────────────┐
│          ├───────┤ password_reset_requests  │  (user_id unique — 사용자당 1건)
│          │       └──────────────────────────┘
│          │ 1   N ┌──────────────────┐
│          ├───────┤  device_tokens   │
│          │       └──────────────────┘
│          │ 1   N ┌──────────────────┐
│          ├───────┤  notifications   │ (recipient_id)
└──────────┘       └──────────────────┘
```

### 5.2 테이블 명세

#### `users`
| 컬럼 | 타입 | 제약/비고 |
|---|---|---|
| id | int PK | |
| email | varchar(255) | unique, index |
| hashed_password | varchar(255) | bcrypt |
| name | varchar(100) | |
| role | enum | `admin` / `patient` |
| is_active | bool | 기본 true |
| created_at | timestamptz | server_default now() |

#### `patient_profiles` (1:1 with users)
요산 환자에 한정된 의료 정보를 별도 테이블로 분리해 admin 계정 row가 불필요한 NULL을 갖지 않도록 함.
| 컬럼 | 타입 |
|---|---|
| user_id (FK→users, unique, CASCADE) | int |
| phone | varchar(30) |
| birth_date | date |
| gender | varchar(10) |
| height_cm | float |
| baseline_weight_kg | float |
| baseline_uric_acid | float |
| medications | text |
| notes | text |
| **survey_group** | **varchar(1)** — `'B'` (저요산식단) / `'C'` (DASH식단) / `NULL`(미지정) |
| created_at / updated_at | timestamptz |

#### `daily_reports`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| patient_id (FK→users) | int | index |
| report_date | date | index |
| weight_kg | float | |
| uric_acid | float | 자가 측정 수치 |
| water_intake_ml | int | |
| exercise_minutes | int | |
| pain_level | int | 0~10 |
| pain_location | varchar(100) | |
| flare_up | bool | 통풍 발작 여부 |
| medication_taken | bool | |
| notes | text | |
| created_at / updated_at | timestamptz | |

> **upsert 규칙**: `(patient_id, report_date)`가 동일하면 같은 row를 갱신(meals는 전량 교체). 인덱스/유니크 제약은 운영 단계에서 마이그레이션으로 추가 권장.

#### `meal_entries` (N:1 with daily_reports)
| 컬럼 | 타입 |
|---|---|
| report_id (FK→daily_reports, CASCADE) | int |
| meal_type | enum (`breakfast` / `lunch` / `dinner` / `snack`) |
| description | text |
| purine_estimate | varchar(20) |

#### `device_tokens`
환자별 다중 디바이스를 허용하면서 동일 토큰의 중복 등록을 막기 위해 `token` 컬럼에 unique 제약.
| 컬럼 | 타입 |
|---|---|
| user_id (FK→users) | int |
| token | varchar(512) unique |
| platform | varchar(20) (`ios` / `android` / `web`) |
| created_at | timestamptz |

#### `notifications`
| 컬럼 | 타입 |
|---|---|
| sender_id (FK→users, SET NULL) | int |
| recipient_id (FK→users, CASCADE) | int, index |
| title | varchar(200) |
| body | text |
| category | varchar(40) (`reminder` / `alert` / `general`) |
| delivered | bool |
| read | bool |
| created_at | timestamptz |

#### `survey_submissions`
설문지 1회 제출에 대응. 환자는 동일 날짜에 여러 번 제출할 수 있다 (덮어쓰기 정책 미적용, 시계열 분석 우선).
| 컬럼 | 타입 |
|---|---|
| patient_id (FK→users, CASCADE) | int, index |
| survey_group | varchar(1) (`B` / `C`) |
| check_date | date, index |
| notes | text |
| submitted_at | timestamptz |

#### `survey_answers` (N:1 with survey_submissions)
| 컬럼 | 타입 |
|---|---|
| submission_id (FK→survey_submissions, CASCADE) | int, index |
| question_code | varchar(40) — `B_FOOD_1..11`, `C_FOOD_1..11`, `MARS_1..5` |
| choice_index | int — 0-based |
| choice_label | varchar(200) — 사후 텍스트 분석을 위해 라벨 원문도 동시 저장 |

#### `mileage_completions`
환자가 24개월 마일리지 프로그램의 특정 월차를 완료했을 때 1 row.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| patient_id (FK→users, CASCADE) | int | index |
| month_index | int | 1..24 |
| note | varchar(200) | 관리자 메모 (옵션) |
| completed_at | timestamptz | server_default now() |
| **UNIQUE** | (patient_id, month_index) | `uq_mileage_patient_month` |

**파생 규칙**:
- `is_hospital_visit(m) := m % 6 == 0` → 6, 12, 18, 24월차가 큰 동그라미(병원 방문)
- `amount(m) := 5000 if hospital else 3000`
- 사이클 = 6개월. 한 사이클 모두 채우면 20,000원, 전체 4 사이클 = 80,000원

이 규칙들은 `backend/app/models/mileage.py` 상단에 상수와 헬퍼로 정의되어 있어 클라이언트가 별도로 가져갈 필요 없이 백엔드가 응답에 amount/is_hospital_visit 을 함께 내려 준다.

> **v0.4 모바일 UI 정책**: 환자에게 금액(원) 표시는 노출하지 않고 "월차 / 사이클" 단위 진행률만 표시. 동기 부여를 위한 적립 표시는 관리자 웹에서만 유지 (`MileagePanel` 의 누적 금액 헤더).

#### `password_reset_requests` (v0.4 신규)
환자가 신청한 비밀번호 초기화 대기 항목. 관리자 승인 시 `users.hashed_password` 를 덮어쓰고 row 삭제. 거절 시 row 만 삭제.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | |
| user_id (FK→users, CASCADE) | int | index |
| new_hashed_password | varchar(255) | 환자가 입력한 새 비밀번호의 bcrypt 해시. 평문은 어디에도 보관되지 않음 |
| note | text | 신청 사유 (선택) |
| requested_at | timestamptz | server_default now() |
| **UNIQUE** | (user_id) | `uq_password_reset_user` — 사용자당 1건만 유지, 재신청 시 백엔드가 기존 row 삭제 후 새로 insert |

**라이프사이클**: 신청 → 대기 → 승인(`POST .../approve` → `user.hashed_password` 갱신 후 row 삭제) 또는 거절(`DELETE .../{id}` → row 삭제). 별도 audit 테이블은 없음 (필요 시 향후 추가).

### 5.3 설문 템플릿 데이터
설문 문항 자체는 정적이므로 DB가 아닌 `backend/app/data/survey_templates.py` 의 Python 상수로 보관. 환자에게 노출 시 `GET /api/v1/surveys/template`이 환자의 `survey_group` 에 따라 알맞은 11(식이) + 5(MARS-5) 문항을 한 번에 반환한다. 문항이 자주 바뀌는 운영 환경이라면 `survey_templates` / `survey_questions` / `survey_question_options` 테이블로 이전하는 것이 향후 과제.

### 5.4 라이프사이클
- **부팅 시**: `init_db.init_db()` → `Base.metadata.create_all()` → 시드 관리자 1명 자동 생성.
- **마이그레이션**: MVP에서는 단순화를 위해 `create_all` 사용. **단, `create_all`은 기존 테이블의 컬럼 추가/삭제를 반영하지 않는다.** 이번까지의 변경(v0.2: `patient_profiles.survey_group` / `survey_submissions` / `survey_answers`, v0.3: `mileage_completions`, **v0.4: `password_reset_requests` (신규 테이블이므로 `create_all` 이 자동 생성. 기존 DB 보존)**)을 기존 DB에 적용하려면:
  - 개발: `docker compose down -v` 후 재기동 (볼륨 초기화)
  - 운영: Alembic 도입 또는 수동 `ALTER TABLE`. 운영 진입 전 Alembic 도입을 강력 권장.

---

## 6. 인증 및 권한

### 6.1 로그인 흐름
1. 클라이언트가 `POST /api/v1/auth/login` 에 `{email, password}` 전송
2. 서버는 bcrypt로 해시 비교, 성공 시 JWT(`sub=user_id`, `role`, `exp`) 발급
3. 클라이언트는 로컬 저장소(웹: `localStorage`, 모바일: `AsyncStorage`)에 토큰과 최소 사용자 정보 저장
4. 이후 모든 요청은 `Authorization: Bearer <JWT>` 헤더 첨부

### 6.2 권한 분기
FastAPI 의존성 함수로 구현 (`app/api/deps.py`):
- `get_current_user` — 토큰 디코드 후 활성 사용자 반환
- `require_admin` — `role == admin` 강제 (403 with `"Admin only"`)
- `require_patient` — `role == patient` 강제

이 패턴 덕분에 라우터 함수 시그니처만으로 권한이 가시화된다:
```python
@router.get("")
def list_patients(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    ...
```

### 6.3 보안 고려 사항
- 비밀번호는 bcrypt(work factor 12) 단방향 해시.
- JWT 만료는 `ACCESS_TOKEN_EXPIRE_MINUTES`(기본 24h)로 환경변수화. 운영 시 refresh token 분리 권장.
- CORS는 `CORS_ORIGINS` 환경변수로 화이트리스트화 (기본: localhost 3000/19006).
- 시크릿 키는 `.env`로 분리, `.env.example`만 저장소에 포함.
- 의료 데이터 특성상 운영 단계에서는 **TLS 강제·접근 로그·암호화 백업**이 필수. MVP에서는 코드만 준비.

---

## 7. REST API

### 7.1 인증
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/auth/login` | 공개 | 이메일/비밀번호 → JWT |

### 7.2 환자
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/v1/patients` | admin | 환자 목록 + `last_report_date`, `days_since_last_report`, `missed_today` |
| POST | `/api/v1/patients` | admin | 환자 계정 + 의료 프로필 생성 |
| GET | `/api/v1/patients/{id}` | admin | 환자 단건 + 프로필 |
| PUT | `/api/v1/patients/{id}/profile` | admin | 의료 프로필 부분 갱신 |
| GET | `/api/v1/patients/me` | patient | 본인 프로필 |

미보고 환자 식별 쿼리는 `daily_reports.patient_id` 별 MAX(report_date) 서브쿼리와 LEFT JOIN으로 한 번에 계산하여 N+1을 회피한다.

### 7.3 일일 보고
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/reports` | patient | 보고 생성 또는 같은 날짜 갱신(upsert) |
| GET | `/api/v1/reports/me?limit=30` | patient | 최근 N개 보고 이력 |
| GET | `/api/v1/reports/me/today` | patient | 오늘 보고 단건 (없으면 `null`) |
| GET | `/api/v1/reports/patient/{id}` | admin | 특정 환자의 보고 이력 |

### 7.4 인증 — 자가 가입 / 관리자 승인 (v0.4 추가)
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/auth/register` | 공개 | 환자 자가 가입. 이메일·비밀번호·이름·의료 정보 입력. `is_active=False` 로 저장 |
| GET | `/api/v1/patients/pending` | admin | 미승인 가입자 목록 (의료 프로필 포함) |
| POST | `/api/v1/patients/{id}/approve` | admin | `survey_group(B/C)` 지정 + `is_active=True` |
| DELETE | `/api/v1/patients/{id}` | admin | 환자 계정 + 연관 데이터(cascade) 삭제 (가입 거절 또는 탈퇴) |

미승인 계정으로 로그인 시도 시 백엔드는 `403 — "관리자 승인 대기 중인 계정입니다."` 응답.

### 7.4.1 비밀번호 초기화 — 환자 신청 / 관리자 승인 (v0.4 추가)
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/auth/password-reset/request` | 공개 | 환자가 이메일 + 새 비밀번호 + 사유(선택) 로 초기화 신청. 새 비번은 즉시 해시 후 보관 |
| GET | `/api/v1/auth/password-reset/pending` | admin | 대기 중인 초기화 신청 목록 (환자 이름·이메일·사유 포함) |
| POST | `/api/v1/auth/password-reset/{id}/approve` | admin | 승인. `user.hashed_password` 를 신청된 새 해시로 덮어쓰고 요청 row 삭제 |
| DELETE | `/api/v1/auth/password-reset/{id}` | admin | 거절. 요청 row 만 삭제, 비번 그대로 |

데이터 모델: `password_reset_requests` (`UniqueConstraint(user_id)` 로 사용자당 1건만 유지. 재신청 시 자동 교체)

흐름:
1. 환자가 모바일 로그인 화면 → "비밀번호 초기화" → 이메일 + 새 비밀번호 입력 → 신청
2. 신청 중 환자는 **기존 비밀번호로 계속 로그인 가능** (승인 전엔 `user.hashed_password` 미변경)
3. 관리자가 본인 확인 (전화/SMS 등) 후 웹의 "비밀번호 초기화" 메뉴에서 승인 → 즉시 새 비밀번호로 전환
4. 관리자가 거절하면 신청 row 만 삭제, 환자는 알림 없음 (재신청 가능)

**보안 노트:**
- 환자가 보낸 새 비밀번호는 즉시 bcrypt 로 해시. 평문은 어디에도 보관되지 않음
- 관리자는 평문 비밀번호를 알 수 없음 (Y-DB도, 화면도)
- 사용자당 1 row 제약으로 신청 폭주 방지
- 운영에서는 승인 전 본인 확인이 필수 (관리자 UI 가 안내문 표시). 향후 OTP/이메일 인증 추가 검토

### 7.5 알림 / 푸시
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/notifications/device-token` | 로그인 | Expo Push Token 등록 (idempotent — 동일 token 은 user_id 만 갱신) |
| POST | `/api/v1/notifications/send` | admin | 다수 환자에게 푸시 + 알림함 적재 |
| GET | `/api/v1/notifications/me` | 로그인 | 본인 알림함 |
| POST | `/api/v1/notifications/{id}/read` | 로그인 | 알림 읽음 처리 |

**푸시 송신 경로 (v0.4 재작성):**
1. 백엔드가 `device_tokens` 에서 수신자의 Expo Push Token 조회
2. `https://exp.host/--/api/v2/push/send` 에 POST (token list, title, body, sound, priority, data)
3. Expo Push Service 가 Android FCM 으로 라우팅 (EAS Credentials 에 등록된 FCM V1 서비스 계정 키 사용)
4. FCM → 폰 OS → 잠금화면/알림센터 표시

v0.3 이전엔 백엔드가 Firebase Admin SDK 로 직접 FCM 호출을 시도했지만, Expo Push Token 은 FCM 토큰이 아니므로 호출이 실패. v0.4 에서 정식 흐름으로 교체.

### 7.5 설문
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/v1/surveys/template` | patient | 본인의 `survey_group` 에 맞는 템플릿 (B 또는 C) 조회 |
| GET | `/api/v1/surveys/template/{group}` | admin | 임의 그룹의 템플릿 조회 (관리자 확인용) |
| GET | `/api/v1/surveys/groups` | admin | 사용 가능한 그룹 목록 (`["B","C"]`) |
| POST | `/api/v1/surveys` | patient | 설문 제출 — 누락/허위 질문 코드 검증 후 저장 |
| GET | `/api/v1/surveys/me` | patient | 본인 제출 이력 |
| GET | `/api/v1/surveys/patient/{id}` | admin | 특정 환자의 제출 이력 |

**검증 규칙**
- 제출 시 환자에게 배정된 그룹의 **모든 질문 코드가 응답에 포함되어야 함** (누락 시 400)
- 응답 코드가 해당 그룹에 속하지 않으면 400
- `choice_index` 가 옵션 배열 범위를 벗어나면 400
- 응답 저장 시 코드별 옵션 라벨을 함께 적재 → 향후 문항/옵션 텍스트가 변경되어도 과거 응답의 의미가 유지됨

### 7.6 OpenAPI
- 서버 부팅 후 `http://localhost:26610/docs` (Swagger UI), `/redoc` (ReDoc).
- 모든 요청/응답이 Pydantic 모델 기반이므로 스키마가 자동 정합.

### 7.6 마일리지
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/v1/mileage/me` | patient | 본인의 24개월 진행 상태 + 누적/최대 금액 + 완료 사이클 수 |
| GET | `/api/v1/mileage/patient/{id}` | admin | 특정 환자의 마일리지 요약 |
| POST | `/api/v1/mileage/patient/{id}/toggle` | admin | `{month_index, completed, note?}` 로 특정 월차 토글, 갱신된 요약 반환 |
| GET | `/api/v1/mileage/config` | 공개 | 클라이언트 격자 렌더용 상수 (`total_months=24`, `cycle_length=6`, `small_amount=3000`, `large_amount=5000`) |

응답의 `months[]` 항목은 미완료 월도 포함하므로 클라이언트는 항상 24칸 격자를 안정적으로 렌더할 수 있다.

### 7.7 에러 응답 규약
- FastAPI 기본 `{"detail": "..."}` 사용.
- 한국어 메시지는 사용자 친화적 표현으로 통일 (예: "이미 등록된 이메일입니다.", "환자만 보고할 수 있습니다.", "설문 그룹(B/C)이 지정되지 않았습니다. 관리자에게 문의해 주세요.").

---

## 8. 관리자 웹 (Next.js)

### 8.1 라우팅
| 경로 | 화면 | 비고 |
|---|---|---|
| `/login` | 로그인 | 관리자 외 차단 |
| `/patients` | 환자 목록 | 오늘 미보고 강조, 미보고 필터 |
| `/patients/new` | 환자 등록 | 계정 + 의료 프로필 동시 입력 |
| `/patients/[id]` | 환자 상세 + 보고 이력 | 식단·통증·발작·체중 등 시각화 |
| `/notifications` | 푸시 발송 | "오늘 미보고 전체" 원클릭 선택 |

### 8.2 상태/데이터 관리
- 라이브러리 의존성 최소화를 위해 **외부 상태 라이브러리(Zustand/Redux/SWR) 미사용**. 각 페이지가 마운트 시 fetch.
- 세션: `localStorage` 기반 토큰. `AuthGuard` 컴포넌트가 로그인 여부를 확인하고 비로그인 또는 환자 토큰일 경우 `/login`으로 리다이렉트.
- 입력 폼은 React `useState` 기반의 controlled component.

### 8.3 UI 디자인 원칙
- **임상 운영자 친화**: 빽빽한 표 + 큰 활자 + 색상 라벨(빨강=미보고).
- TailwindCSS 유틸리티만 사용, 디자인 시스템 외부 의존성 없음 (`brand` 컬러 팔레트만 확장).
- Korean glyph rendering을 위해 `globals.css`에서 `Noto Sans KR`/`Apple SD Gothic Neo` 폰트 폴백 설정.

### 8.4 미보고 강조 UX
환자 목록 화면 한 줄에서 다음 세 정보가 동시에 보이도록 설계:
1. `오늘 미보고 / 오늘 보고` 뱃지 (색상 라벨)
2. **미보고 일수** (며칠째인지)
3. 최근 보고일

→ 관리자가 첫 화면 진입 즉시 "오늘 누가 빠졌는지"를 1초 안에 파악할 수 있도록 정렬·필터 동선을 최소화.

---

## 9. 환자 모바일 앱 (React Native / Expo)

### 9.1 라우팅 (Expo Router)
```
app/
├── index.tsx                # 토큰 보유 여부에 따라 분기
├── (auth)/login.tsx
└── (app)/
    ├── _layout.tsx          # 탭 (+ 푸시 권한 요청)
    ├── mileage.tsx          # 24개월 마일리지 (랜딩 탭)
    ├── home.tsx             # 오늘 보고
    ├── survey.tsx           # B/C군 설문 제출
    ├── history.tsx          # 보고 이력
    ├── notifications.tsx    # 알림함
    └── profile.tsx          # 내 정보 / 로그아웃
```
`(auth)` / `(app)` 라우트 그룹 패턴으로 인증 영역과 일반 영역을 자연스럽게 분리. 앱 이름은 `expo.name = "통풍식이 마일리지"` 로 마일리지 기능이 앱의 핵심 정체성임을 표현한다.

### 9.2 일일 보고 UX 설계
환자가 부담을 느끼지 않도록 다음을 채택:
- **빈 값 허용**: 모든 측정치(체중·요산 등)는 Optional. 입력 가능한 항목만 채우면 됨.
- **upsert 모델**: 같은 날 여러 번 열어도 직전 입력이 미리 채워져 있어 "추가 입력"으로 자연스럽게 이어짐.
- **식단은 텍스트 + 퓨린 함량 추정**: 자유 텍스트로 부담 ↓. 향후 푸린 DB와 매칭하여 자동 추정 가능.
- **통풍 발작 / 약 복용 토글**: Switch UI로 한 번 터치 입력.

### 9.3 마일리지 화면 흐름 (v0.4 재설계)

**보고 주기는 "월"(monthly) 단위.** 환자는 한 달에 한 번 설문 작성 또는 전화 보고를 수행한다. 각 동그라미 = 1개월차.

1. 환자가 앱을 열면 가장 먼저 만나는 탭이 "마일리지" (참여 동기 강화 의도)
2. 상단 카드: 완료 월수 / 전체 24월차 / 완료 사이클 수 (금액 표시는 제거)
3. 본문: **한 번에 한 사이클만 표시** (이전엔 4 사이클 동시 표시). `← N번째 사이클 →` 네비게이션
4. 앱 진입 시 **현재 진행할 사이클 자동 선택** (첫 미완료 월차가 포함된 사이클)
5. 채워진 동그라미: 파란색(소) / 주황색(대) + ✓
6. **현재 진행할 월차**: 초록 점선 테두리 + 연두 배경 + ▶ 아이콘. 탭 가능
7. 현재 월차 탭 → Alert (제목: **"이번 달 미션"**, 본문: "한 달에 한 번 진행해요. 어떻게 보고하시겠어요?"): 
   - **"전화 연결"** → `Linking.openURL("tel:010-XXXX-XXXX")` (관리자 전화번호. 환자에게 상시 표시되는 placeholder. 운영 시 OTA 로 실 번호로 교체)
   - **"설문 작성"** → 설문 탭으로 이동 (`router.push("/(app)/survey")`)
   - "취소"
8. **환자 화면에서는 마일리지 토글 불가** — 적립은 관리자 권한 (관리자 웹의 `MileagePanel` 에서 토글)
9. 하단 안내: "▶ 표시된 이번 달 미션을 눌러 시작하세요 / 미션은 매월 1회만 진행됩니다."

### 9.3.1 설문 화면 — 월 1회 제출 잠금 (v0.4)
설문도 동일하게 **월 1회**:
- 클라이언트가 `/api/v1/surveys/me` 응답에서 `check_date` 의 `YYYY-MM` 이 현재 달과 일치하는 제출을 찾는다
- **있으면**: 작성 폼 숨김 → "✅ 이번 달 설문 제출 완료" 패널 + 제출일 + "다음 작성 가능: YYYY년 N월" 안내 + 제출한 응답 요약 표시
- **없으면**: 평소처럼 작성 폼. 배너에 "한 달에 1회 작성" 명시. 제출 버튼 라벨도 "이번 달 설문 제출"
- 백엔드는 다중 제출을 막지 않음 (UI 잠금만). 운영 중 잘못 제출한 환자가 있으면 관리자가 DB 에서 해당 row 삭제하면 다시 작성 가능 — 향후 관리자 웹에 "월 설문 삭제" 기능 추가 검토

### 9.4 탭 구성 (v0.4 단순화)
이전 6개 탭(`마일리지 / 보고 / 설문 / 이력 / 알림 / 내 정보`) 에서 4개로 축소:
- `마일리지` (랜딩, 진행할 미션 강조)
- `설문` (B/C군 그룹별 FFQ + MARS-5)
- `알림` (관리자 푸시 알림함)
- `내 정보` (의료 프로필 + 로그아웃)

`보고` (일일 식이·건강 자유 입력) 와 `이력` (보고 기록) 탭은 v0.4 에서 제거. 환자가 보고할 내용은 모두 설문 탭의 정형화된 폼으로 통일. 향후 자유형 보고 재도입 시 별도 탭 또는 마일리지 액션 시트의 세 번째 옵션으로 추가 가능. 백엔드의 `daily_reports / meal_entries` 모델은 그대로 보존 (관리자 웹 환자 상세에서 과거 데이터 열람 가능).

### 9.4 설문 화면 흐름
1. 환자가 "설문" 탭 진입 → `GET /api/v1/surveys/template` 호출. 환자의 `survey_group` 에 따라 B 또는 C 템플릿이 자동 반환됨. 미배정 시 안내 화면.
2. 각 문항은 라디오 형태로 노출 (단일 선택). 선택지 개수가 문항마다 다르므로(3~5) 동적 렌더링.
3. 모든 문항 응답 후 "설문 제출" → `POST /api/v1/surveys` 로 `{check_date, notes, answers[]}` 전송. 누락이 있으면 클라이언트가 사전 차단.
4. 제출 성공 후 최근 5건 제출 이력을 같은 화면 하단에 노출.

### 9.5 푸시 알림
1. 앱이 `(app)` 진입 시 `registerForPushNotificationsAsync` 호출
2. **Expo Go 환경 자동 우회**: `Constants.appOwnership === "expo"` 인 경우 토큰 발급을 건너뛰고 콘솔 경고 (Expo Go SDK 53+ 에서 원격 푸시 미지원)
3. 실 빌드 환경(EAS Build로 만든 APK/IPA)에서는 권한 요청 → Expo Push Token 발급 → 백엔드 `/api/v1/notifications/device-token` 등록
4. 관리자가 발송하면 Expo Push / FCM → 디바이스 잠금화면/알림센터 도착. 인앱 수신은 `Notifications.addNotificationReceivedListener` 로 처리 가능
5. 알림함 화면에서 미열람 알림 클릭 시 `/{id}/read` 호출

### 9.6 네트워크 베이스 URL
`mobile/app.json`의 `expo.extra.apiBase`로 관리. 디바이스별 호스트 차이를 README 가이드에 명시:
| 환경 | apiBase |
|---|---|
| Android 에뮬레이터 | `http://10.0.2.2:26610` |
| iOS 시뮬레이터 | `http://localhost:26610` |
| 공인 IP (포트포워딩) | `http://<공인 IP>:26610` (예: `http://210.107.197.58:26610`) |
| 실제 디바이스(LAN) | `http://<PC LAN IP>:26610` |

---

### 9.7 배포 모델 (EAS Build + FCM V1)

**Expo Go (SDK 53+)는 원격 푸시 알림을 제거**했기 때문에, 운영 단계에서는 환자 디바이스에 직접 설치 가능한 빌드가 필요하다. 이를 위해 EAS Build를 정식 채택했다.

| 프로파일 | Android | iOS | 용도 |
|---|---|---|---|
| `development` | APK + dev client | simulator | 개발자가 라이브 코드 변경을 즉시 반영 |
| `preview` | **APK** (internal distribution) | IPA (ad-hoc / 내부 TestFlight) | **사내 환자 시험 배포 — 카카오톡/USB로 APK 직접 설치** |
| `production` | AAB | IPA | Play Store / App Store 정식 배포 |

- 빌드 명령: `eas build --platform android --profile preview`
- 빌드는 EAS 클라우드에서 10~20분 소요, 결과는 다운로드 링크로 제공
- JS 코드 변경만 있을 경우 `eas update` 로 OTA 패치 (재빌드 불필요)
- 자세한 절차/트러블슈팅은 `mobile/BUILD.md`

**v0.4 추가 — FCM V1 자격증명 등록 (필수):**
1. Firebase 콘솔에서 프로젝트 생성 → Android 앱 등록 (`com.yosan.monitor`)
2. `google-services.json` 다운로드 → `mobile/` 폴더 (커밋 금지, `.gitignore` 처리됨)
3. `app.json` 의 `android.googleServicesFile = "./google-services.json"` 설정
4. Firebase 설정 → 서비스 계정 → 비공개 키 JSON 다운로드
5. `eas credentials` → Android → preview → **Google Service Account** → **FCM V1** → 위 JSON 업로드
6. APK 재빌드 시점에 EAS 가 자동으로 FCM 자격증명을 빌드에 포함

이 절차를 완료하지 않으면 Android standalone APK 에서 푸시 토큰 발급 자체가 실패. EAS 가 자격증명을 클라우드에 보관하므로, 동일 EAS 프로젝트에서는 한 번만 등록.

**iOS 제약**: Apple Developer Program ($99/년) 멤버십이 필수. 없을 경우 iOS 시뮬레이터 빌드까지만 가능. iOS 푸시는 APNs 자격증명을 별도 등록.

---

## 10. 푸시 알림 발송 시퀀스

```
관리자 웹                 백엔드                       Expo/FCM            환자 디바이스
    │                       │                              │                     │
    │ POST /notifications/send                            │                     │
    │ {recipient_ids, title, body, category}              │                     │
    ├──────────────────────►│                              │                     │
    │                       │ recipient_ids ∩ patients     │                     │
    │                       │ device_tokens by user_id     │                     │
    │                       │                              │                     │
    │                       │ messaging.send_each(tokens) ├────────────────────►│
    │                       │                              │  iOS/Android push   │
    │                       │ INSERT notifications (per recipient)               │
    │                       │  delivered = success>0       │                     │
    │ ◄─────────────────────┤ List[NotificationOut]        │                     │
    │ "N명에게 발송"          │                              │  알림 표시 + 인앱 수신
```

**스텁 모드**: `FIREBASE_CREDENTIALS_PATH`가 비어 있으면 `services/push.py`가 로그만 출력하고 성공으로 간주 → 개발 단계에서 인프라 없이도 전체 흐름 검증 가능.

---

## 11. 운영 가이드

### 11.1 로컬 기동 (단일 커맨드)
```powershell
# 백엔드 + DB
cd backend; docker compose up --build

# 관리자 웹 (다른 터미널)
cd web-admin; npm install; Copy-Item .env.local.example .env.local; npm run dev

# 환자 앱 (다른 터미널)
cd mobile; npm install; npx expo start
```
시드 관리자: `admin@yosan.local` / `admin1234`

### 11.2 환경 변수
| 키 | 의미 | 기본값 |
|---|---|---|
| `DATABASE_URL` | Postgres 연결 URI | `postgresql+psycopg2://yosan:yosan@localhost:5432/yosan` |
| `SECRET_KEY` | JWT 서명 키 | dev용 placeholder, **운영 시 반드시 교체** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT 만료 | 1440 (24h) |
| `CORS_ORIGINS` | CORS 허용 도메인 | `http://localhost:3000,http://localhost:19006` |
| `FIREBASE_CREDENTIALS_PATH` | FCM 서비스 계정 JSON | (미설정 시 스텁 모드) |
| `SEED_ADMIN_EMAIL/PASSWORD` | 시드 관리자 | `admin@yosan.local / admin1234` |

### 11.3 운영 배포 (Caddy + Let's Encrypt, v0.4)
개발 단계에서 사용하던 **Cloudflare quick tunnel** (임시 URL · cloudflared 켠 PC 의존) 을 종료하고 정식 운영 인프라로 전환.

**핵심 파일:**
- `backend/docker-compose.prod.yml` — 운영용 compose (워커 4, restart unless-stopped, 백엔드 포트 외부 미노출)
- `backend/Caddyfile` — 리버스 프록시 + Let's Encrypt 자동 발급/갱신
- `backend/.env.production.example` — 운영 환경변수 템플릿 (강한 SECRET_KEY, DB 비번, ACME 이메일 등)
- `web-admin/.env.production.example` — 관리자 웹 운영 환경변수

**한 줄 기동:**
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

후 `mobile/app.json` 의 `apiBase` 를 운영 도메인으로 바꾸고 `eas update`. cloudflared 종료해도 서비스 계속 동작.

전체 절차·옵션·트러블슈팅은 별도 문서 **`DEPLOYMENT.md`** 참고.

### 11.4 모바일 빌드
| 단계 | 명령 |
|---|---|
| EAS CLI 설치 | `npm install -g eas-cli` |
| 로그인 / 프로젝트 연결 | `eas login` → `cd mobile && eas init` |
| Android APK | `eas build --platform android --profile preview` |
| Android AAB | `eas build --platform android --profile production` |
| iOS (Apple Dev 계정 필요) | `eas build --platform ios --profile preview` |
| JS-only 패치 (apiBase 교체 포함) | `eas update --branch preview --platform android --message "..."` |

상세: `mobile/BUILD.md`.

### 11.5 운영 체크리스트
- [ ] `SECRET_KEY` 를 충분히 긴 무작위 문자열로 교체 (`python -c "import secrets; print(secrets.token_urlsafe(64))"`)
- [ ] `SEED_ADMIN_PASSWORD` 변경 후 1회 사용 즉시 폐기 → 실 관리자 계정으로 교체
- [ ] HTTPS 종단 — v0.4 에선 **Caddy** 가 자동 처리 (Let's Encrypt)
- [ ] PostgreSQL 자동 백업 + 암호화 (cron `pg_dump`, 7-30일 보관)
- [ ] EAS Credentials 에 **FCM V1 서비스 계정 키** 등록 완료 — v0.4 에서 필수
- [ ] **Alembic 도입 후 `create_all` 제거** — 특히 v0.2의 컬럼 추가/신규 테이블이 기존 DB에는 자동 적용되지 않음
- [ ] 접근 로그(audit log) 테이블 추가
- [ ] **환자 가입 승인 시 `survey_group` (B/C) 지정 누락 여부 확인** — 가입 요청 페이지의 승인 폼은 그룹 선택을 강제하지만, 관리자 인지 부족 시 임의 선택 위험
- [ ] **마일리지 적립 기준 / 정산 주기 SOP 문서화** — 관리자가 토글하는 기준(예: "월 1회 이상 설문 제출 시 적립")이 운영 팀 합의로 명문화되어야 환자 분쟁 예방
- [ ] **마일리지 화면 전화번호 placeholder (`010-XXXX-XXXX`) 를 실 번호로 OTA 교체** — 미교체 상태에선 환자가 탭 시 "전화번호 미설정" 안내만 나옴
- [ ] 외부 모니터링 (UptimeRobot 등) 으로 `/health` 분당 1회 헬스체크

---

## 12. 향후 개선 로드맵

| 우선순위 | 항목 | 비고 |
|---|---|---|
| H | Alembic 마이그레이션 | 운영 진입 전 필수. v0.2 스키마 변경 반영을 위해 가장 시급 |
| H | 보고/설문 누락 자동 알림 스케줄러 | APScheduler / Celery beat — 매일 21시 미보고자 자동 푸시 |
| M | 비밀번호 초기화 본인 인증 자동화 | v0.4 에서 환자 신청 + 관리자 승인 흐름은 구현됨. 추후 SMS/이메일 OTP 로 본인 확인 자동화 검토 |
| M | **설문 응답 점수화 + 통계 리포트** | FFQ/MARS-5 별 합산 점수, 환자별 추이 그래프 |
| M | **설문 템플릿 DB 이전** | 운영 중 문항 수정/버전 관리를 위해 `survey_templates / questions / options` 테이블화 |
| M | **마일리지 자동 적립 룰** | "월 N회 보고 시 자동 적립" / 결제/송금 연동 (계좌이체·기프티콘) |
| M | **카드뉴스 기능** | 본 마일스톤에서 제외했던 콘텐츠 모듈. 관리자가 환자별/그룹별 교육 자료 푸시 |
| M | 관리자용 통계 대시보드 | 요산 추이 라인 차트, 발작 빈도, 식단 카테고리 분포 |
| M | 푸린 함량 자동 추정 | 식약처/논문 데이터셋 기반 매칭 |
| M | 권한 분리 | 의료진/원무 분리, 감사 로그 |
| L | 사진 첨부 보고 | 식단 사진 업로드, S3 스토리지 연동 |
| L | 챗 또는 음성 메모 보고 | 노년층 친화 인터페이스 |

---

## 13. 결론

본 시스템은 **환자의 매일 1회 보고 + 주기적 설문 + 24개월 마일리지**라는 세 가지 동기 부여 채널을 한 앱에서 통합 운영할 수 있도록 설계되었다. 관리자는 웹 콘솔에서 "누가/언제/얼마나 미보고했는지"와 "누가 어디까지 적립되었는지"를 한 화면에서 즉시 파악 가능하고, 푸시 알림으로 즉시 독촉할 수 있어 기존 전화 기반 보고가 가진 운영 가시성 부족 문제를 해결한다.

마일리지는 6개월 단위 사이클 구조(3,000 × 5 + 5,000)로 설계되어 환자의 단기 동기(매월 작은 동그라미)와 장기 임상 동기(6개월 병원 방문)를 동시에 자극한다.

기술적으로는 **FastAPI / Next.js / Expo + EAS Build**라는 동시대적이고 학습 곡선이 비교적 완만한 스택을 채택하여, 유지보수와 추후 기능 확장(통계·자동화·카드뉴스·송금 연동 등)에 대비했다.
