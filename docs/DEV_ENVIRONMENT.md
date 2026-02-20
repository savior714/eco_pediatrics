# Eco-Pediatrics 개발환경 가이드 (Standard: Laptop)

이 문서는 **노트북(Laptop)** 기반의 개발환경을 **표준(SSOT)**으로 정의합니다. 데스크탑 등 다른 환경은 이 기준을 따르도록 설정해야 합니다.

---

## 1. 시스템 표준 사양 (Laptop 기준)

| 항목 | 버전 | 비고 |
|------|------|------|
| **OS** | Windows 11 (64-bit) | |
| **Terminal** | **Windows Terminal 1.23.20211.0** | |
| **Python** | **3.14.2 64-bit** | 표준 인터프리터 버전 |
| **Node.js** | **24.12.0** | 표준 런타임 버전 |
| **npm** | **11.6.2** | |
| **Git** | **2.52.0.windows.1** | |
| **Visual Studio** | 2022/2025 | C++ 데스크톱 개발 워크로드 필수 |

### ⚠️ Python 3.14 사용 시 (MSVC 빌드 환경)

- **numpy 2.4.2**는 Python 3.14용 wheel을 제공하므로 VS 빌드 없이 설치 가능합니다.
- 빌드 오류 발생 시: Visual Studio Installer에서 **C++를 사용한 데스크톱 개발** 워크로드 및 **C++ 유니버설 CRT SDK** 설치여부를 확인하세요.
- **eco setup [2번]** 실행 시 **Windows Kits 10** 최신 SDK를 자동 탐색하여 `INCLUDE`/`LIB`/`PATH`에 주입합니다. 별도 수동 설정 없이 네이티브 패키지 빌드가 가능합니다.

---

## 2. Python 환경 설정

