# 개발 환경 세팅 가이드 (New Device Bootstrap)

본 문서는 **백지 상태의 컴퓨터** (Windows / macOS / Linux) 에서 yosan 프로젝트의 백엔드 / 관리자 웹 / 모바일 전체를 처음부터 동작하게 만드는 과정을 단계별로 정리합니다.

지금까지 사용하던 환경:
- Windows 11 Pro 24H2 (10.0.26200)
- PowerShell (with bash 보조)
- Docker Desktop
- Node.js + npm
- Python (PSF 빌드)
- Expo / EAS / Firebase (외부 서비스)
- Cloudflare quick tunnel (개발용 HTTPS 우회)

목표: 위 환경을 다른 디바이스에서 동일하게 재현하여 동일한 동작이 가능하게 만들기.

---

## 0. 운영체제별 사전 도구

### Windows 11/10
- Windows 11 Pro 권장 (Hyper-V 필요)
- PowerShell 5.1 기본 탑재. PowerShell 7 도 가능
- 관리자 권한 필요한 명령이 있음 (방화벽, winget)

### macOS 12+
- Apple Silicon (M1/M2/M3) 또는 Intel
- zsh 기본 탑재
- Homebrew 권장

### Linux (Ubuntu 22.04+)
- apt 기반 배포판 권장
- snap 또는 apt 로 Docker 설치

이 문서는 Windows 기준이 메인이며, macOS/Linux 차이는 표시.

---

## 0.5 버전 매트릭스 (v0.4 기준)

여기 적힌 핀 버전이 **실제 코드가 검증된 조합**입니다. 다른 디바이스 셋업 시 가능한 한 동일 버전으로 맞추세요. 메이저/마이너만 일치해도 큰 문제 없음 (예: Node 20.10 ↔ 20.15).

### 호스트 런타임

| 항목 | 최소 / 권장 버전 | 확인 명령 |
|---|---|---|
| OS | Windows 11 24H2 / macOS 12+ / Ubuntu 22.04 LTS+ | `winver` / `sw_vers` / `lsb_release -a` |
| **Node.js** | **20.x LTS** (v0.4 검증: 20.10+) | `node --version` |
| **npm** | **10.x** (Node 20 LTS 동봉) | `npm --version` |
| **Python** | **3.11.x** (Dockerfile = `python:3.11-slim`) | `python --version` |
| **Docker Engine / Desktop** | **24.0+** (compose v2 spec 지원) | `docker --version` |
| **Docker Compose** | **v2.20+** (서브커맨드 형식 `docker compose`) | `docker compose version` |
| **Git** | 2.40+ | `git --version` |
| **EAS CLI** | 14.0+ (글로벌 npm 설치) | `eas --version` |
| **cloudflared** (개발용, 선택) | 2024.x+ | `cloudflared --version` |

### 컨테이너 이미지 (자동 pull, 수동 설치 불필요)

| 서비스 | 이미지 | 용도 |
|---|---|---|
| PostgreSQL | `postgres:16-alpine` | 백엔드 DB. arm64/amd64 멀티아키 (Apple Silicon OK) |
| FastAPI 백엔드 | `python:3.11-slim` 베이스, 로컬 `backend/Dockerfile` 빌드 | API 서버 |
| Caddy (운영만) | `caddy:2-alpine` | 리버스 프록시 + Let's Encrypt 자동 HTTPS |

### 백엔드 Python 패키지 (`backend/requirements.txt`)

```
fastapi==0.110.0          uvicorn[standard]==0.27.1
sqlalchemy==2.0.27        psycopg2-binary==2.9.9
alembic==1.13.1           pydantic==2.6.1
pydantic-settings==2.1.0  python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4    python-multipart==0.0.9
python-dotenv==1.0.1      firebase-admin==6.4.0
httpx==0.27.0             bcrypt==4.0.1
email-validator           # unpinned, pydantic 의존
```

> Docker 사용 시 컨테이너 안에서 자동 설치되므로 호스트에 별도 설치 불필요. 로컬 Python 으로 직접 돌리는 절차는 §3-부속 참조.

