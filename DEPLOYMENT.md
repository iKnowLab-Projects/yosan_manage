# 운영 배포 가이드 (Production Deployment)

본 문서는 개발 단계에서 사용하던 **Cloudflare quick tunnel + cloudflared 켜둔 PC** 임시 구조에서 벗어나, **실제 운영 환경**(상시 가동 서버 + 정식 HTTPS + 영구 도메인)으로 전환하는 절차를 정리합니다.

---

## 1. 운영 아키텍처

```
                ┌─────────────────────────────┐
   환자 폰 ────►│  관리자 웹 (Next.js / 정적)  │
              │  https://admin.yosan.kr      │
                └──────────────┬──────────────┘
                               │ HTTPS REST
                               ▼
        ┌──────────────────────────────────────────────┐
        │   서버 호스트 (운영용, 상시 가동)            │
        │   docker compose -f docker-compose.prod.yml │
        │                                              │
        │   ┌──────────────────────────────────────┐  │
        │   │ Caddy 2 (포트 80/443)                 │  │
        │   │  · Let's Encrypt 인증서 자동 발급/갱신 │  │
        │   │  · 리버스 프록시 → api:26610          │  │
        │   └──────────────┬───────────────────────┘  │
        │                  ▼                          │
        │   ┌──────────────────────────────────────┐  │
        │   │ FastAPI (uvicorn 4 workers)           │  │
        │   │  내부 포트만, 호스트엔 노출 X         │  │
        │   └──────────────┬───────────────────────┘  │
        │                  ▼                          │
        │   ┌──────────────────────────────────────┐  │
        │   │ PostgreSQL 16 (yosan_pgdata 볼륨)    │  │
        │   └──────────────────────────────────────┘  │
        └──────────────────────────────────────────────┘
                               ▲
                               │ 환자 폰 푸시
                ┌──────────────┴──────────────┐
                │   Expo Push Service + FCM   │
                └─────────────────────────────┘
```

운영 단계의 핵심 차이점:

| 항목 | 개발 (현재) | 운영 |
|---|---|---|
| 외부 노출 | Cloudflare quick tunnel (임시 URL) | 자체 도메인 + Let's Encrypt |
| HTTPS | trycloudflare 제공 | Caddy 자동 발급 |
| 백엔드 포트 | 호스트의 26610 노출 | 내부 도커 네트워크만 (Caddy 만 80/443 노출) |
| 시드 비번 | `admin1234` | 무작위 강한 비번 |
| `SECRET_KEY` | dev placeholder | 64자 무작위 |
| DB 비번 | `yosan` | 무작위 강한 비번 |
| uvicorn | `--reload` (1 worker) | `--workers 4`, reload 없음 |
| 재시작 정책 | 없음 | `unless-stopped` (호스트 재부팅 후에도 자동 가동) |
| Firebase 자격증명 | 옵션 | Expo Push 만 쓰면 불필요. 단, EAS Credentials 에 FCM V1 키는 이미 등록됨 |
| 모바일 `apiBase` | trycloudflare URL | `https://api.yosan.kr` |

---

## 2. 사전 준비

### 2-1. 서버 호스트 선택

| 옵션 | 장단점 |
|---|---|
| **A. VPS 신규 구매** (DigitalOcean / Vultr / Hetzner / AWS Lightsail 등) | 권장. 안정성·가용성 최고. 월 $5~10. 공인 IP 즉시 제공 |
| **B. 현재 개발 PC 그대로 운영** | 비용 0이지만 PC 종료 시 서비스 중단. 가정용 인터넷·UPS 안정성 한계. 시범 운영에만 권장 |
| **C. 사내 서버 / 학교 서버** | 가용성·정책 부서와 사전 협의 필요. 일반적으로 권장 |

권장 사양 (소규모 운영, 환자 ~수백 명):
- CPU 2 코어
- RAM 2GB
- SSD 20GB
- Ubuntu 22.04 LTS 또는 Debian 12

### 2-2. 도메인 확보

| 옵션 | 비용 | 특징 |
|---|---|---|
| **자체 도메인** (예: `yosan.kr`, `yosan.app`) | 연 $10~20 | 권장. Cafe24, Gabia, Namecheap, Cloudflare Registrar 등 |
| **무료 동적 DNS** (DuckDNS, No-IP) | 무료 | `yosan.duckdns.org` 같은 서브도메인. 변동 IP에서 유용 |
| **sslip.io** | 무료 | `1-2-3-4.sslip.io` 형태. IP 만 있으면 즉시 가능. 학습/테스트용 |

DNS 설정:
- 자체 도메인이면 `api.yosan.kr` 의 A 레코드를 서버 공인 IP 로 등록
- DuckDNS 면 발급받은 `*.duckdns.org` 가 자동으로 등록한 IP를 가리킴
- sslip.io 면 별도 등록 불필요

### 2-3. 서버 방화벽 / 포트

