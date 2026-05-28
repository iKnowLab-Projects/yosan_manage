# 요산 환자 모니터링 통합 시스템 — 시스템 설계 및 구현 보고서

문서 버전 0.1 · 2026-05-26

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
| 환자 인증 | 이메일/비밀번호 로그인 | 비밀번호 재설정, 소셜 로그인 |
| 보고 | 식단(아침/점심/저녁/간식) + 건강(체중·요산·통증·복약 등) | 음성/사진 업로드, 푸린 DB 자동 매칭 |
| 관리자 | 환자 등록·목록·상세, 미보고 식별, 푸시 발송 | 통계 차트, 권한 분리(슈퍼관리자 등) |
| 푸시 | Expo Push / FCM 발송, 토큰 등록, 알림함 | 자동 스케줄러(미보고 자동 푸시), 인앱 채팅 |

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

전체 파일 70개의 완전한 트리 (`__init__.py` 패키지 마커 포함).

```
yosan/
├── README.md
├── REPORT.md
├── .gitignore
│
├── backend/                            # FastAPI + PostgreSQL  ── 35 files
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│   └── app/
│       ├── __init__.py
│       ├── main.py                     # FastAPI 엔트리, CORS, 라우터 등록, startup 훅
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py               # pydantic-settings 기반 Settings + lru_cache
│       │   └── security.py             # hash_password / verify / JWT encode·decode
│       ├── db/
│       │   ├── __init__.py
│       │   ├── session.py              # SQLAlchemy Engine·SessionLocal·Base + get_db()
│       │   └── init_db.py              # create_all() + 시드 관리자 자동 생성
│       ├── models/                     # SQLAlchemy 2.x ORM (Mapped 타이핑)
│       │   ├── __init__.py
│       │   ├── user.py                 # User + UserRole enum
│       │   ├── patient.py              # PatientProfile (User 1:1)
│       │   ├── report.py               # DailyReport + MealEntry + MealType enum
│       │   ├── device.py               # DeviceToken (token unique)
│       │   └── notification.py         # Notification (sender / recipient / delivered / read)
│       ├── schemas/                    # Pydantic I/O DTO
│       │   ├── __init__.py
│       │   ├── auth.py                 # LoginRequest / TokenResponse
│       │   ├── user.py                 # PatientCreate / PatientOut / PatientListItem 등
│       │   ├── report.py               # DailyReportIn/Out + MealEntryIn/Out
│       │   └── notification.py         # NotificationSendIn / DeviceTokenIn 등
│       ├── services/
│       │   ├── __init__.py
│       │   └── push.py                 # Firebase Admin lazy-init + send_each / 스텁 폴백
│       └── api/
│           ├── __init__.py
│           ├── deps.py                 # oauth2_scheme + get_current_user / require_admin / require_patient
│           └── v1/
│               ├── __init__.py
│               ├── router.py           # /api/v1 prefix + 4개 엔드포인트 include
│               └── endpoints/
│                   ├── __init__.py
│                   ├── auth.py         # POST /auth/login
│                   ├── patients.py     # 환자 CRUD + 미보고 식별 LEFT JOIN
│                   ├── reports.py      # upsert (POST), 본인/특정환자 이력 (GET)
│                   └── notifications.py # device-token / send / me / read
│
├── web-admin/                          # Next.js 14 (App Router)  ── 17 files
│   ├── package.json
│   ├── next.config.mjs                 # NEXT_PUBLIC_API_BASE 주입
│   ├── tailwind.config.ts              # brand 컬러 팔레트 확장
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .env.local.example
│   ├── README.md
│   ├── lib/
│   │   └── api.ts                      # fetch 래퍼 + localStorage 세션 + 도메인 타입
│   ├── components/
│   │   └── AuthGuard.tsx               # admin 토큰 검증 + 헤더/네비/로그아웃 UI
│   └── app/
│       ├── layout.tsx                  # 한글 폰트 폴백 (Noto Sans KR)
│       ├── page.tsx                    # 로그인 여부에 따라 /login or /patients 리다이렉트
│       ├── globals.css
│       ├── login/
│       │   └── page.tsx                # 관리자 로그인 (admin 외 차단)
│       ├── patients/
│       │   ├── page.tsx                # 목록 + 미보고 강조 + 필터
│       │   ├── new/
│       │   │   └── page.tsx            # 신규 환자 등록 (계정 + 의료 프로필)
│       │   └── [id]/
│       │       └── page.tsx            # 환자 상세 + 보고 이력 (식단·통증·발작 시각화)
│       └── notifications/
│           └── page.tsx                # 다중 수신자 선택 + "오늘 미보고 전체" 원클릭
│
└── mobile/                             # React Native + Expo Router  ── 15 files
    ├── package.json
    ├── app.json                        # Expo 설정 + extra.apiBase
    ├── babel.config.js                 # expo-router/babel 플러그인
    ├── tsconfig.json
    ├── README.md
    ├── lib/
    │   ├── api.ts                      # fetch 래퍼 + AsyncStorage 세션 + 도메인 타입
    │   └── push.ts                     # 권한 요청 + Expo Push Token 발급 + 백엔드 등록
    └── app/
        ├── _layout.tsx                 # SafeAreaProvider + Stack
        ├── index.tsx                   # 토큰 보유 여부에 따라 분기
        ├── (auth)/
        │   └── login.tsx               # 환자 로그인 (patient 외 차단)
        └── (app)/
            ├── _layout.tsx             # Tabs + 마운트 시 푸시 권한/토큰 등록
            ├── home.tsx                # 오늘의 식단/건강 보고 (upsert)
            ├── history.tsx             # 보고 이력 (pull-to-refresh)
            ├── notifications.tsx       # 알림함 + 탭 시 read 처리
            └── profile.tsx             # 의료 프로필 + 로그아웃
```