### 관리자 웹 의존성 (`web-admin/package.json`)

| 패키지 | 버전 |
|---|---|
| next | 14.2.5 |
| react / react-dom | 18.3.1 |
| typescript | 5.4.5 |
| tailwindcss | 3.4.6 |
| postcss / autoprefixer | 8.4.39 / 10.4.19 |

### 모바일 의존성 (`mobile/package.json`, Expo SDK 54)

| 패키지 | 버전 |
|---|---|
| expo | ^54.0.0 |
| expo-router | ~6.0.23 |
| react | ^19.1.0 |
| react-native | ^0.81.5 |
| expo-notifications | ^0.32.17 |
| expo-device | ~8.0.10 |
| expo-updates | ~29.0.18 |
| expo-secure-store | ~15.0.8 |
| @react-native-async-storage/async-storage | ^2.2.0 |
| typescript | ~5.9.2 |

> Expo SDK 54 + RN 0.81 + React 19 조합은 Node 20 LTS 에서만 안정. Node 22 는 일부 메트로 번들러 워닝 발생 가능 — 운영 빌드는 Node 20 LTS 권장.

### EAS Build / Firebase

| 항목 | 값 |
|---|---|
| EAS Build profile (APK) | `eas.json` 의 `preview` (`buildType: apk`) |
| FCM 구성 | **Firebase Cloud Messaging API (V1)** — EAS Credentials → Google Service Account JSON 업로드 방식 (Legacy Server Key 아님) |
| Android targetSdk | Expo SDK 54 기본값 (35) |
| Firebase Admin SDK (백엔드) | v0.4 부터 미사용 — Expo Push HTTP API 직접 호출. 단, 패키지는 requirements.txt 에 남아 있음 (자격증명 파일이 있을 때만 로드되도록 lazy-init) |

---

## 1. 필수 런타임 설치

### 1-1. Git
```powershell
# Windows
winget install --id Git.Git

# macOS
brew install git

# Ubuntu
sudo apt update && sudo apt install -y git
```

### 1-2. Node.js 20 LTS
```powershell
# Windows
winget install OpenJS.NodeJS.LTS

# macOS
brew install node@20

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

확인:
```powershell
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 1-3. Python 3.11
```powershell
# Windows
winget install Python.Python.3.11

# macOS
brew install python@3.11

# Ubuntu
sudo apt install -y python3.11 python3.11-venv python3-pip
```

확인:
```powershell
python --version  # 3.11.x (Windows 는 python, macOS/Linux 는 python3)
```

### 1-4. Docker Desktop
- **Windows / macOS**: https://www.docker.com/products/docker-desktop/ 에서 다운로드 → 설치 → 재부팅
- **Ubuntu**: 
  ```bash
  sudo apt install -y docker.io docker-compose-plugin
  sudo usermod -aG docker $USER
  newgrp docker
  ```

확인:
```powershell
docker --version
docker compose version
docker run --rm hello-world
```

### 1-5. EAS CLI (모바일 빌드)
```powershell
npm install -g eas-cli

# 확인
eas --version
```

