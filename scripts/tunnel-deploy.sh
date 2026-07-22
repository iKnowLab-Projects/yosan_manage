#!/usr/bin/env bash
# ============================================================
#  Cloudflare 퀵 터널 자동화 + mobile/app.json apiBase 갱신 + eas update(OTA)  [Linux]
#
#  동작:
#    1) cloudflared 퀵 터널을 백그라운드로 실행 → 임시 URL 발급
#    2) 발급 URL을 mobile/app.json 의 extra.apiBase 에 기록
#    3) mobile 에서 `eas update --branch preview` 로 OTA 배포
#    4) 터널이 끊기면 자동 재시작 후 (URL이 바뀌므로) 2~3 재수행
#
#  사전 조건: cloudflared, eas-cli(+ eas login), 백엔드가 localhost:$PORT 구동 중
#  창/세션 없이 상시 구동: `nohup ./tunnel-deploy.sh >/dev/null 2>&1 &`
#                         또는 systemd 유저 서비스(하단 scripts/README.md 참고)
# ============================================================
set -uo pipefail

PORT="${PORT:-26610}"
ANDROID_BRANCH="${ANDROID_BRANCH:-preview}"     # 내 프로젝트(ghkook) — Android
IOS_BRANCH="${IOS_BRANCH:-production}"          # 동료 프로젝트(ghkooks-team) — iOS TestFlight
DEPLOY_IOS="${DEPLOY_IOS:-1}"                   # iOS(동료 프로젝트)에도 배포할지 (0 이면 생략)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_JSON="$REPO_ROOT/mobile/app.json"
MOBILE_DIR="$REPO_ROOT/mobile"
LOG_DIR="$SCRIPT_DIR/.tunnel-logs"
mkdir -p "$LOG_DIR"
CF_LOG="$LOG_DIR/cloudflared.log"
RUN_LOG="$LOG_DIR/automation.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" | tee -a "$RUN_LOG"; }

start_tunnel() {
  : > "$CF_LOG"
  cloudflared tunnel --url "http://localhost:$PORT" > "$CF_LOG" 2>&1 &
  TUNNEL_PID=$!
}

get_url() {
  local url=""
  for _ in $(seq 1 60); do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -n1 || true)"
    [ -n "$url" ] && { printf '%s' "$url"; return 0; }
    sleep 1
  done
  return 1
}

update_apibase() {
  # 값만 교체(포맷 보존). 리눅스 GNU sed 기준.
  # macOS(BSD sed)는 `sed -i ''` 형태가 필요합니다.
  sed -i -E "s#(\"apiBase\"[[:space:]]*:[[:space:]]*\")[^\"]*(\")#\1${1}\2#" "$APP_JSON"
}

deploy() {
  local url="$1"
  # Android → 내 프로젝트 (기본 config)
  ( cd "$MOBILE_DIR" && APP_TARGET=android eas update --branch "$ANDROID_BRANCH" --platform android --message "auto: apiBase $url" ) 2>&1 | tee -a "$RUN_LOG"
  # iOS → 동료 프로젝트 (APP_TARGET=ios 로 projectId 스위칭)
  if [ "$DEPLOY_IOS" = "1" ]; then
    ( cd "$MOBILE_DIR" && APP_TARGET=ios eas update --branch "$IOS_BRANCH" --platform ios --message "auto: apiBase $url" ) 2>&1 | tee -a "$RUN_LOG"
  fi
}

cleanup() { [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

log "=== 터널 자동화 시작 (port=$PORT, android=$ANDROID_BRANCH, ios=$([ "$DEPLOY_IOS" = "1" ] && echo "$IOS_BRANCH" || echo off)) ==="
while true; do
  start_tunnel
  log "cloudflared 시작 (PID=$TUNNEL_PID), URL 대기..."
  if url="$(get_url)"; then
    log "터널 URL: $url"
    update_apibase "$url" && log "app.json apiBase 갱신 완료"
    deploy "$url" && log "eas update 완료"
  else
    log "URL 획득 실패 → 재시도"
    kill "$TUNNEL_PID" 2>/dev/null || true
    sleep 5
    continue
  fi
  wait "$TUNNEL_PID"
  log "cloudflared 종료 감지 → 재시작"
  sleep 3
done