- TCP 80 (HTTP → Caddy 가 HTTPS로 리다이렉트)
- TCP 443 (HTTPS)
- UDP 443 (HTTP/3 — 선택)
- SSH (관리용, 보통 22 — 키 인증 강제 권장)

가정용 PC를 서버로 쓰는 경우 라우터에서 80, 443 포트포워딩이 추가로 필요합니다.

### 2-4. 코드 배포

가장 간단한 방식: git clone

```bash
# 서버에서
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
git clone <your-repo-url> yosan
cd yosan/backend
```

(저장소가 비공개라면 SSH key 또는 deploy token 설정)

---

## 3. 백엔드 운영 배포

### 3-1. 환경 변수 작성

```bash
cd backend
cp .env.production.example .env.production
nano .env.production   # 모든 CHANGE_ME 항목 교체
```

값 생성 도우미:

```bash
# 강한 SECRET_KEY (64자)
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# 강한 DB / admin 비밀번호 (48자)
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3-2. Caddyfile 확인

`backend/Caddyfile` 은 `{$DOMAIN_API}` 자리에 환경변수로 도메인이 주입되므로 별도 수정 불필요. 다만 다음을 확인:

- `email` 지시문이 환경변수 `ACME_EMAIL` 에서 가져옴 → `.env.production` 에 설정 필수
- Let's Encrypt 가 도메인 검증을 위해 외부에서 서버의 80 포트로 접근할 수 있어야 함

### 3-3. 기동

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

로그 확인:

```bash
# 전체 로그
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Caddy 인증서 발급 진행 확인
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f caddy
```

성공 신호:
```
{"level":"info","ts":..., "logger":"tls.obtain","msg":"certificate obtained successfully","identifier":"api.yosan.kr"}
```

### 3-4. 검증

```bash
# 인증서 + 응답 확인
curl https://api.yosan.kr/health
# → {"status":"ok"}

# Swagger UI (운영에선 가급적 비공개)
curl https://api.yosan.kr/docs
```

`https://` 로 정상 응답하면 운영 백엔드 준비 완료.

---

## 4. 관리자 웹 운영 배포

### 4-1. 환경 변수

`web-admin/.env.production` 작성:
```
NEXT_PUBLIC_API_BASE=https://api.yosan.kr
```

### 4-2. 빌드 + 호스팅 선택

#### 옵션 A — Vercel (가장 간단, 무료)

1. https://vercel.com 가입
2. GitHub 저장소 연결 (해당 web-admin 하위 디렉터리 지정)
3. 환경변수 `NEXT_PUBLIC_API_BASE = https://api.yosan.kr` 추가
4. 자동 배포 + `admin-yosan.vercel.app` URL 발급
5. 커스텀 도메인 (예: `admin.yosan.kr`) 연결 가능

#### 옵션 B — 같은 서버에서 Docker로

`web-admin/Dockerfile` 을 추가하고 `docker-compose.prod.yml` 에 service 로 묶어 Caddy 의 두 번째 호스트 블록으로 라우팅. 가능하지만 Vercel 보다 운영 부담 큼.

### 4-3. 백엔드 CORS 갱신

관리자 웹 도메인을 백엔드의 `CORS_ORIGINS` 에 추가:

```
CORS_ORIGINS=https://admin.yosan.kr
```

후 docker compose 재시작.

---

## 5. 모바일 앱 — 운영 URL 적용

운영 백엔드가 떠 있고 `https://api.yosan.kr/health` 가 정상 응답하면:

### 5-1. `mobile/app.json` 의 apiBase 갱신
```json
"extra": {
  "apiBase": "https://api.yosan.kr",
  ...
}
```

### 5-2. OTA 푸시 (재빌드 불필요)

```powershell
cd mobile
eas update --branch preview --platform android --message "switch to production API"
```

### 5-3. 환자 폰에서 검증
1. 앱 완전 종료 후 재실행 (OTA 적용)
2. 로그인 → 알림 권한 → 마일리지 화면 진입
3. 백엔드 로그에서 요청 도달 확인
4. 잠금 화면 푸시 알림 도달 확인

---

## 6. 운영 보안 체크리스트

- [ ] `SECRET_KEY` 64자 무작위로 교체
- [ ] DB 비밀번호 48자 무작위로 교체
- [ ] 시드 관리자 비밀번호 변경 (로그인 후 새 admin 생성하고 시드 계정 비활성/삭제)
- [ ] `.env.production` 파일 권한 600 (`chmod 600 .env.production`)
- [ ] Firebase 서비스 계정 JSON 도 호스트 외부에 마운트되도록 격리 (host 권한 600)
- [ ] HTTPS 강제 (Caddy 가 자동 처리)
- [ ] `/docs` Swagger 외부 접근 제한 (운영 시 권장 — 필요 시 Caddy 에 basicauth 또는 IP allowlist 추가)
- [ ] PostgreSQL 외부 노출 금지 (현재 docker-compose.prod.yml 에 포트 매핑 없음 — 정상)
- [ ] 백업 스크립트 등록 (`pg_dump` cron, 7-30일 보관)
- [ ] 호스트 OS 자동 보안 업데이트 (`unattended-upgrades`)
- [ ] SSH 키 인증 강제, password 로그인 차단
- [ ] 방화벽 (ufw 또는 cloud provider security group) 으로 22/80/443 만 허용
- [ ] 운영 로그를 stdout → 호스트의 journald 로 수집 (`journalctl -u docker.service`)
- [ ] 모니터링: 최소한 `curl https://api.yosan.kr/health` 분당 1회 외부 헬스체크 (UptimeRobot 무료)

