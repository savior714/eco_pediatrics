# Eco-Pediatrics 개발환경 표준 가이드 (UV-Native & Tauri)

본 문서는 `eco_pediatrics` 프로젝트의 **일관된 개발 및 빌드 환경을 위한 단일 진실 공급원(SSOT)**입니다. 모든 개발자는 본 가이드를 엄격히 준수해야 하며, 특히 **uv를 통한 통합 도구 관리 체계**를 유지해야 합니다.

---

## 1. 시스템 표준 스택 (Standard Toolchain)

| 항목 | 버전 | 관리 및 실행 표준 (필수) |
|------|------|------------------------|
| **OS** | Windows 11 (64-bit) | PowerShell 7 (pwsh) 사용 권장 |
| **Python** | **3.14.x** | **uv** 가상환경(`.venv`) 필수 |
| **Node.js** | **24.12.x** | **uv run --with nodejs** 또는 시스템 설치본 사용 |
| **Package Manager** | **uv** | **Backend(uv sync), Frontend(uv run npm/pnpm)** |
| **Terminal** | Windows Terminal | `scripts/launch_wt_dev.ps1`을 통한 3분할 실행 |
| **Build Tools** | VS 2022/2025 | MSVC v143 이상, Windows 10/11 SDK 필수 |

---

## 2. 도구 통합 관리 체계 (UV-Native Philosophy)

본 프로젝트는 도구 파편화를 방지하기 위해 **uv**를 최상위 프로젝트 매니저로 사용합니다.

### 2.1 uv 설치 (전제 조건)
PowerShell에서 아래 명령으로 `uv`를 설치합니다. 모든 가상환경과 도구 체인은 `uv`를 통해 구동됩니다.
```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

### 2.2 백엔드 환경 설정
가상환경은 오직 `uv`로만 생성 및 동기화합니다.
```powershell
cd backend
uv venv .venv --python 3.14
uv sync  # uv.lock 기준 동기화
```

### 2.3 프론트엔드 환경 설정 (uv Wrapper)
프론트엔드 역시 `uv`의 도구 관리 하위에서 실행하여 노드 버전 및 패키지 매니저의 일관성을 확보합니다.
```powershell
cd frontend
# uv를 통해 npm 명령 실행 (환경 격리)
uv run --with nodejs@24.12.0 npm install
uv run --with nodejs@24.12.0 npm run dev
```

---

## 3. 원클릭 환경 구축 (Eco Launcher)

프로젝트 루트의 `eco.bat`(또는 `eco` CLI)은 위 복잡한 과정들을 자동화합니다.

### 3.1 런처 메뉴 일람
- **`eco setup`**: `Setup-Environment.ps1`을 실행하여 `uv` 환경 구축, 백엔드/프론트엔드 의존성 설치, Windows SDK 경로 등록을 일괄 수행합니다.
- **`eco dev`**: `scripts/launch_wt_dev.ps1`을 호출하여 벡엔드(uv run), 프론트엔드(npm run dev), 에러 모니터(python -m plugins.error_monitor)를 분할 창으로 띄웁니다.
- **`eco check`**: `doctor.py`를 통해 현재 환경의 무결성을 숫자로 보고합니다.

---

## 4. 빌드 및 컴파일러 환경 (MSVC/SDK)

Tauri 및 일부 Python 패키지(pyiceberg 등) 빌드를 위해 Windows SDK와 MSVC 컴파일러 설정이 필수적입니다.

- **자동 설정**: `eco setup` 실행 시 `scripts/Refresh-BuildEnv.ps1`이 최신 Windows SDK 경로를 **사용자 환경 변수에 영구 등록**합니다.
- **수동 검증**: 터미널에서 `cl` 명령이 실행되는지 확인하십시오. 만약 찾지 못한다면 `Visual Studio Installer`에서 'C++를 사용한 데스크톱 개발' 워크로드 설치 여부를 확인하십시오.

---

## 5. 인코딩 및 언어 원칙 (Global Rules)

- **언어**: 모든 소스 코드의 주석과 문서는 **한국어**를 사용합니다.
- **이모지**: **어떠한 문서나 로그에도 이모지 사용을 엄격히 금지합니다.**
- **인코딩**: 
  - **배치 파일(.bat, .cmd)**: `ANSI (CP949)` 유지. (수정 시 주의)
  - **기타 소스(.ts, .py, .md 등)**: `UTF-8 (no BOM)` 고정.

---

## 6. 핵심 점검 리스트 (Pre-flight Checklist)

1. [ ] `uv --version`이 정상적으로 출력되는가?
2. [ ] `frontend/package-lock.json`과 `backend/uv.lock`이 최신 상태인가?
3. [ ] `docs/memory.md`에 현재 작업 맥락이 기록되어 있는가?
4. [ ] 모든 API 호출 훅에 500ms 스로틀(`lastFetchRef`)이 적용되어 있는가?

---
*본 가이드는 프로젝트의 '개발 헌법'입니다. 에이전트와 개발자 모두 이 기준을 벗어난 도구 호출을 지양하십시오.*
