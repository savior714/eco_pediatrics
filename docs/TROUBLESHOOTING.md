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
- **런처 종료**: eco.bat에서 [1] 선택 시 **start 없이** 같은 콘솔에서 PowerShell 실행 후 `exit`로 런처만 종료 (§6 참고).

#### 레이아웃 역전 (상단 2분할로 나오는 현상)
- **현상**: `split-pane -H` 후 `split-pane -V`만 쓰면, WT 버전/설정에 따라 포커스가 상단(20%)에 머물러 있어 **상단이 좌우로 쪼개지고** 하단이 1개 큰 패널로 나옴.
- **시도**: `-p 1`로 하단 패널을 지정해 분할했으나, 환경에 따라 동작하지 않음.
- **최종 해결**: `split-pane -H` 직후 **`move-focus down`** 을 넣어 포커스를 하단 패널로 강제 이동한 뒤 `split-pane -V` 실행. 인덱스에 의존하지 않아 결정론적으로 **상단 1개 + 하단 2분할** 유지.

자세한 레이아웃 원인/전략은 **`TROUBLESHOOTING_WT_LAYOUT.md`** 참고.

---

## 5. Frontend: `cargo metadata ... program not found` (Tauri)

### 현상
- `npm run tauri dev` 또는 [1] Dev Mode 실행 시 Frontend 패널에서 `failed to run 'cargo metadata' ... program not found` 에러.
- Tauri 데스크톱 앱은 Rust로 빌드되므로 **cargo**(Rust 패키지 매니저)가 필요함.