**구성 요약**: 백엔드 35 · 웹 관리자 17 · 모바일 15 · 루트 3 = **총 70개 파일**.

---

## 5. 데이터 모델

### 5.1 ER 다이어그램
```
┌──────────┐ 1   1 ┌──────────────────┐
│  users   ├───────┤ patient_profiles │
│ (admin/  │       └──────────────────┘
│  patient)│
│          │ 1   N ┌──────────────────┐ 1   N ┌──────────────┐
│          ├───────┤  daily_reports   ├───────┤ meal_entries │
│          │       └──────────────────┘       └──────────────┘
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

### 5.3 라이프사이클
- **부팅 시**: `init_db.init_db()` → `Base.metadata.create_all()` → 시드 관리자 1명 자동 생성.
- **마이그레이션**: MVP에서는 단순화를 위해 `create_all` 사용. 운영 진입 시 Alembic 도입 권장 (이미 `alembic/versions/` 디렉터리만 선반영).

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

### 7.4 알림
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/v1/notifications/device-token` | 로그인 | FCM/Expo 토큰 등록 (idempotent) |
| POST | `/api/v1/notifications/send` | admin | 다수 환자에게 푸시 + 알림함 적재 |
| GET | `/api/v1/notifications/me` | 로그인 | 본인 알림함 |
| POST | `/api/v1/notifications/{id}/read` | 로그인 | 알림 읽음 처리 |

### 7.5 OpenAPI
- 서버 부팅 후 `http://localhost:8000/docs` (Swagger UI), `/redoc` (ReDoc).
- 모든 요청/응답이 Pydantic 모델 기반이므로 스키마가 자동 정합.

### 7.6 에러 응답 규약
- FastAPI 기본 `{"detail": "..."}` 사용.
- 한국어 메시지는 사용자 친화적 표현으로 통일 (예: "이미 등록된 이메일입니다.", "환자만 보고할 수 있습니다.").

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
    ├── home.tsx             # 오늘 보고
    ├── history.tsx          # 보고 이력
    ├── notifications.tsx    # 알림함
    └── profile.tsx          # 내 정보 / 로그아웃
