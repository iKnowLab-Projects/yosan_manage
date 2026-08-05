# 관리자 웹 (Next.js 14) — 멀티스테이지 빌드 → standalone 슬림 이미지
# 호스트에 Node/npm 이 없어도, 이 이미지 안에 모두 포함된다.

# ---- 빌드 스테이지 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 동일 출처(상대경로)로 API 호출 → 도메인을 이미지에 굽지 않음(이식성).
# Caddy 가 /api, /uploads 를 백엔드로 라우팅한다.
ENV NEXT_PUBLIC_API_BASE=""
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 실행 스테이지 ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