### 1-6. (선택) cloudflared — 개발 단계에서만 사용
```powershell
# Windows
winget install --id Cloudflare.cloudflared

# macOS
brew install cloudflared

# Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

운영 단계에서는 사용 안 함. `DEPLOYMENT.md` 의 Caddy 기반 정식 배포 참고.

### 1-7. (선택) Android Studio — 로컬 빌드 / 에뮬레이터
EAS Build 클라우드를 쓰면 불필요. 로컬 빌드나 안드로이드 에뮬레이터로 테스트하려면 설치.

- https://developer.android.com/studio
- 설치 후 Android Emulator + Pixel 6 API 33 같은 가상 디바이스 생성

MuMu Player 같은 서드파티 안드로이드 에뮬레이터는 GPS(Google Play Services)가 누락된 경우가 많아 푸시 알림 동작 불가.

---

## 2. 저장소 클론

```powershell
cd C:\Users\<USER>\
git clone <your-repo-url> yosan
cd yosan
```

저장소 루트 구조:
```
yosan/
├── backend/
├── web-admin/
├── mobile/
├── README.md
├── REPORT.md
├── DEPLOYMENT.md
├── DEVELOPMENT_SETUP.md   ← 본 문서
└── .gitignore
```

---

## 3. 백엔드 (FastAPI + PostgreSQL)

### 3-1. 개발용 환경 변수
```powershell
cd backend
Copy-Item .env.example .env
# .env 안의 SECRET_KEY 등 그대로 둬도 dev 에선 동작 (운영은 .env.production 별도)
```

### 3-2. Docker 기동
```powershell
docker compose up --build
```

최초 빌드는 2~3분 소요. 이후엔 `docker compose up`(--build 없이) 만으로 충분.

### 3-3. 정상 확인
- 브라우저: http://localhost:26610/health → `{"status":"ok"}`
- Swagger UI: http://localhost:26610/docs
- 시드 관리자 자동 생성: `admin@yosan.com` / `admin1234` (env에서 변경 가능)

### 3-4. 스키마 변경 시 (dev 한정)
```powershell
docker compose down -v   # 볼륨 포함 삭제 → 새 스키마로 재기동
docker compose up --build
```

운영에서는 절대 `-v` 금지. Alembic 도입 필수.

### 3-5. 로그 / 디버깅
```powershell
# 별도 터미널에서 라이브 로그
docker compose logs -f api

# 컨테이너 셸 진입
docker exec -it backend-api-1 bash

# DB 콘솔
docker exec -it backend-db-1 psql -U yosan -d yosan
```

### 3-6. (선택) 도커 없이 로컬 Python 으로 백엔드 직접 실행

디버거 step-through, 단일 파일 빠른 반복 등 IDE 친화 환경이 필요할 때. **Postgres 만 도커로 띄우고 FastAPI 만 로컬에서 돌리는 하이브리드 구성**.

```powershell
# (1) Postgres 만 도커로
cd backend
docker compose up -d db

# (2) Python 가상환경 생성
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows PowerShell
# source .venv/bin/activate          # macOS/Linux

# (3) 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# (4) 환경변수 (PowerShell 세션)
$env:DATABASE_URL = "postgresql+psycopg2://yosan:yosan@localhost:5432/yosan"
$env:SECRET_KEY = "dev-secret-not-for-prod"
$env:CORS_ORIGINS = "http://localhost:3000"
$env:SEED_ADMIN_EMAIL = "admin@yosan.com"
$env:SEED_ADMIN_PASSWORD = "admin1234"