```
`(auth)` / `(app)` 라우트 그룹 패턴으로 인증 영역과 일반 영역을 자연스럽게 분리.

### 9.2 일일 보고 UX 설계
환자가 부담을 느끼지 않도록 다음을 채택:
- **빈 값 허용**: 모든 측정치(체중·요산 등)는 Optional. 입력 가능한 항목만 채우면 됨.
- **upsert 모델**: 같은 날 여러 번 열어도 직전 입력이 미리 채워져 있어 "추가 입력"으로 자연스럽게 이어짐.
- **식단은 텍스트 + 퓨린 함량 추정**: 자유 텍스트로 부담 ↓. 향후 푸린 DB와 매칭하여 자동 추정 가능.
- **통풍 발작 / 약 복용 토글**: Switch UI로 한 번 터치 입력.

### 9.3 푸시 알림
1. 앱이 `(app)` 진입 시 `registerForPushNotificationsAsync` 호출
2. iOS/Android 권한 요청 → 거부 시 알림 미수신
3. Expo Push Token 발급 → 백엔드 `/api/v1/notifications/device-token`에 등록(중복 token은 user_id만 갱신)
4. 관리자가 발송하면 Expo Push → 디바이스에 도착. 앱은 `Notifications.addNotificationReceivedListener`로 인앱 처리 가능.
5. 알림함 화면에서 미열람 알림 클릭 시 `/{id}/read` 호출

### 9.4 네트워크 베이스 URL
`mobile/app.json`의 `expo.extra.apiBase`로 관리. 디바이스별 호스트 차이를 README 가이드에 명시:
| 환경 | apiBase |
|---|---|
| Android 에뮬레이터 | `http://10.0.2.2:8000` |
| iOS 시뮬레이터 | `http://localhost:8000` |
| 실제 디바이스(LAN) | `http://<PC LAN IP>:8000` |

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

### 11.3 운영 체크리스트
- [ ] `SECRET_KEY`를 충분히 긴 무작위 문자열로 교체
- [ ] `SEED_ADMIN_PASSWORD` 변경 후 1회 사용 즉시 폐기 → 실 관리자 계정으로 교체
- [ ] HTTPS 종단 (Nginx/Traefik/CloudFront 등) 앞단 배치
- [ ] PostgreSQL 자동 백업 + 암호화
- [ ] Firebase 서비스 계정 발급 및 `FIREBASE_CREDENTIALS_PATH` 설정
- [ ] Alembic 도입 후 `create_all` 제거
- [ ] 접근 로그(audit log) 테이블 추가

---

## 12. 향후 개선 로드맵

| 우선순위 | 항목 | 비고 |
|---|---|---|
| H | Alembic 마이그레이션 | 운영 진입 전 필수 |
| H | 보고 누락 자동 알림 스케줄러 | APScheduler / Celery beat — 매일 21시 미보고자 자동 푸시 |
| H | 비밀번호 재설정 / 변경 흐름 | 환자가 직접 수행 가능 |
| M | 관리자용 통계 대시보드 | 요산 추이 라인 차트, 발작 빈도, 식단 카테고리 분포 |
| M | 푸린 함량 자동 추정 | 식약처/논문 데이터셋 기반 매칭 |
| M | 권한 분리 | 의료진/원무 분리, 감사 로그 |
| L | 사진 첨부 보고 | 식단 사진 업로드, S3 스토리지 연동 |
| L | 챗 또는 음성 메모 보고 | 노년층 친화 인터페이스 |

---

## 13. 결론

본 시스템은 **환자의 매일 1회 보고**라는 일관된 운영 패턴을 디지털화하고, **관리자가 "누가/언제/얼마나" 미보고했는지를 한 화면에서 즉시 파악**할 수 있도록 설계되었다. 푸시 알림으로 환자에게 즉시 독촉 가능한 흐름까지 구현하여, 기존 전화 기반 보고가 가진 운영 가시성 부족 문제를 해결한다.

기술적으로는 **FastAPI / Next.js / Expo**라는 동시대적이고 학습 곡선이 비교적 완만한 스택을 채택하여, 유지보수와 추후 기능 확장(통계·자동화·다국어 등)에 대비했다.
