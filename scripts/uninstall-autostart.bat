@echo off
REM 예약 작업 해제 + 실행 중인 cloudflared 종료(선택)
schtasks /Delete /TN "YosanTunnelAutoDeploy" /F
echo.
echo [완료] 자동 시작 예약 작업을 제거했습니다.
echo 실행 중인 터널도 종료하려면 아래 주석을 해제하세요.
REM taskkill /IM cloudflared.exe /F
echo.
pause
