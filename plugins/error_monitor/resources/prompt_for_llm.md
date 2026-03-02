# 프롬프트: Windows Terminal 레이아웃 구동 중 즉시 종료(Crash) 현상 디버깅

현재 `eco.bat`에서 개발 모드(`[1]`)를 실행할 때, Windows Terminal(`wt.exe`)이 정상적으로 분할되지 않고 거의 즉시 또는 파싱 과정에서 창 전체가 닫혀버리는 문제가 지속되고 있습니다. 여러 아키텍처적 조치를 취했으나 근본적인 해결이 되지 않은 상태입니다. 아래의 시도 내역과 현재 스크립트 상태를 분석하여 정확한 원인과 해결책을 제시해 주세요.

## 1. 현재 시스템 환경 상황
- OS: Windows 11 Native
- 기본 터미널 환경: PowerShell 7 (`pwsh`)이 VS Code/Cursor의 기본값으로 설정됨 (`terminal.integrated.defaultProfile.windows`).
- `eco.bat` 실행 시 기본 Windows 내장 PowerShell 5.1 (`powershell.exe`)을 하드코딩된 경로로 호출하여 `scripts\launch_wt_dev.ps1`을 백그라운드 구동함.

## 2. 해결하고자 하는 현상
`eco.bat`을 실행하고 `1`을 선택하면, 터미널이 아주 잠깐 반짝이거나 아예 아무 반응도 없이 (혹은 파싱 에러를 내며) 즉시 종료되어 버림. 3분할 탭 분할 및 명령어 할당이 실패하고 있습니다.

## 3. 그동안 시도했던 해결 방안 및 아키텍처 변경 내역

### 3.1. PowerShell 배열 파싱 버그 회피 시도 (`Start-Process`)
- **초기 상태**: 복잡한 인자(`--maximized`, `split-pane`, `;`, `--size`)들을 PowerShell 배열(`$wtArgs = @(...)`)로 묶어서 `Start-Process "wt" -ArgumentList $wtArgs`로 전달함.
- **이슈**: PowerShell 5.1이 배열 내부의 세미콜론(`;`)이나 따옴표를 직렬화하면서 멋대로 파싱해버려 `wt.exe`가 인식하지 못하고 튕김.
- **수정**: 배열 대신 거대한 단일 문자열(`$argStr`)로 합쳐서 전달하도록 변경.

### 3.2. `Tee-Object` 파이프라인 충돌 및 Base64 인코딩 적용
- **초기 상태**: 프론트엔드 패널에 `cmd /k "npm run tauri dev 2>&1 | Tee-Object ..."`를 전달함.
- **이슈**: `cmd.exe`가 파이프라인(`|`)을 만나면 PowerShell 구문으로 넘기기 전에 스스로 파싱하려 시도하면서 `Tee-Object`를 알 수 없는 명령어로 취급해 패널이 즉시 종료됨.
- **수정**: 프론트엔드 실행 명령(PowerShell 파이프라인 포함)을 완전히 **`Unicode Base64`로 인코딩(`[Convert]::ToBase64String`)**하고, 이를 `powershell.exe -NoExit -EncodedCommand <Base64>` 형태로 래핑하여 `cmd.exe`의 문자열 파싱 룰을 100% 회피함.

### 3.3. 동반 종료(Tear-down) 방지를 위한 고립화
- **초기 상태**: `Start-Process wt.exe`를 구동할 때 쉘 권한 분리 없이 실행함.
- **이슈**: `eco.bat`이 끝단의 `exit`를 만나 닫히면서, 자식 프로세스로 묶여 있던 `wt.exe`도 한꺼번에 강제 종료(`UseShellExecute=$false` 상황과 유사)된다고 추정함.
- **수정**: `Start-Process` 대신 순수 .NET 클래스인 `System.Diagnostics.ProcessStartInfo`를 사용하고, `UseShellExecute = $true`를 강제하여 프로세스 트리를 부모(`eco.bat`)로부터 100% 분리(Detached) 독립 실행되도록 조치함.

### 3.4. 따옴표 에러 방지 (Nested Quotes)
- **최근 조치 사항**: 프론트엔드 로직에 남아있던 `cmd /k` 중간자 껍데기를 통째로 제거하고 바로 `powershell.exe -EncodedCommand` 구문을 실행하도록 변경함. (따옴표 매칭 에러 방지 목적)

## 4. 현재 코드 (참고용)

**`scripts\launch_wt_dev.ps1` (현재 버전)**
```powershell
param([string]$Root)
$backendDir = "$Root\backend"
$frontendDir = "$Root\frontend"

$psExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$psRawCmd = "npm run tauri dev 2>&1 | Tee-Object -FilePath 'logs\frontend.log' -Append"
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psRawCmd)
$encodedCmd = [Convert]::ToBase64String($bytes)
$frontendCmd = "`"$psExe`" -NoExit -EncodedCommand $encodedCmd"

$argStr = "--maximized " +
"-w 0 nt --title `"Eco-Dev-Stack`" -d `"$Root`" cmd /k `"backend\.venv\Scripts\python.exe error_monitor.py --clear`" " +
"`; split-pane -H --size 0.8 -d `"$backendDir`" cmd /k `"call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000`" " +
"`; move-focus down " +
"`; split-pane -V --size 0.5 -d `"$frontendDir`" $frontendCmd"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "wt.exe"
$psi.Arguments = $argStr
$psi.UseShellExecute = $true
[System.Diagnostics.Process]::Start($psi) | Out-Null
```

**`eco.bat` (핵심 실행부)**
```batch
:dev
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Run PowerShell in same console; script starts WT then returns, then launcher exits
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"
exit
```

---
**[요청 사항]**
여러 겹에 걸친 파싱 에러(PowerShell 배열 직렬화, `cmd` 파이프라인 충돌, 따옴표 이스케이프)와 프로세스 트리 동반 종료 현상에 대해 전부 방어 로직을 짰음에도 여전히 터미널이 유지되지 않고 있습니다. 
아키텍처 전문가 관점에서, `.bat` -> `powershell(5.1)` -> `ProcessStartInfo` -> `wt.exe` 파이프라인 어딘가에 숨어있는 **결정적인 병목 원인**과 **추가 우회 방안 또는 코드 수정안**을 짚어주십시오.
