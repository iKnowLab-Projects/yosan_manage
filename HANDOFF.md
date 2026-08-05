# 시스템 인계 · 이식 가이드 (Docker 원클릭)

이 문서 하나로 **완전히 새로운 서버**에 전체 시스템(DB + 백엔드 + 관리자 웹 + HTTPS)을 올릴 수 있습니다.

> **호스트에 필요한 것은 Docker + Docker Compose 뿐입니다.**
> Python·Node·npm·Postgres 는 전부 컨테이너 안에 들어 있어 호스트에 설치할 필요가 없습니다.
> 모바일 앱 빌드는 EAS(클라우드)에서 하므로 이 서버와 무관합니다.

---

## 0. 사전 준비 (한 번)

### (a) Docker 설치 — 없을 경우 (Linux, root 권한 필요)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 로그아웃 후 재로그인
docker --version && docker compose version
```
> 루트 권한이 없어 Docker 설치가 불가능하면, 관리자에게 **Docker 사용 가능한 리눅스 VM** 을 요청하세요.

### (b) 외부 노출 — 둘 중 하나

**(A) 공인 IP + 도메인 (기본·권장)**
- 도메인의 **A 레코드**가 서버 **공인 IP** 를 가리키게 설정.
- 방화벽에서 **80, 443** 개방 → Caddy 가 Let's Encrypt 로 **HTTPS 자동 발급**.
- `.env.production` 에 `DOMAIN`, `ACME_EMAIL` 만 채우면 됨. (`SITE_ADDRESS`/`CLOUDFLARE_TUNNEL_TOKEN` 는 비움)
- 도메인이 없으면 무료 DuckDNS(`xxx.duckdns.org`)·`sslip.io` 도 가능.

**(B) 공인 IP 없음 / NAT 뒤 → Cloudflare Named Tunnel (고정 주소)**
지금 쓰던 quick tunnel 은 재시작마다 주소가 바뀌지만, **Named Tunnel 은 고정 주소**다.
1. Cloudflare Zero Trust → **터널 생성** → **토큰** 발급.
2. 공개 호스트명(예: `api.example.com`) → 서비스 **`http://caddy:80`** 라우팅 지정.
3. `.env.production` 에 `CLOUDFLARE_TUNNEL_TOKEN=<토큰>` + `SITE_ADDRESS=:80` 설정.
4. 터널 포함해서 기동:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production --profile tunnel up -d --build
   ```
- 이 경우 서버에 **공인 IP·포트개방 불필요**(Cloudflare 가 엣지에서 TLS 종료). 모바일 `apiBase` = `https://api.example.com`(고정).

### (c) 서버에 이미 다른 서비스가 돌고 있는 경우 (포트 충돌)
`80/443` 을 이미 다른 서비스가 쓰고 있으면 우리 Caddy 가 그 포트를 못 잡는다. 선택지:

1. **(권장) Cloudflare 터널 [B] 사용** — cloudflared 는 **아웃바운드 연결만** 하므로 **호스트 포트가 전혀 필요 없다.**
   기존 서비스의 80/443 과 **충돌하지 않는다.** `.env` 에서 `HTTP_PORT`/`HTTPS_PORT` 를 빈 포트(예 8080/8443)로 바꾸면 완전히 비켜간다.
2. **기존 리버스 프록시(nginx/Apache 등) 뒤에 붙이기** — 서버에 이미 80/443 웹서비스가 있을 때.
   `.env.production`:
   ```
   SITE_ADDRESS=:80      # 우리 Caddy 는 HTTP 만(ACME 안 함). TLS 는 앞단이 처리
   HTTP_PORT=8080        # 호스트에서 8080 만 사용
   HTTPS_PORT=8443       # 안 쓰지만 443 충돌 피하려 빈 포트로
   ```
   그리고 **기존 프록시에 우리 도메인용 vhost 추가**를 관리자에게 요청:
   `yosan.도메인` (TLS 인증서 포함) → `http://127.0.0.1:8080` 로 reverse_proxy.
   → 우리 Caddy 는 8080 에서 HTTP 로 받아 `/`(관리자)·`/api`·`/uploads` 경로만 나눠주고, 바깥 TLS·도메인은 기존 프록시가 담당.
3. **전용 서버/VM 사용** — 가장 단순. 이 스택만 도는 곳이면 기본 80/443 그대로.

### (d) 공유기 뒤 자체 서버 + DuckDNS (터널 없이 고정 주소) — 상세
공인 IP 는 있는데 서버가 **공유기/방화벽 뒤**이고, 고정 IP·자체 도메인이 없을 때. (Cloudflare 터널 불필요)

**흐름:** 인터넷 → 공유기 공인IP:443 → (포트포워딩) → 서버:443 → Caddy → 경로별 라우팅

