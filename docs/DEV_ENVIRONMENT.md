# Eco-Pediatrics 개발환경 가이드 (Standard: Laptop)

이 문서는 **노트북(Laptop)** 기반의 개발환경을 **표준(SSOT)**으로 정의합니다. 데스크탑 등 다른 환경은 이 기준을 따르도록 설정해야 합니다.

---

## 1. 시스템 표준 사양 (Laptop 기준)

| 항목 | 버전 | 비고 |
|------|------|------|
| **OS** | Windows 11 (64-bit) | |
| **Terminal** | **Windows Terminal 1.23.20211.0** | |
| **Python** | **3.14.2 64-bit** | |
| **Node.js** | **24.12.0** | |
| **npm** | **11.6.2** | |
| **uv** | **0.5.x 이상** | **Python 패키지 및 프로젝트 관리 표준 (필수)** |
| **Git** | **2.52.0.windows.1** | |
| **Visual Studio** | 2022/2025 | C++ 데스크톱 개발 워로드 필수 |
| **Rust (cargo)** | rustup 설치 권장 | Tauri 데스크톱 앱 빌드/실행에 필요 |

### uv 설치 (필수)

가상환경은 **uv**로만 생성·관리합니다. 미설치 시 아래 중 하나로 설치 후 터미널을 다시 열어주세요.

```powershell
# PowerShell (권장)
irm https://astral.sh/uv/install.ps1 | iex
```

설치 확인: `uv --version`

### [주의] Python 3.14 사용 시 (UV Native 환경)

- **uv**는 Python 3.14 인터프리터를 자동으로 설치하고 관리할 수 있습니다.
- 빌드 오류 발생 시: Visual Studio Installer에서 **C++를 사용한 데스크톱 개발** 워크로드 및 **C++ 유니버설 CRT SDK** 설치여부를 확인하세요.
- **eco setup [2번]** 실행 시 `scripts/Setup-Environment.ps1`이 내부에서 `Refresh-BuildEnv.ps1`·`Get-SdkVersion.ps1`을 호출하며, 최신 Windows SDK(UCRT 포함) 경로를 **사용자 환경 변수에 영구 등록**하고 현재 세션에 INCLUDE/LIB/PATH를 주입합니다.

---

## 2. Python 환경 설정 (UV Native)

### 2.1 가상환경 구성 (Standard)
```powershell
cd backend
# 가상환경 생성 (이미 존재하면 스킵 가능)
uv venv .venv --python 3.14

# 의존성 설치 (uv.lock 존재 시 sync 권장)
if (Test-Path "uv.lock") { uv sync } else { uv pip install -r requirements.txt }
```

### 2.2 실행 (Standard)
```powershell
# 개별 실행 시 (activate 필요 없음)
uv run uvicorn main:app --reload
```

### 2.3 MSVC 컴파일러 환경 강제 로드 (PowerShell)

`cl` 명령을 찾지 못할 때, 일반 PowerShell/터미널에서 VS 빌드 환경 변수를 주입합니다. (Python 패키지 직접 컴파일용)

```powershell
# VS 2022 Community 기준
$vcvars = "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cmd /c "`"$vcvars`" & set" | ForEach-Object {
    if ($_ -match "([^=]+)=(.*)") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}
cl   # 확인: 컴파일러 정보 출력
```

---

## 3. Eco Launcher (eco.bat)

프로젝트 루트의 `eco.bat`(또는 `eco` CLI)으로 개발 환경을 일괄 실행·설정·검증합니다.

### 3.1 메뉴

| 선택 | 동작 |
|------|------|
| **[1] Start Dev Mode** | Windows Terminal 3분할 실행 후 런처 종료. (uv run + npm run dev) |
| **[2] Environment Setup** | **PowerShell** `scripts/Setup-Environment.ps1` 호출. uv venv 생성, SDK 탐색(Refresh-BuildEnv, Get-SdkVersion), uv pip install, npm install, doctor 검증. 로그: `logs/eco_setup.log`. |
| **[3] Run Security & Health Check** | `doctor.py` + `security_check.py` 실행. |
| **[Q] Quit** | 종료. |

**[2] Setup** 은 cmd 배치 대신 PowerShell에서 전부 실행되어, npm/uv 래퍼 호출 및 괄호 파싱 크래시를 회피합니다.

### 3.2 CLI 모드

```cmd
eco dev      :: [1]과 동일 (WT 3분할, 런처 종료)
eco setup    :: [2]과 동일
eco check    :: [3]과 동일
eco backend  :: Backend만 단일 창 실행 (uv run)
eco frontend :: Frontend만 단일 창 실행 (npm run dev)
```

---

## 4. 프론트엔드 설정 (Standard)

- **Node.js v24.12.0**를 기준으로 빌드 및 테스트를 수행합니다.
- **Tauri 데스크톱 앱**(`npm run tauri dev`)을 쓰려면 **Rust 툴체인(cargo)** 이 필요합니다.

```cmd
cd frontend
npm install
npm run dev
```

---

## 5. Automated Verification (Standard)

```powershell
eco check
```

- **성공 시**: `Environment is HEALTHY!` 메시지가 출력됩니다.
- **실패 시**: [FAIL]로 표시된 항목을 확인하고 수정하세요.

---

## 6. Quick Setup (One-Click)

1. **Prerequisite**: uv(필수), Node.js v24.12.x가 설치되어 있어야 합니다.
2. **Run**:
    ```cmd
    eco setup
    ```
    - PowerShell `Setup-Environment.ps1`이 uv 가상환경·의존성·npm·doctor를 일괄 수행하고, Windows SDK 경로를 영구 등록합니다.
3. **배치 인코딩**: eco.bat 실행 시 창이 바로 닫히면 `pwsh -File scripts\Fix-BatEncoding.ps1`로 eco.bat·start_backend_pc.bat을 ANSI(CP949)로 재저장한 뒤 다시 실행하세요.
