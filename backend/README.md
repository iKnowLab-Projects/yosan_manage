# 요산 환자 모니터링 — 백엔드 (FastAPI)

## 실행

### Docker Compose (권장)
```powershell
docker compose up --build
```
- API: http://localhost:26610
- Swagger UI: http://localhost:26610/docs
- 기본 관리자: `admin@yosan.local` / `admin1234`

### 로컬 실행
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# PostgreSQL을 별도로 띄운 뒤
uvicorn app.main:app --reload
```

## 주요 엔드포인트
| Method | Path | 설명 |
|---|---|---|
| POST | /api/v1/auth/login | 로그인 (관리자/환자 공용) |
| GET  | /api/v1/patients | 환자 목록 + 미보고 일수 (admin) |
| POST | /api/v1/patients | 환자 등록 (admin) |
| GET  | /api/v1/patients/{id} | 환자 상세 (admin) |
| GET  | /api/v1/patients/me | 내 프로필 (patient) |
| POST | /api/v1/reports | 일일 보고 작성/갱신 (patient) |
| GET  | /api/v1/reports/me | 내 보고 이력 (patient) |
| GET  | /api/v1/reports/me/today | 오늘 보고 상태 (patient) |
| GET  | /api/v1/reports/patient/{id} | 특정 환자 보고 이력 (admin) |
| POST | /api/v1/notifications/device-token | FCM/Expo 토큰 등록 |
| POST | /api/v1/notifications/send | 푸시 알림 발송 (admin) |
| GET  | /api/v1/notifications/me | 내 알림함 |

## 푸시 알림
- `FIREBASE_CREDENTIALS_PATH` 미설정 시: 로그만 출력하는 스텁 모드
- 실제 발송: Firebase Admin SDK 서비스 계정 JSON 경로를 환경변수로 지정
