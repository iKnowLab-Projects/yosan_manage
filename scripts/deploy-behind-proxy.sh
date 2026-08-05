#!/usr/bin/env bash
# =====================================================================
# 기존 리버스 프록시(nginx/Apache 등)가 이미 80/443 을 쓰는 서버에서
# 우리 스택을 그 "뒤에" 띄운다. 8080 부터 시작해 "빈 포트를 자동 배정".
#
# 사용 (저장소 루트 또는 어디서든):
#   ./scripts/deploy-behind-proxy.sh
#
# 끝나면 출력되는  http://127.0.0.1:<PORT>  를 기존 프록시가 우리 도메인으로 연결하면 된다.
# =====================================================================
set -euo pipefail

# 저장소 루트로 이동 (이 스크립트는 scripts/ 하위)
cd "$(cd "$(dirname "$0")/.." && pwd)"

COMPOSE=(-f docker-compose.prod.yml --env-file .env.production)

# 127.0.0.1:PORT 에 연결되면 = 이미 사용 중
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&- 2>/dev/null; return 0; } || return 1
}
find_free() {
  local p="$1"
  while port_in_use "$p"; do p=$((p + 1)); done
  echo "$p"
}

HTTP_PORT="$(find_free 8080)"
HTTPS_PORT="$(find_free $((HTTP_PORT + 1)))"

echo "▶ 자동 배정된 호스트 포트: HTTP=${HTTP_PORT} (프록시 연결용), HTTPS=${HTTPS_PORT} (미사용/충돌회피)"

# SITE_ADDRESS=:80 → 우리 Caddy 는 HTTP 만(TLS 는 앞단 프록시가 처리)
SITE_ADDRESS=":80" HTTP_PORT="${HTTP_PORT}" HTTPS_PORT="${HTTPS_PORT}" \
  docker compose "${COMPOSE[@]}" up -d --build

echo ""
echo "✅ 기동 완료."
echo "   기존 리버스 프록시(nginx 등)에서 우리 도메인을 아래로 연결하세요:"
echo "        http://127.0.0.1:${HTTP_PORT}"
echo "   (관리자 전달용 예시는 HANDOFF.md 의 '서버 관리자 요청사항' 참고)"
