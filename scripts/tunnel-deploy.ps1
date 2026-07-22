<#
  Cloudflare 퀵 터널 자동화 + mobile/app.json apiBase 갱신 + eas update(OTA)  [Windows]

  동작:
    1) cloudflared 퀵 터널을 백그라운드(창 없음)로 실행 → 임시 URL 발급
    2) 발급 URL을 mobile/app.json 의 extra.apiBase 에 기록
    3) mobile 에서 `eas update --branch preview` 로 OTA 배포
    4) 터널이 끊기면 자동 재시작 후 (URL이 바뀌므로) 2~3을 재수행 → 컴퓨터가 켜져 있는 한 유지

  사전 조건:
    - cloudflared 설치 (PATH)
    - eas-cli 설치 + `eas login` 완료
    - 백엔드가 localhost:$Port 에서 구동 중 (docker compose up)

  옵션:
    -NoDeploy   eas update(OTA)를 건너뛰고 터널 + app.json 갱신까지만 (테스트용)

  창 없이 상시 구동 / 부팅 자동 시작: 같은 폴더의 install-autostart.bat 참고.
#>

param(
  [switch]$NoDeploy
)

$ErrorActionPreference = 'Stop'

# ===== 설정 =====
$Port          = 26610
$AndroidBranch = 'preview'      # 내 프로젝트(ghkook, 32d09c89) — Android
$IosBranch     = 'production'   # 동료 프로젝트(ghkooks-team, cf97fda0) — iOS TestFlight
$DeployIos     = $true          # iOS(동료 프로젝트)에도 자동 배포할지
$RepoRoot  = Split-Path -Parent $PSScriptRoot          # scripts/ 의 상위 = 저장소 루트
$AppJson   = Join-Path $RepoRoot 'mobile\app.json'
$MobileDir = Join-Path $RepoRoot 'mobile'
$LogDir    = Join-Path $PSScriptRoot '.tunnel-logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$OutLog    = Join-Path $LogDir 'cloudflared.out.log'
$ErrLog    = Join-Path $LogDir 'cloudflared.err.log'
$RunLog    = Join-Path $LogDir 'automation.log'
$EasLog    = Join-Path $LogDir 'eas.log'

function Write-Log($msg) {
  $line = ('{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg)
  Add-Content -Path $RunLog -Value $line
  Write-Host $line
}

function Start-Tunnel {
  Remove-Item $OutLog, $ErrLog -ErrorAction SilentlyContinue
  return Start-Process -FilePath 'cloudflared' `
    -ArgumentList @('tunnel', '--url', "http://localhost:$Port") `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog
}

function Get-TunnelUrl {
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    $text = Get-Content -Path $OutLog, $ErrLog -Raw -ErrorAction SilentlyContinue
    if ($text -and ($text -match 'https://[a-z0-9-]+\.trycloudflare\.com')) {
      return $Matches[0]
    }
  }
  return $null
}

function Update-ApiBase($url) {
  # 값만 교체 (파일 포맷/들여쓰기 보존). UTF-8(BOM 없음)로 저장.
  $raw = [System.IO.File]::ReadAllText($AppJson)
  $new = [regex]::Replace($raw, '("apiBase"\s*:\s*")[^"]*(")', ('${1}' + $url + '${2}'))
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($AppJson, $new, $utf8NoBom)
}

function Invoke-EasUpdate($url) {
  # eas 는 진행 상황(Exporting...)을 stderr 로 출력한다. 전역 ErrorActionPreference='Stop'
  # 상태에서 2>&1 로 병합하면 그 줄들이 "에러"로 간주되어 중단되므로, 이 구간만 Continue 로.
  # (함수 스코프에서 대입하면 함수 종료 시 자동 복원됨)
  $ErrorActionPreference = 'Continue'
  Push-Location $MobileDir
  try {
    # Android → 내 프로젝트 (기본 config)
    Write-Log "eas update [Android/$AndroidBranch] 시작... (진행 로그: $EasLog)"
    $env:APP_TARGET = 'android'
    & eas update --branch $AndroidBranch --platform android --message "auto: apiBase $url" --non-interactive 2>&1 |
      Out-File -FilePath $EasLog -Append -Encoding utf8
    if ($LASTEXITCODE -eq 0) { Write-Log "eas update [Android] 완료" }
    else { Write-Log "eas update [Android] 실패 (exit=$LASTEXITCODE) — $EasLog 참고" }

    # iOS → 동료 프로젝트 (APP_TARGET=ios 로 projectId 스위칭)
    if ($DeployIos) {
      Write-Log "eas update [iOS/$IosBranch] 시작..."
      $env:APP_TARGET = 'ios'
      & eas update --branch $IosBranch --platform ios --message "auto: apiBase $url" --non-interactive 2>&1 |
        Out-File -FilePath $EasLog -Append -Encoding utf8
      if ($LASTEXITCODE -eq 0) { Write-Log "eas update [iOS] 완료" }
      else { Write-Log "eas update [iOS] 실패 (exit=$LASTEXITCODE) — $EasLog 참고" }
    }
  }
  finally {
    Remove-Item Env:APP_TARGET -ErrorAction SilentlyContinue
    Pop-Location
  }
}

# ===== 메인 루프 =====
Write-Log "=== 터널 자동화 시작 (port=$Port, android=$AndroidBranch, ios=$(if ($DeployIos) { $IosBranch } else { 'off' }), NoDeploy=$($NoDeploy.IsPresent)) ==="
while ($true) {
  $proc = $null
  try {
    $proc = Start-Tunnel
    Write-Log "cloudflared 시작 (PID=$($proc.Id)), URL 대기..."

    $url = Get-TunnelUrl
    if (-not $url) {
      Write-Log "URL 획득 실패 → 터널 종료 후 재시도"
      if (-not $proc.HasExited) { $proc.Kill() }
      Start-Sleep -Seconds 5
      continue
    }

    Write-Log "터널 URL: $url"
    Update-ApiBase $url
    Write-Log "app.json apiBase 갱신 완료"

    if ($NoDeploy) {
      Write-Log "NoDeploy 모드 — eas update 생략"
    } else {
      Invoke-EasUpdate $url
    }

    # 터널이 살아있는 동안 대기 → 죽으면 루프 처음으로(새 URL 재배포)
    while (-not $proc.HasExited) { Start-Sleep -Seconds 15 }
    Write-Log "cloudflared 종료 감지 → 재시작"
    Start-Sleep -Seconds 3
  }
  catch {
    Write-Log "오류: $($_.Exception.Message)"
    if ($proc -and -not $proc.HasExited) { try { $proc.Kill() } catch {} }
    Start-Sleep -Seconds 10
  }
}