1. **CGNAT 여부 먼저 확인** (이게 안 되면 포트포워딩 자체가 불가 → 이 경우엔 터널 필요)
   - 공유기 관리페이지의 **WAN IP** 와 [whatismyip.com] 의 IP 를 비교.
   - **같으면** 진짜 공인 IP → 진행 가능. **다르면**(WAN 이 100.64.x 등 사설) CGNAT → ISP 에 공인 IP 요청하거나 터널 사용.
2. **서버의 내부 IP 고정** (예: `192.168.0.10`). 공유기 DHCP 예약 권장.
3. **DuckDNS 준비**: `duckdns.org` 로그인(Google/GitHub) → 서브도메인 생성(예 `yosan`) → **토큰 복사**.
   `.env.production` 에: `DOMAIN=yosan.duckdns.org`, `DUCKDNS_SUBDOMAIN=yosan`, `DUCKDNS_TOKEN=<토큰>`.
4. **공유기 포트포워딩**: 외부 **80 → 192.168.0.10:80**, **443 → 192.168.0.10:443** (TCP). (HTTP_PORT/HTTPS_PORT 를 바꿨다면 그 포트로)
5. **기동** (DuckDNS 갱신 컨테이너 포함):
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production --profile duckdns up -d --build
   ```
   → DuckDNS 가 `yosan.duckdns.org` 를 현재 공인 IP 로 유지하고, Caddy 가 Let's Encrypt 로 **HTTPS 자동 발급**.
   → 관리자 `https://yosan.duckdns.org/`, 모바일 apiBase `https://yosan.duckdns.org`.

> ⚠️ 일부 가정용 회선은 **인바운드 80/443 을 차단**한다. 그러면 Let's Encrypt HTTP 인증(포트 80)이 실패한다.
> 이때는 (1) ISP 에 차단 해제 요청, 또는 (2) Caddy 의 **DNS-01 인증**(DNS 제공자 API 필요), 또는 (3) Cloudflare 터널로 우회.

---

## 1. 배포 (원클릭)

```bash
# 1) 소스 가져오기 (git 또는 압축 전달)
git clone <repo> yosan && cd yosan
#   (git 이 없으면 zip 을 서버에 풀어도 됨)

# 2) 환경변수 설정
cp .env.production.example .env.production
nano .env.production          # DOMAIN, 비밀번호, SECRET_KEY 등 CHANGE_ME 교체

# 3) 전체 스택 기동 (빌드 + 실행)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

끝입니다. 잠시 후 Caddy 가 HTTPS 인증서를 자동 발급하면:

| URL | 내용 |
|---|---|
| `https://<DOMAIN>/` | 관리자 웹 (시드 관리자로 로그인) |
| `https://<DOMAIN>/api/v1/...` | 백엔드 API |
| `https://<DOMAIN>/uploads/...` | 업로드 파일(이미지·동영상) |
| `https://<DOMAIN>/docs` | API 문서(Swagger) |

상태 확인:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy   # 인증서 발급 로그
```

---

## 1-B. 서버 관리자(sysadmin)에게 요청할 것

우리 Docker 스택은 **기존 서버 설정을 건드리지 않는다.** 아래 "연결"만 관리자에게 요청하면 된다.

### 경우 ① 서버에 기존 웹서비스가 없음 (80/443 비어있음)
관리자 요청:
1. **DNS A 레코드**: `yosan.<도메인>` → **[서버 공인 IP]**
2. **인바운드 허용**: 이 서버로 오는 **TCP 80, 443** 오픈 (NAT 뒤면 80/443 → 서버로 포트포워딩)

우리 쪽: `.env.production` 에 `DOMAIN=yosan.<도메인>` 만 채우고 기본 기동.
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 경우 ② 서버에 이미 웹서비스(nginx/Apache 등)가 80/443 사용 중
관리자 요청:
1. **DNS A 레코드**: `yosan.<도메인>` → 서버(또는 기존 프록시)가 보는 주소
2. **기존 프록시에 vhost 1개 추가** — 우리 도메인만 우리 포트로 넘김 (기존 사이트는 그대로):
   ```nginx
   server {
       server_name yosan.<도메인>;
       # TLS 인증서(certbot 등)로 이 도메인 HTTPS 처리
       location / {
           proxy_pass http://127.0.0.1:<PORT>;   # ← 우리 스택 포트(아래에서 자동 배정)
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_request_buffering off;           # 업로드/동영상 스트리밍(Range) 통과
       }
   }
   ```

우리 쪽: **포트 자동 배정 스크립트**로 기동 (8080 이 이미 쓰이면 빈 포트를 알아서 잡음):
```bash
./scripts/deploy-behind-proxy.sh
# → 출력된  http://127.0.0.1:<PORT>  를 위 vhost 의 proxy_pass 에 넣어달라고 관리자에게 전달
```

> 요약 — 관리자 몫: **경우① DNS+포트개방 / 경우② DNS+vhost 1개.** 그 외 기존 서비스는 건드리지 않는다.

## 2. 인터넷이 막힌 서버 (오프라인 이식)

인터넷 없는 서버라면, **인터넷 되는 PC**에서 이미지를 만들어 파일로 옮깁니다.

```bash
# [인터넷 되는 PC] 이미지 빌드 후 tar 로 저장
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker save \
  $(docker compose -f docker-compose.prod.yml config | grep 'image:' | awk '{print $2}') \
  postgres:16-alpine caddy:2-alpine \
  -o yosan-images.tar