---

## 7. 일상 운영 작업

### 7-1. 코드 업데이트

```bash
cd ~/yosan
git pull
cd backend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

스키마 변경이 없는 한 다운타임 거의 없음. **스키마 변경이 있다면** Alembic 마이그레이션 필요 (현재 `create_all` 은 신규 테이블만 만들고 기존 테이블 컬럼 변경은 반영하지 않음 — 운영 진입 전 Alembic 도입 필수).

### 7-2. DB 백업

```bash
# 매일 새벽 3시 백업 (crontab -e)
0 3 * * * docker exec yosan-db pg_dump -U $DB_USER $DB_NAME | gzip > /var/backups/yosan-$(date +\%Y\%m\%d).sql.gz
```

복원:
```bash
gunzip -c /var/backups/yosan-20260610.sql.gz | docker exec -i yosan-db psql -U $DB_USER $DB_NAME
```

### 7-3. 인증서 갱신
Caddy 가 만료 30일 전 자동 갱신. 별도 작업 불필요.
인증서 실패 시 `docker compose logs caddy` 에서 원인 확인. 보통 도메인 DNS 가 서버 IP 와 다른 경우.

### 7-4. 모바일 OTA 배포

```powershell
# 문구·UI·apiBase 등 JS-only 변경
eas update --branch preview --platform android --message "..."

# 새 라이브러리 / Android 권한 / app.json plugins 변경 시
eas build --platform android --profile preview
```

EAS Build 무료 플랜은 월 30회. 환자에게 배포된 APK 는 보통 6개월~1년에 한 번 재빌드면 충분.

---

## 8. 개발 환경 → 운영 환경 전환 체크리스트

1. ✅ 도메인 등록 + DNS A 레코드 설정
2. ✅ 서버 호스트 확보 + Docker 설치
3. ✅ `.env.production` 작성 (모든 비밀값 강한 무작위로)
4. ✅ `backend/creds/` 에 Firebase 서비스 계정 JSON 배치 (선택)
5. ✅ `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
6. ✅ `https://api.yosan.kr/health` 정상 응답 확인
7. ✅ 관리자 웹 배포 (Vercel 권장) + CORS 추가
8. ✅ `mobile/app.json` 의 `apiBase` 를 운영 URL 로 변경 + `eas update`
9. ✅ 환자 폰에서 새 번들로 로그인 + 푸시 도달 확인
10. ✅ 개발용 cloudflared 종료
11. ✅ DB 백업 cron 등록
12. ✅ 외부 헬스 체크 등록 (UptimeRobot 등)

이상 마치면 개발용 Cloudflare Tunnel 을 영구히 종료해도 서비스가 안정적으로 운영됩니다.

---

## 9. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| Caddy 인증서 발급 실패 | (1) DNS A 레코드가 아직 전파 안 됨 (`dig api.yosan.kr` 으로 확인) (2) 80 포트가 외부에서 막힘 (3) Let's Encrypt rate limit — Caddyfile 의 staging 옵션 잠시 사용 |
| 모바일 "서버 연결 실패" | (1) `https://api.yosan.kr/health` 가 폰 데이터에서 응답하는지 확인 (2) `mobile/app.json` 의 `apiBase` 가 최신 OTA 에 반영됐는지 (3) 환자가 앱을 완전 종료 후 재실행했는지 |
| 관리자 웹 CORS 에러 | 백엔드 `CORS_ORIGINS` 에 관리자 웹 도메인(`https://` 포함) 정확히 추가 후 백엔드 재기동 |
| 환자 등록·로그인 후 푸시 미수신 | (1) EAS Credentials 에 FCM V1 키 등록 여부 (2) 모바일이 dev/preview 빌드인지 (Expo Go 는 불가) (3) 폰의 배터리 최적화 / 알림 권한 (4) `docker compose logs api \| grep push` 로 백엔드가 Expo Push 호출했는지 |
| DB 마이그레이션 후 500 에러 | 스키마 변경은 Alembic 으로 처리. `create_all` 은 기존 테이블의 컬럼 변경을 반영하지 않음. 임시 대응으로 `docker compose down -v` 는 운영 환경에선 절대 금지 (데이터 손실) |
