@echo off
REM ============================================================
REM  로그인 시 자동으로 터널 자동화를 "창 없이" 실행하도록 예약 작업 등록
REM  (컴퓨터를 켜고 로그인하면 백그라운드에서 상시 동작)
REM ============================================================
set "PS1=%~dp0tunnel-deploy.ps1"
schtasks /Create /TN "YosanTunnelAutoDeploy" /SC ONLOGON /F /TR "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS1%\""
echo.
echo [완료] 예약 작업 'YosanTunnelAutoDeploy' 등록됨. 다음 로그인부터 자동 실행됩니다.
echo   - 지금 바로 시작:   schtasks /Run /TN "YosanTunnelAutoDeploy"
echo   - 등록 해제:        uninstall-autostart.bat
echo   - 동작 로그:        %~dp0.tunnel-logs\automation.log
echo.
pause
