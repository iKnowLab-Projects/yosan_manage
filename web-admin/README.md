# 요산 모니터링 — 관리자 웹 (Next.js)

## 실행
```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```
브라우저에서 http://localhost:3000 접속.

기본 관리자 계정은 백엔드 시드 계정과 동일하게 `admin@yosan.local / admin1234`.

## 경로
- `/login` — 관리자 로그인
- `/patients` — 환자 목록 (오늘 미보고 강조)
- `/patients/new` — 신규 환자 등록
- `/patients/[id]` — 환자 상세 + 보고 이력
- `/notifications` — 푸시 알림 발송
