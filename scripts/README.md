# 개발용 백엔드 터널 자동화 스크립트

로컬 백엔드를 **Cloudflare 퀵 터널**로 외부에 노출하고, 발급된 임시 URL을
`mobile/app.json` 의 `extra.apiBase` 에 자동 반영한 뒤 **`eas update`(OTA)** 까지
자동으로 수행합니다. 터널이 끊기면(=URL이 바뀌면) 자동으로 재시작·재배포합니다.

> 기존에 수동으로 하던 3단계 — ① `cloudflared` 실행/유지 ② `app.json` 수정 ③ `eas update` —
> 를 하나로 묶어 **컴퓨터가 켜져 있는 한 백그라운드에서 계속** 동작하게 합니다.

## 사전 조건 (공통)
- `cloudflared` 설치 (PATH 등록)
- `eas-cli` 설치 + `eas login` 완료 (계정 인증 캐시가 있어야 무인 실행 가능)
- 백엔드가 `localhost:26610` 에서 구동 중 — `cd backend && docker compose up`

포트는 스크립트 상단의 `Port`/`$PORT` 로, 배포 채널(브랜치)은
`mobile/package.json` 의 `deploy:android`/`deploy:ios` 스크립트로 관리합니다.

## 이중 프로젝트 배포 (Android=내 것 / iOS=동료 것)
같은 소스코드를 두 Expo 프로젝트로 배포합니다. `mobile/app.config.js` 가 환경변수
`APP_TARGET` 으로 프로젝트 정체성(owner·projectId·updates.url)을 전환합니다.

| 플랫폼 | Expo 프로젝트 | 채널(브랜치) |
|---|---|---|
| Android | `ghkook / 32d09c89…` (내 것) | `production` |
| iOS(TestFlight) | `ghkooks-team / cf97fda0…` (동료) | `production` |

- 이 스크립트는 apiBase 갱신 후 **양쪽 프로젝트에 모두** `eas update` 합니다
  (`$DeployIos`/`DEPLOY_IOS=0` 으로 iOS 자동배포를 끌 수 있음).
- **수동 배포는 `mobile/` 에서 npm 스크립트로** (플랫폼별로 명확, env var 신경 안 써도 됨):
  ```powershell
  cd mobile
  npm run deploy:android      # Android → 내 프로젝트(ghkook), production
  npm run deploy:ios          # iOS → 동료 프로젝트(ghkooks-team), production
  npm run deploy:both         # 둘 다
  # 메시지 지정:   npm run deploy:ios -- --message "설명"
  # 배포 확인:     npm run updates:android  /  npm run updates:ios
  # 새 빌드:       npm run build:android  /  npm run build:ios  /  npm run build:both
  # iOS 제출:      npm run submit:ios   (Android .aab 는 Play Console 수동 업로드)
  ```
  (내부적으로 `cross-env APP_TARGET=…` 으로 app.config.js 프로젝트를 전환합니다.)
- iOS 프로젝트에 발행하려면 동료가 당신을 그 프로젝트 **멤버로 초대**해야 합니다.
- 현재 앱 버전은 **0.2.2**. runtimeVersion 정책은 `appVersion` 이라, OTA 는 같은
  0.2.2 빌드에만 적용됩니다. 네이티브 변경(모듈/설정) 시에는 버전을 올려 **재빌드**해야 합니다.

---

## Windows

### 한 번만 실행 (창 없이 백그라운드)
```
scripts\tunnel-deploy.bat   (더블클릭)
```
- cmd 창은 즉시 닫히고, 자동화는 숨김 상태로 계속 동작합니다.
- 동작/오류 로그: `scripts\.tunnel-logs\automation.log`

### 부팅(로그인) 시 자동 시작 — 상시 구동
```
scripts\install-autostart.bat     (예약 작업 등록)
scripts\uninstall-autostart.bat   (해제)
```
- 로그인 시 `powershell -WindowStyle Hidden` 로 자동 실행되는 예약 작업
  `YosanTunnelAutoDeploy` 를 등록합니다. 창이 뜨지 않습니다.
- 등록 직후 바로 시작: `schtasks /Run /TN "YosanTunnelAutoDeploy"`
- 중지: 작업 관리자에서 `cloudflared.exe` / `powershell` 종료, 또는 해제 후 재로그인.

> 참고: 예약 작업은 **로그인 이후** 사용자 세션에서 실행됩니다(`eas` 인증이 사용자
> 프로필에 있으므로). 로그인 없이 부팅 직후부터 필요하면 SYSTEM 계정 실행이 필요한데,
> 그 경우 `eas` 인증 컨텍스트가 달라질 수 있어 권장하지 않습니다.

---

## Linux

### 한 번만 실행 (백그라운드, 세션 종료와 무관)
```bash
chmod +x scripts/tunnel-deploy.sh
nohup scripts/tunnel-deploy.sh >/dev/null 2>&1 &
```
로그: `scripts/.tunnel-logs/automation.log`

### 부팅 시 자동 시작 — systemd 유저 서비스
`~/.config/systemd/user/yosan-tunnel.service`:
```ini
[Unit]
Description=Yosan Cloudflare tunnel auto-deploy
After=network-online.target

[Service]
Type=simple
ExecStart=%h/…/yosan_manage/scripts/tunnel-deploy.sh
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```
```bash
systemctl --user daemon-reload
systemctl --user enable --now yosan-tunnel.service
loginctl enable-linger "$USER"   # 로그아웃 후에도 유지
```

> macOS 는 `sed -i` 문법이 달라(`sed -i ''`) `update_apibase()` 를 한 줄 수정해야 합니다.

---

## 동작 방식 요약
1. `cloudflared tunnel --url http://localhost:26610` 를 백그라운드로 실행
2. 출력 로그에서 `https://xxxx.trycloudflare.com` URL을 파싱
3. `mobile/app.json` 의 `apiBase` 값만 교체(포맷 보존)
4. `mobile/` 에서 `npm run deploy:android` + `deploy:ios` 실행 → 양쪽 프로젝트 OTA 반영
5. 터널 프로세스가 종료되면 1로 돌아가 재시작·재배포

## 근본적 대안 (선택)
퀵 터널은 실행마다 URL이 바뀌어 매번 OTA가 필요합니다. **고정 주소**가 필요하면:
- Cloudflare **named tunnel** + 고정 hostname, 또는
- 자체 도메인 + 리버스 프록시(운영 배포: 루트 [`DEPLOYMENT.md`](../DEPLOYMENT.md))

이 경우 `apiBase` 를 고정값으로 한 번만 설정하면 되고, 재배포 루프가 불필요합니다.