### 해결
- **Rust 툴체인 설치**: Windows에서는 [rustup](https://rustup.rs/)으로 설치. `winget install Rustlang.Rustup` 또는 사이트에서 `rustup-init.exe` 다운로드 후 실행.
- 설치 후 **터미널을 새로 열어** `PATH`에 `cargo`가 반영되었는지 확인. `cargo --version` 실행.
- `eco check` 실행 시 **Rust (cargo)** 항목이 [OK]면 Tauri 빌드 가능.

자세한 설치 및 표준 버전은 **`docs\DEV_ENVIRONMENT.md`** §1 표·§4.1 참고.

---

## 6. Setup 완료 후 "Run `npm audit` for details" 메시지

### 현상
- [2] Setup 중 Frontend `npm install` 후 터미널에 `Run 'npm audit' for details.` 출력됨.

### 설명
- **정보성 메시지**이며, Setup 실패가 아님. npm이 의존성 취약점 검사 결과를 요약해 안내하는 메시지.
- 필요 시 `frontend` 디렉터리에서 `npm audit` 실행해 상세 내용 확인. `npm audit fix` 등은 팀 정책에 맞게 적용.

---

## 7. [1번] Dev Mode 선택 시 터미널이 모두 사라짐 (WT까지 안 뜸)

### 현상
- eco.bat 실행 후 **[1] Start Dev Mode** 선택 시, 런처 창이 닫히는 것은 의도이나 **Windows Terminal(3분할) 창도 뜨지 않거나**, 잠깐 뜨었다가 연달아 모두 사라짐.
- “하나 뜨고 사라지고, 하나 뜨고 사라지고” 반복 후 결국 아무 창도 남지 않음.

### 시도했던 방식과 원인

| 방식 | 동작 | 원인 |
|------|------|------|
| **`start /b`** 후 `exit` | 런처만 닫히려 했으나 WT도 안 뜸 또는 같이 사라짐 | `start /b`로 띄운 PowerShell이 **부모 CMD와 같은 세션**에서 백그라운드로만 동작. CMD가 `exit`로 종료되면 자식 프로세스까지 함께 종료됨. |
| **`start ""`** (새 창) 후 `exit` | 창이 여러 번 뜨었다 사라짐 | 새 창으로 띄운 PowerShell이 WT를 띄운 뒤 종료할 때, **부모‑자식 관계나 작업 그룹** 때문에 WT 프로세스까지 정리되는 환경이 있을 수 있음. |

### 해결 (적용됨)
- **PowerShell을 별도 창으로 띄우지 말고**, **런처 CMD와 같은 콘솔**에서 실행.
- `eco.bat`의 `:dev`에서 `start`를 제거하고, 곧바로 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"` 호출.
- 스크립트가 `Start-Process "wt" -ArgumentList $wtArgs`로 WT만 띄우고 **즉시 반환**하면, 제어가 다시 CMD로 돌아옴.
- 이어서 CMD가 **`exit`**로 런처만 종료. WT는 이미 **독립 프로세스**로 떠 있으므로 유지됨.

```batch
:: Run PowerShell in same console; script starts WT then returns, then launcher exits
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"
exit
```

### 요약
- **같은 콘솔에서 PowerShell 실행 → 스크립트가 WT만 띄우고 반환 → 런처만 exit** 순서를 지키면, 런처 창만 닫히고 3분할 WT 창은 정상적으로 남음.

---

## 해결 과정 요약 (타임라인)

| 순서 | 이슈 | 조치 |
|------|------|------|
| 1 | Setup 실패 시 창이 닫혀 원인 불명 | eco.bat Setup에 단계별 errorlevel 검사, `logs\eco_setup.log` 기록, 실패 시 pause + goto menu |
| 2 | Doctor Node [FAIL] (v24.13 등) | doctor.py: Node major/minor 파싱, major 24 & minor ≥ 12 허용 |
| 3 | Doctor MSVC [FAIL] (경로 주입 환경) | doctor.py: `INCLUDE`에 `ucrt` 있으면 "Environment Injection"으로 통과 |
| 4 | Python 3.14/VS 최신 환경에서 SDK 미인식 | eco.bat Setup에서 Windows Kits 10 최신 버전 자동 탐색 후 INCLUDE/LIB/PATH 주입 |
| 5 | WT 3분할 미동작 / 탭 과다 / 런처 탭 잔류 | launch_wt_dev.ps1 인자 배열로 `;` 전달 |
| 6 | [1번] 선택 시 터미널이 모두 사라짐 (WT까지 종료) | eco.bat [1]에서 **start 없이** 같은 콘솔에서 PowerShell 실행 → 스크립트가 WT 띄우고 반환 → exit로 런처만 종료 |
| 7 | 3분할 레이아웃 역전 (상단 2분할 + 하단 1개) | `split-pane -H` 직후 **`move-focus down`** 추가 → 그 다음 `split-pane -V`로 하단만 좌우 분할 (포커스 의존 제거) |
| 8 | Frontend `cargo ... program not found` (Tauri) | Rust 툴체인 설치: rustup (https://rustup.rs/ 또는 `winget install Rustlang.Rustup`). 설치 후 터미널 재시작. doctor에 cargo 검사 추가. |
| 9 | 에러 모니터 미동작 / 프론트 에러 미감지 | launch_wt_dev.ps1: 모니터는 backend\\.venv\\Scripts\\python.exe 사용, Frontend는 Tee-Object로 frontend/logs/frontend.log 기록. error_monitor.py: main() 진입 시 로그 디렉터리 선제 생성. |

위 조치 적용 후 **[2] Environment Setup** 실행 시 Doctor까지 [OK]로 통과하고, **[1] Start Dev Mode** 실행 시 런처는 닫히고 **상단 20% Error Monitor + 하단 80% Backend/Frontend 2분할** WT 창이 정상적으로 유지됩니다.

---

## 9. 에러 모니터가 동작하지 않거나 프론트 에러를 감지하지 못함

### 현상
- Error Monitor 패널은 떠 있으나 `prompt_for_gemini.md`가 갱신되지 않음.
- Backend 에러만 잡히고 Frontend(Tauri/Next) 에러는 반영되지 않음.

### 원인
- **프론트엔드 로그 미수집**: `npm run tauri dev`는 터미널에만 출력되므로, **Tee-Object** 등으로 `frontend/logs/frontend.log`에 리다이렉트하지 않으면 모니터가 파일 변화를 감지할 수 없음.
- **모니터 Python 경로**: 시스템 기본 `python`을 쓰면 venv 미적용으로 의존성 오류로 즉시 종료될 수 있음. **backend\\.venv\\Scripts\\python.exe**를 사용해야 함.

### 해결 (적용됨)
- **launch_wt_dev.ps1**: (1) Error Monitor 패널에서 `backend\.venv\Scripts\python.exe error_monitor.py --clear` 실행. (2) Frontend 패널에서 `npm run tauri dev` 출력을 `powershell -Command "npm run tauri dev 2>&1 | Tee-Object -FilePath 'logs\frontend.log' -Append"`로 실행해 `frontend/logs/frontend.log`에 기록.
- **error_monitor.py**: `main()` 진입 시 `_ensure_log_directories()`로 감시 대상 로그 디렉터리(`backend/logs`, `frontend/logs`)를 선제 생성.
- **검증**: `frontend/logs/frontend.log` 파일이 생성·갱신되는지, Backend 로그 끝에 `ERROR: Manual Test`를 넣었을 때 `prompt_for_gemini.md`가 갱신되는지 확인.