# [대상 서버] 파일 옮긴 뒤 로드
docker load -i yosan-images.tar
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```
> 빌드된 api/web-admin 이미지 이름은 `docker images` 로 확인해 `docker save` 대상에 포함하세요.

---

## 3. 기존 데이터 이전 (기존 서버 → 새 서버)

### (a) 데이터베이스
```bash
# [기존 서버] 덤프
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U $DB_USER $DB_NAME > yosan_db.sql

# [새 서버] (스택 기동 후) 복원
cat yosan_db.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U $DB_USER -d $DB_NAME
```

### (b) 업로드 파일 (이미지·동영상)
업로드는 `yosan_uploads` 볼륨에 저장됩니다.
```bash
# [기존 서버] 볼륨 → tar
docker run --rm -v yosan_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads.tgz -C /data .

# [새 서버] tar → 볼륨
docker run --rm -v yosan_uploads:/data -v "$PWD":/backup alpine \
  tar xzf /backup/uploads.tgz -C /data
```

---

## 4. 모바일 앱 (서버 이전 후)

모바일 앱은 서버가 아니라 **휴대폰에서 도는 코드**라 컨테이너로 "실행"되지 않는다.
실제 빌드/OTA 는 **EAS(Expo 클라우드)** 에서 수행된다. 다만 이식된 환경에서도 계속
개발·배포할 수 있도록, **개발 도구환경(Node + Expo/EAS CLI + 의존성)을 컨테이너로 제공**한다.

### (a) 컨테이너로 빌드/OTA — 호스트에 Node 설치 불필요
```bash
# 1) Expo 액세스 토큰을 .env.production 의 EXPO_TOKEN 에 넣기
#    (expo.dev → Account → Access tokens)
# 2) 빌더 이미지 빌드
docker compose -f docker-compose.prod.yml --profile mobile build mobile-builder
# 3) OTA(JS/이미지 변경 즉시 반영) 또는 빌드/제출
docker compose -f docker-compose.prod.yml --profile mobile run --rm mobile-builder \
    eas update --branch production --platform all --message "설명"
docker compose -f docker-compose.prod.yml --profile mobile run --rm mobile-builder \
    npm run build:android      # / build:ios / submit:ios
```
> `mobile/` 소스는 볼륨으로 마운트되어, 호스트에서 코드를 고치면 컨테이너가 바로 반영한다.

### (b) 새 서버 주소로 전환
앱이 새 서버를 바라보게 하려면 **apiBase 만 새 도메인으로 바꿔 재빌드**한다.
- EAS 환경변수 `API_BASE=https://<DOMAIN>` 주입(app.config.js 가 읽음), 또는
- `mobile/app.json` 의 `extra.apiBase` 를 `https://<DOMAIN>` 으로 수정 후 재빌드.

### 계정 주의
모바일 빌드/스토어 배포는 **EAS·Apple·Google 계정** 에 묶여 있다.
- **EAS**: `EXPO_TOKEN` 은 해당 Expo 계정 소유자의 토큰이어야 한다. 다른 조직으로 완전히
  넘길 경우 EAS 프로젝트 이전 또는 새 프로젝트 생성(app.config.js owner/projectId 교체)이 필요.
- **Apple/Google 개발자 계정**: 스토어 소유권·인증서는 별도 이전/재등록. (서버 이전과 독립적)

---

## 5. 운영 명령 모음
```bash
CF="-f docker-compose.prod.yml --env-file .env.production"
docker compose $CF up -d --build     # 배포/업데이트(코드 변경 후)
docker compose $CF ps                # 상태
docker compose $CF logs -f api       # 백엔드 로그
docker compose $CF restart api       # 백엔드만 재시작
docker compose $CF down              # 정지(볼륨/데이터는 유지)
docker compose $CF down -v           # 정지 + 데이터 볼륨 삭제(주의!)
```

## 6. 체크리스트
- [ ] Docker/Compose 설치됨
- [ ] DOMAIN A레코드 → 서버 IP, 80/443 개방
- [ ] `.env.production` 의 모든 CHANGE_ME 교체 (특히 SECRET_KEY, DB_PASSWORD)
- [ ] `up -d --build` 후 `https://<DOMAIN>/` 접속·로그인 확인
- [ ] (이전 시) DB 덤프·uploads 볼륨 복원
- [ ] 시드 관리자 비밀번호 변경
- [ ] 모바일 apiBase 새 도메인으로 재빌드