### 2.1 가상환경 구성 (Standard)
```cmd
cd backend
py -3.14 -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 2.2 MSVC 컴파일러 환경 강제 로드 (PowerShell)

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

### 2.3 IDE Terminal 설정 (Standard)

Antigravity 에이전트 및 자동화 도구가 PowerShell 7을 올바르게 참조하고 일관된 테마를 유지하도록 VS Code 또는 IDE `settings.json`에 아래 설정을 적용하는 것을 권장합니다.

```json
{
    "workbench.colorTheme": "Solarized Light",
    "redhat.telemetry.enabled": true,
    "python.languageServer": "Default",
    // PowerShell 7 프로필 정의
    "terminal.integrated.profiles.windows": {
        "PowerShell 7": {
            "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
            "icon": "terminal-powershell"
        }
    },
    // Antigravity가 명령어를 보낼 때 참조하는 기본 경로
    "terminal.integrated.automationProfile.windows": {
        "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
    },
    // 전체 터미널 기본값도 PS7로 지정
    "terminal.integrated.defaultProfile.windows": "PowerShell 7",
    "terminal.integrated.gpuAcceleration": "off"
}
```

---

## 3. Eco Launcher (eco.bat)

프로젝트 루트의 `eco.bat`(또는 `eco` CLI)으로 개발 환경을 일괄 실행·설정·검증합니다.

### 3.1 메뉴

| 선택 | 동작 |
|------|------|
| **[1] Start Dev Mode** | Windows Terminal 한 탭에서 3분할 실행 후 **런처 창 자동 종료**. 상단 20% Error Monitor, 하단 80%를 좌(Backend) / 우(Frontend) 50%씩. |
| **[2] Environment Setup** | Backend venv 생성, **SDK 자동 탐색·경로 주입**, pip/npm 설치, doctor 검증. 실패 시 `logs\eco_setup.log` 기록 및 메뉴로 복귀. |
| **[3] Run Security & Health Check** | `doctor.py` + `security_check.py` 실행. |
| **[Q] Quit** | 종료. |

### 3.2 CLI 모드

```cmd
eco dev      :: [1]과 동일 (WT 3분할, 런처 종료)
eco setup    :: [2]와 동일
eco check    :: [3]과 동일
eco backend  :: Backend만 단일 창 실행
eco frontend :: Frontend만 단일 창 실행
```

### 3.3 Setup [2번] 상세

1. **Prerequisite 검사**: Python 3.14.x, Node.js v24.12.x 없으면 실패 로그 후 `setup_fail`.
2. **Backend**: `.venv` 없으면 생성 → **SDK Discovery**(`C:\Program Files (x86)\Windows Kits\10\Include\10.*` 최신 버전으로 `INCLUDE`/`LIB`/`PATH` 설정) → pip upgrade(cython 포함) → pyroaring/pyiceberg 시도 → `pip install -r requirements.txt` → `.env` 없으면 복사.
3. **Frontend**: `npm install` → `.env.local` 없으면 복사.
4. **검증**: `scripts\doctor.py` 실행. 실패 시 WARN 출력 후 메뉴 복귀.
5. **로그**: 모든 실패는 `logs\eco_setup.log`에 타임스탬프와 함께 기록됨.

### 3.4 Dev [1번] 레이아웃

`scripts\launch_wt_dev.ps1`이 `wt` 인자 **배열**로 `;`를 전달하여 PowerShell 파싱 이슈를 피함. 한 탭만 생성되고, 런처는 `start /b` 후 `exit`로 즉시 종료되어 Eco-Dev-Stack 탭만 남음. 자세한 트러블슈팅은 `docs\TROUBLESHOOTING_WT_LAYOUT.md` 참고.

---

## 4. 프론트엔드 설정 (Standard)
- **Node.js v24.12.0**를 기준으로 빌드 및 테스트를 수행합니다.
```cmd
cd frontend
npm install
npm run dev
```

---

## 5. Automated Verification (Standard)

환경 설정 후, 제공된 스크립트를 통해 현재 상태가 표준과 일치하는지 자동 검증할 수 있습니다.

```powershell
eco check
```

- **성공 시**: `🎉 Environment is HEALTHY!` 메시지가 출력됩니다.
- **실패 시**: `❌`로 표시된 항목을 확인하고 수정하세요.

---

## 6. Quick Setup (One-Click)

새로운 환경에서 프로젝트를 처음 세팅할 때, 아래 스크립트를 실행하면 의존성 설치 및 환경 변수 설정이 자동 수행됩니다.

1. **Prerequisite**: Python 3.14.x 및 Node.js v24.12.x가 미리 설치되어 있어야 합니다.
2. **Run**:
    ```cmd
    eco setup
    ```
    - `backend` 가상환경 생성, **Windows Kits 10 SDK 자동 탐색·경로 주입**, pip(cython 포함) 및 requirements 설치
    - `frontend` npm 패키지 설치
    - `.env` 및 `.env.local` 초기화
    - 실패 시 `logs\eco_setup.log` 확인 후 재실행 또는 수동 설치

---

## 7. 환경 간 동기화 (Desktop/Other)
데스크탑 등 다른 환경에서 작업할 경우 반드시 아래 사항을 노트북 환경과 일치시켜야 합니다.
1. **버전 유지**: Node.js v24 및 Python 3.14.2 버전을 동일하게 유지합니다.
2. **패키지 정합성**: 노트북에서 추가된 패키지는 `requirements.txt` 및 `package.json`을 통해 즉시 동기화합니다.
3. **환경 변수**: `backend/.env` 및 `frontend/.env.local`의 Supabase 연결 정보를 동일하게 설정합니다.

---

## 8. 검증 체크리스트 (Standard)
- [ ] `eco check` 실행 → **HEALTHY** 확인
- [ ] `py -3.14 --version` → Python 3.14.2
- [ ] `node -v` → v24.12.0
- [ ] 가상환경 활성화 및 패키지 설치 확인
- [ ] `eco dev` 실행 확인 (통합 실행)

