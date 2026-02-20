# Eco-Pediatrics 트러블슈팅 가이드

이 문서는 **eco.bat / Environment Setup / Doctor** 관련 이슈와 해결 과정을 정리합니다. Windows Terminal 레이아웃 이슈는 `TROUBLESHOOTING_WT_LAYOUT.md`를 참고하세요.

---

## 1. Setup [2번] 실행 시 에러가 나도 창이 닫혀 원인을 알 수 없음

### 현상
- **[2] Environment Setup** 실행 중 pip/npm 등에서 실패해도 메시지가 스쳐 지나가고 창이 곧바로 닫힘.
- 사용자가 실패 여부를 인지하기 어려움.

### 원인
- 배치에서 각 단계 후 `errorlevel` 검사 없이 진행.
- 실패 시 사용자 대기(`pause`) 없이 흐름이 끝나며 창 종료.

### 해결 (적용됨)
- **단계별 실패 처리**: Backend venv 생성, `pip install -r requirements.txt`, `npm install`, `doctor.py` 각각 실행 후 `errorlevel` 검사.
- **실패 시**: `logs\eco_setup.log`에 타임스탬프와 실패 구간(FAIL/WARN) 기록, `[ECO] Setup FAILED. See errors above. Log: ...` 출력 후 **pause**로 창 유지, **goto menu**로 메뉴 복귀.
- **성공 시에만** "Setup Complete" 후 메뉴 복귀.

---

## 2. Doctor에서 Node.js / MSVC가 [FAIL]로 나옴

### 현상
- Node.js **v24.13.1** 등 마이너 버전이 올라가면 `v24.12.x` 고정 체크에 걸려 [FAIL].
- MSVC는 실제로 eco.bat Setup에서 **INCLUDE/LIB/PATH를 주입**했는데, Doctor는 시스템 PATH의 `cl.exe`만 검사해 [FAIL].

### 원인
- **Node**: `output.startswith("v24.12")` 방식이라 v24.13.x 등이 불허됨.
- **MSVC**: `shutil.which("cl")`만 사용해, 배치에서 임시로 주입한 환경 변수(세션 한정)를 반영하지 못함.

### 해결 (적용됨, scripts/doctor.py)
- **Node.js**: 정규식 `v(\d+)\.(\d+)`로 major/minor 파싱. **Major 24 && Minor >= 12** 이면 통과 (v24.12.x, v24.13.x 등 허용).
- **MSVC**: `cl.exe`를 PATH에서 찾지 못해도, **환경 변수 `INCLUDE`에 `ucrt`가 포함**되어 있으면 "Found via Environment Injection"으로 통과 처리.
- 실패 시 안내 문구를 `eco setup` 실행으로 통일.

---

## 3. Python 3.14 / VS 2026 환경에서 SDK 경로를 찾지 못함

### 현상
- pip 설치 시 C 확장 빌드에 실패하거나, `io.h` 등 SDK 헤더를 찾지 못함.
- Python 3.14와 Visual Studio 2026(버전 18) 등 최신 조합에서 레지스트리/경로 탐색이 맞지 않음.

### 원인
- `pip`/빌드 도구가 Windows Kits 10 경로를 자동으로 못 찾는 경우.
- 사용자가 수동으로 `INCLUDE`/`LIB`/`PATH`를 설정하지 않으면 빌드 실패.

### 해결 (적용됨, eco.bat Setup)
- **SDK 자동 탐색**: Setup [2번] Backend 단계에서 PowerShell로 `C:\Program Files (x86)\Windows Kits\10\Include\10.*` 아래 **최신 버전** 폴더명을 조회.
- **경로 주입**: 해당 버전으로 `SDK_INC`(Include), `SDK_LIB`(Lib), `SDK_BIN`(bin\x64)를 구성하고, `INCLUDE`, `LIB`, `PATH`에 **해당 배치 세션 한정**으로 추가.
- SDK 폴더가 없으면 "Windows SDK not found; build may fail for native deps."만 출력하고 나머지 Setup은 계속 진행.
- pip 업그레이드에 **cython** 포함, **pyroaring / pyiceberg**를 `--no-cache-dir`로 선 설치 시도 후 `requirements.txt` 설치.

---

## 4. Windows Terminal 레이아웃이 한 창만 뜨거나 탭이 여러 개 생김

### 현상
- [1] Start Dev Mode 선택 시 3분할(Error Monitor / Backend / Frontend)이 되지 않고 창 하나만 뜸.
- 또는 탭이 여러 개 생성됨.
- 런처 탭이 남아 있어 불필요한 탭이 보임.

### 원인
- PowerShell에서 `wt ... ; split-pane ... ; split-pane ...` 형태로 **문자열**을 넘기면, PowerShell이 `;`를 **자기 명령 구분자**로 해석해 `wt`에는 첫 번째 명령만 전달됨.
- 런처 배치가 `pause` 등으로 대기 중이면 해당 창(탭)이 그대로 남음.

### 해결 (적용됨)
- **launch_wt_dev.ps1**: `wt`에 넘기는 값을 **인자 배열** `$wtArgs`로 구성. `";"`를 배열의 한 요소로 넣어 **wt가 세미콜론을 받아** split-pane 등을 순서대로 실행.
- **실행**: `Start-Process "wt" -ArgumentList $wtArgs`. Backend는 `cmd /k` + `call .venv\Scripts\activate.bat`로 venv 적용.
- **런처 종료**: eco.bat에서 [1] 선택 시 PowerShell을 `start /b`로 실행한 뒤 **exit**로 배치를 즉시 종료해, 런처 탭은 사라지고 Eco-Dev-Stack 한 탭만 유지.

자세한 레이아웃 원인/전략은 **`TROUBLESHOOTING_WT_LAYOUT.md`** 참고.

---

## 5. Setup 완료 후 "Run `npm audit` for details" 메시지

### 현상
- [2] Setup 중 Frontend `npm install` 후 터미널에 `Run 'npm audit' for details.` 출력됨.

### 설명
- **정보성 메시지**이며, Setup 실패가 아님. npm이 의존성 취약점 검사 결과를 요약해 안내하는 메시지.
- 필요 시 `frontend` 디렉터리에서 `npm audit` 실행해 상세 내용 확인. `npm audit fix` 등은 팀 정책에 맞게 적용.

---

## 해결 과정 요약 (타임라인)

| 순서 | 이슈 | 조치 |
|------|------|------|
| 1 | Setup 실패 시 창이 닫혀 원인 불명 | eco.bat Setup에 단계별 errorlevel 검사, `logs\eco_setup.log` 기록, 실패 시 pause + goto menu |
| 2 | Doctor Node [FAIL] (v24.13 등) | doctor.py: Node major/minor 파싱, major 24 & minor ≥ 12 허용 |
| 3 | Doctor MSVC [FAIL] (경로 주입 환경) | doctor.py: `INCLUDE`에 `ucrt` 있으면 "Environment Injection"으로 통과 |
| 4 | Python 3.14/VS 최신 환경에서 SDK 미인식 | eco.bat Setup에서 Windows Kits 10 최신 버전 자동 탐색 후 INCLUDE/LIB/PATH 주입 |
| 5 | WT 3분할 미동작 / 탭 과다 / 런처 탭 잔류 | launch_wt_dev.ps1 인자 배열로 `;` 전달, eco.bat [1]에서 start /b 후 exit |

위 조치 적용 후 **[2] Environment Setup** 실행 시 Doctor까지 [OK]로 통과하고, **[1] Start Dev Mode** 실행 시 3분할 한 탭만 정상적으로 뜨는 상태를 목표로 유지합니다.