# (5) 기동
uvicorn app.main:app --host 0.0.0.0 --port 26610 --reload
```

macOS/Linux 의 환경변수는 `export DATABASE_URL=...` 형식.

> Windows 에서 `psycopg2-binary` 설치 실패 시: `requirements.txt` 의 `psycopg2-binary==2.9.9` 가 휠 없으면 빌드 시도 → `libpq` 필요. 가장 빠른 해결: 그냥 Docker 로 전체 구동.

---

## 4. 관리자 웹 (Next.js)

### 4-1. 의존성 설치
```powershell
cd web-admin
npm install
```

### 4-2. 환경 변수
```powershell
Copy-Item .env.local.example .env.local
# 기본값: NEXT_PUBLIC_API_BASE=http://localhost:26610
```

### 4-3. 개발 서버 기동
```powershell
npm run dev
```

브라우저: http://localhost:3000

### 4-4. 운영 빌드 (배포 직전 검증)
```powershell
npm run build
npm run start
```

---

## 5. 모바일 (React Native + Expo)

### 5-1. 의존성 설치
```powershell
cd mobile
npm install
```

### 5-2. EAS 계정 로그인
```powershell
eas login
# 처음이면 https://expo.dev 가입 (무료) 후 로그인
```

### 5-3. 프로젝트 연결
저장소를 그대로 clone 했다면 `app.json` 에 이미 `eas.projectId` 가 들어있어 별도 작업 불필요.
새 EAS 프로젝트로 시작하려면:
```powershell
eas init
```

### 5-4. Firebase Cloud Messaging 자격증명

> 푸시 알림이 필요하지 않으면 이 단계 건너뛰기 가능. 단, 백그라운드 푸시는 안 됨.

이전에 받았던 두 파일이 있어야 합니다:
1. `google-services.json` — 새 디바이스의 `mobile/` 폴더에 복사
2. Firebase 서비스 계정 JSON (`*-firebase-adminsdk-*.json`) — 디바이스의 안전한 위치에 복사

위 두 파일 모두 git 에 커밋되지 않으므로 다른 디바이스로 옮길 때는 USB / 암호화된 파일 공유 / Bitwarden Secrets Manager 같은 안전한 채널 사용.

자격증명 EAS 에 업로드:
```powershell
eas credentials
# Select platform → Android
# Build profile → preview
# Google Service Account → Manage Push Notifications (FCM V1) → Upload
# 위 #2 파일 경로 입력
```

> 이미 EAS 프로젝트가 동일 (eas.projectId 가 그대로) 면 자격증명은 EAS 서버에 이미 등록돼 있어 새 디바이스에서 다시 업로드할 필요 없음. 동일 계정으로 `eas login` 만 하면 사용 가능.

### 5-5. apiBase 설정
`mobile/app.json` 의 `extra.apiBase` 가 본인의 백엔드 주소를 가리키는지 확인:

| 환경 | 값 예시 |
|---|---|
| 개발 (Cloudflare quick tunnel) | `https://xxxxx.trycloudflare.com` |
| 개발 (LAN) | `http://192.168.0.x:26610` |
| 운영 | `https://api.yosan.kr` |

### 5-6. APK 빌드
```powershell
eas build --platform android --profile preview
```

10~20분 후 다운로드 링크 제공. 환자 폰에 직접 설치.

### 5-7. OTA 업데이트 (JS-only 변경)
```powershell
eas update --branch preview --platform android --message "변경 설명"
```

빌드 카운트 소모 없음.

---

## 6. (선택) 개발용 HTTPS — Cloudflare quick tunnel

운영 단계에선 Caddy + 도메인을 쓰지만, 개인 디바이스에서 임시로 HTTPS 가 필요할 때:

```powershell
cloudflared tunnel --url http://localhost:26610
```

출력의 `https://xxxxx.trycloudflare.com` URL 을 `mobile/app.json` 의 `apiBase` 에 넣고 `eas update`.

⚠️ cloudflared 터미널을 닫으면 터널 끊김. URL 도 재실행 시 매번 변경.

---

## 7. 흔히 막히는 지점

