# 🗺️ Project Blueprint: Frontend Startup NativeCommandError Fix

> 생성 일시: 2026-03-17 23:29 | 상태: 설계 승인 대기

## 🎯 Architectural Goal

- **목적**: `eco.bat` 실행 후 프론트엔드 기동 시 PowerShell이 `stderr` 출력을 치명적 에러(`NativeCommandError`)로 오인하는 현상을 해결.
- **SSOT**: `scripts/Start-Frontend.ps1`의 실행 로직 안정화.

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [x] **Task 1: `scripts/Start-Frontend.ps1` 수정 — 에러 처리 로직 강화**
  - **Tool**: `Edit`
  - **Target**: `c:\develop\eco_pediatrics\scripts\Start-Frontend.ps1`
  - **Goal**: `$ErrorActionPreference`를 일시적으로 조정하고, `2>&1` 리다이렉션 시 발생하는 PowerShell의 엄격한 에러 체크를 우회함.
  - **Pseudocode**:
    ```powershell
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    npm run tauri dev 2>&1 | Tee-Object -FilePath $logPath
    $ErrorActionPreference = $oldEAP
    ```
  - **Dependency**: None

- [x] **Task 2: `frontend/src-tauri/tauri.conf.json` 검토 및 최적화**
  - **Tool**: `Edit`
  - **Target**: `c:\develop\eco_pediatrics\frontend\src-tauri\tauri.conf.json`
  - **Goal**: `beforeDevCommand`에서 불필요한 `cmd /C` 접두사를 제거하여 프로세스 계층을 단순화 (Tauri가 직접 쉘을 핸들링함).
  - **Pseudocode**:
    ```json
    "beforeDevCommand": "npm run dev"
    ```
  - **Dependency**: Task 1

- [x] **Task 3: 실행 테스트 및 검증**
  - **Tool**: `Bash`
  - **Command**: `.\eco.bat` (사용자 직접 확인 권장)
  - **Goal**: 실제 터미널에서 에러 구문 없이 프론트엔드가 정상적으로 기동되는지 확인.
  - **Dependency**: Task 2

## ⚠️ 기술적 제약 및 규칙 (SSOT)

- **PowerShell Version**: PS 5.1 및 7.x 모두 호환되어야 함.
- **Logging**: 에러를 무시하더라도 `frontend.log`에는 여전히 모든 스트림이 기록되어야 함.

## ✅ Definition of Done

1. [x] `npm run tauri dev` 실행 시 빨간색 에러 텍스트(`NativeCommandError`)가 발생하지 않음.
2. [x] 프론트엔드 개발 서버(`Next.js`)와 Tauri 창이 정상적으로 팝업됨.
3. [x] `logs/frontend.log`에 실행 로그가 정상적으로 누적됨.
