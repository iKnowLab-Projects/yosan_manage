@echo off
REM ============================================================
REM  Cloudflare 터널 자동화(PS1)를 "창 없이" 백그라운드로 실행
REM  더블클릭하면 이 창은 즉시 닫히고, 자동화는 숨김으로 계속 동작합니다.
REM  로그: scripts\.tunnel-logs\automation.log
REM ============================================================
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tunnel-deploy.ps1"
exit