| 증상 | 원인 / 해결 |
|---|---|
| Docker 가 시작이 안 됨 (Windows) | WSL2 가상화 활성화 필요. BIOS 에서 VT-x / AMD-V 켜기 + Windows 기능에서 "Virtual Machine Platform" 활성화 |
| `eas login` 무한 대기 | 브라우저가 안 떠 있을 수 있음. CLI 출력의 URL 을 수동으로 복사해서 브라우저로 열기 |
| 모바일이 LAN 백엔드에 연결 안 됨 | (1) `app.json` 의 `apiBase` 가 PC LAN IP 인지 확인 (2) Windows 방화벽에서 26610 포트 허용 (3) PC 와 폰이 같은 WiFi 인지 |
| Expo Go 에서 푸시 알림 안 됨 | 정상. SDK 53+ 부터 Expo Go 는 백그라운드 푸시 제거. 반드시 EAS Build 결과 APK 사용 |
| `docker compose down -v` 한 후 환자 로그인 불가 | DB 비웠으니 환자 다시 등록 필요. 시드 관리자만 자동 생성됨 |
| Windows PowerShell 에서 한글 문자 인코딩 깨짐 | 출력 인코딩 문제. PowerShell 콘솔 인코딩을 UTF-8 로: `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` |
| `pip install` 시 빌드 에러 (Windows) | psycopg2 빌드 실패면 `psycopg2-binary` 가 들어있는지 requirements.txt 확인. 로컬 Python 으로 백엔드 안 돌리고 Docker 만 쓰면 영향 없음 |
| Windows 에 `winget` 명령이 없다 | Windows 10 1709 이전 또는 LTSC 빌드. Microsoft Store 에서 "App Installer" 설치 → 재로그인. 안 되면 각 도구별 공식 인스톨러 사용 (Git: git-scm.com, Node: nodejs.org/ko/download, Python: python.org/downloads) |
| PowerShell 에서 `.\.venv\Scripts\Activate.ps1` 실행 차단 | 실행 정책 문제. 관리자 PS 에서 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 후 재시도 |
| macOS Apple Silicon 에서 `postgres:16-alpine` pull 느림/실패 | 멀티아키 이미지라 ARM 지원되지만 네트워크 이슈일 수 있음. `docker pull --platform linux/arm64 postgres:16-alpine` 로 명시 |
| `npm install` 후 Expo 가 RN 0.81 / React 19 호환 에러 | Node 22 사용 중일 가능성. Node 20 LTS 로 강등 (nvm-windows: `nvm install 20 && nvm use 20`). v0.4 검증 조합은 Node 20 + Expo SDK 54 |
| Docker Compose 명령어가 `docker-compose` (하이픈) 만 동작 | 구버전 Compose v1. v2 (`docker compose`, 띄어쓰기) 필요. Docker Desktop 최신화 또는 Linux 에서 `sudo apt install docker-compose-plugin` |
| `eas build` 시 "compatible Node version" 워닝 | EAS 빌드 서버는 자체 Node 사용. 로컬 Node 버전과 무관. 무시 가능 |

---

## 8. 디렉터리·파일 백업 체크리스트

다른 디바이스로 옮길 때 git 외부에 있어 빠뜨리기 쉬운 항목:

| 항목 | 위치 | 비고 |
|---|---|---|
| `backend/.env` | git 제외 | 직접 다시 만들거나 같은 값 사용 |
| `backend/.env.production` | git 제외 | 운영 비밀값 — Bitwarden 등에 보관 |
| `mobile/google-services.json` | git 제외 | Firebase 콘솔에서 재다운로드 가능 |
| Firebase 서비스 계정 JSON | git 제외 | Firebase 콘솔의 서비스 계정 탭에서 새 키 생성 가능 |
| `web-admin/.env.local` | git 제외 | 직접 다시 만들기 |
| `yosan_pgdata` Docker 볼륨 | git 제외 | dev 데이터. 옮기려면 `pg_dump` 후 새 디바이스에서 복원 |
| 모바일 EAS 키스토어 | EAS 클라우드 | 새 디바이스에서 `eas credentials` 로 확인. 잃어버리면 같은 패키지 이름으로 업데이트 불가 — 매우 중요 |

EAS 키스토어 백업:
```powershell
cd mobile
eas credentials
# Android → preview → Keystore → Download credentials
# 받은 JSON 파일을 안전한 곳에 보관 (Bitwarden 등)
```

---

## 9. 검증 — 새 디바이스 셋업 완료 시그널

세 가지 모두 통과하면 OK:

1. **백엔드**: PC 브라우저에서 `http://localhost:26610/docs` 가 Swagger UI 표시
2. **관리자 웹**: `http://localhost:3000/login` 에서 `admin@yosan.com / admin1234` 로 로그인 후 환자 목록 표시
3. **모바일**:
   - `eas build --platform android --profile preview` 가 빌드 큐에 들어감
   - 빌드된 APK 로 로그인 가능
   - 관리자 웹에서 알림 발송 → 폰 잠금 화면에 표시

---

## 10. 다음 단계

- 백엔드 / 관리자 웹 / 모바일 각각의 README.md 에 모듈별 세부 사항 정리됨
- 시스템 설계 전반은 `REPORT.md`
- 운영 배포는 `DEPLOYMENT.md`
- 모바일 빌드 옵션 상세는 `mobile/BUILD.md`
