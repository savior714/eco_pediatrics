# Eco-Pediatrics 트러블슈팅 가이드

이 문서는 개발 환경, 런타임, 비즈니스 로직 관련 이슈와 해결 과정을 정리합니다.

**카테고리:**
- [환경 설정 (§1–§5)](#1-setup-2번-실행-시-에러가-나도-창이-닫혀-원인을-알-수-없음)
- [런타임 / 실행 오류 (§6–§11)](#6-setup-완료-후-run-npm-audit-for-details-메시지)
- [비즈니스 로직 버그 (§12–§15)](#12-스테이션-그리드-초기-로드-시-빈-화면-race-condition)
- [Windows Terminal 레이아웃 상세](#windows-terminal-layout-race-condition-2026-02-19)

---

## 1. Setup [2번] 실행 시 에러가 나도 창이 닫혀 원인을 알 수 없음

### 현상
- **[2] Environment Setup** 실행 중 pip/npm 등에서 실패해도 메시지가 스쳐 지나가고 창이 곧바로 닫힘.
- 사용자가 실패 여부를 인지하기 어려움.

### 원인
- 배치에서 각 단계 후 `errorlevel` 검사 없이 진행.
- 실패 시 사용자 대기(`pause`) 없이 흐름이 끝나며 창 종료.

### 해결 (적용됨)
- **[2] Setup** 은 **PowerShell** `scripts/Setup-Environment.ps1`에서 전부 실행됨. Backend(.venv, uv pip), Frontend(npm install), doctor 검증을 한 세션에서 수행.
- **실패 시**: `logs\eco_setup.log`에 타임스탬프·FAIL/WARN 기록, `[ECO] Setup FAILED. See errors above. Log: ...` 출력 후 **pause** → 메뉴 복귀.
- **성공 시** "Setup Complete" 후 메뉴 복귀. 배치 인코딩 문제로 창이 바로 닫히면 `pwsh -File scripts\Fix-BatEncoding.ps1` 실행 후 eco.bat 재실행.

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

### 해결 (적용됨, Setup-Environment.ps1)
- **SDK 자동 탐색**: [2] Setup 시 `scripts/Setup-Environment.ps1`이 `Refresh-BuildEnv.ps1`(영구 등록)과 `Get-SdkVersion.ps1`(버전을 `logs/sdk_ver.txt`에 기록)을 호출. 해당 버전으로 **현재 PowerShell 세션**에 `INCLUDE`, `LIB`, `PATH` 주입.
- SDK 폴더가 없으면 "Windows SDK not found; build may fail for native deps."만 출력하고 나머지 Setup은 계속 진행.
- uv pip 업그레이드에 **cython** 포함, **pyroaring / pyiceberg** 등은 `requirements.txt` 설치로 처리.

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
- **최종 해결**: `split-pane -H` 직후 **`move-focus down`** 을 넣어 포커스를 하단 패널로 강제 이동한 뒤 `split-pane -V` 실행. 인덱스에 의존하지 않아 결정론적으로 **상단 1개 + 하단 2분할** 유지.

자세한 레이아웃 원인/전략은 본 문서 하단 [Windows Terminal Layout Race Condition](#windows-terminal-layout-race-condition-2026-02-19) 참고.

---

## 5. Frontend: `cargo metadata ... program not found` (Tauri)

### 현상
- `npm run tauri dev` 또는 [1] Dev Mode 실행 시 Frontend 패널에서 `failed to run 'cargo metadata' ... program not found` 에러.
- Tauri 데스크톱 앱은 Rust로 빌드되므로 **cargo**(Rust 패키지 매니저)가 필요함.

### 해결
- **Rust 툴체인 설치**: Windows에서는 [rustup](https://rustup.rs/)으로 설치. `winget install Rustlang.Rustup` 또는 사이트에서 `rustup-init.exe` 다운로드 후 실행.
- 설치 후 **터미널을 새로 열어** `PATH`에 `cargo`가 반영되었는지 확인. `cargo --version` 실행.
- `eco check` 실행 시 **Rust (cargo)** 항목이 [OK]면 Tauri 빌드 가능.

자세한 설치 및 표준 버전은 `docs/DEV_ENVIRONMENT.md` §1 표·§4.1 참고.

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

### 원인 및 해결 (적용됨)
- **PowerShell을 별도 창으로 띄우지 말고**, **런처 CMD와 같은 콘솔**에서 실행.
- `eco.bat`의 `:dev`에서 `start`를 제거하고, 곧바로 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"` 호출.
- 스크립트가 `Start-Process "wt" -ArgumentList $wtArgs`로 WT만 띄우고 **즉시 반환**하면, 제어가 다시 CMD로 돌아옴.
- 이어서 CMD가 **`exit`**로 런처만 종료. WT는 이미 **독립 프로세스**로 떠 있으므로 유지됨.

```batch
:: Run PowerShell in same console; script starts WT then returns, then launcher exits
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"
exit
```

---

## 8. eco.bat / start_backend_pc.bat 실행 시 명령어 파편화 에러 (인코딩)

### 현상
- `eco.bat` 또는 `start_backend_pc.bat` 실행 시 에러 메시지가 연달아 출력되며 터미널이 종료됨.
- 예: `'cho'은(는) 내부 또는 외부 명령이 아닙니다.`, `'edelayedexpansion'은(는) 인식되지 않습니다.`, `'1"==""'은(는) 인식되지 않습니다.` 등.

### 근본 원인
- **인코딩 불일치**: Windows 배치(`.bat`) 파일은 `cmd.exe`가 **ANSI(CP949/EUC-KR)** 로 해석함.
- IDE(Cursor/VS Code)나 Git 설정에 의해 파일이 **UTF-16 LE** 또는 **UTF-8 BOM**으로 저장되면, `cmd.exe`가 바이트를 잘못 해석하여 명령어가 파편화됨.

### 해결 (적용됨)

1. **스크립트로 일괄 재저장 (권장)**
   ```powershell
   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\Fix-BatEncoding.ps1
   ```
   실행 후 eco.bat을 다시 실행하세요.

2. **chcp 65001**: `eco.bat`·`start_backend_pc.bat`에는 `chcp 65001 >nul`이 포함되어 있음.

3. **한글 주석 → ASCII**: 배치 내 한글 주석을 영문으로 치환하여 인코딩 의존성 제거.

### 재발 방지 (CRITICAL_LOGIC §2.5)
- `eco.bat`, `start_backend_pc.bat` 등 `.bat` 파일은 반드시 **ANSI(EUC-KR/CP949)** 또는 **ASCII** 인코딩 유지.
- IDE에서 배치 파일 수정 후 **Save with Encoding** → **Korean (EUC-KR)** 또는 **Western (Windows 1252)** 선택.

---

## 9. 에러 모니터가 동작하지 않거나 프론트 에러를 감지하지 못함

### 현상
- Error Monitor 패널은 떠 있으나 `docs/prompts/prompt_for_gemini.md`가 갱신되지 않음.
- Backend 에러만 잡히고 Frontend(Tauri/Next) 에러는 반영되지 않음.

### 원인
- **프론트엔드 로그 미수집**: `npm run tauri dev`는 터미널에만 출력되므로, **Tee-Object** 등으로 `frontend/logs/frontend.log`에 리다이렉트하지 않으면 모니터가 파일 변화를 감지할 수 없음.
- **모니터 Python 경로**: 시스템 기본 `python`을 쓰면 venv 미적용으로 의존성 오류로 즉시 종료될 수 있음. **backend\\.venv\\Scripts\\python.exe**를 사용해야 함.

### 해결 (적용됨)
- **launch_wt_dev.ps1**: Error Monitor 패널에서 `backend\.venv\Scripts\python.exe -m plugins.error_monitor` 실행.
- **error_monitor.py**: `main()` 진입 시 `_ensure_log_directories()`로 감시 대상 로그 디렉터리(`backend/logs`, `frontend/logs`)를 선제 생성.
- **Tee-Object 파이프라인 주의**: `Tee-Object`를 통한 로그 리다이렉션은 WT 파싱 부하를 가중시켜 창이 즉시 종료(`0x80070002`)되거나 Tauri 서버 준비 완료 신호를 방해할 수 있음. 현재는 파이프라인 없이 순수 명령만 실행하는 방식으로 운영 중.

---

## 10. Start Dev Mode 실행 시 Windows Terminal 창이 즉시 종료됨 (0x80070002)

### 현상
- `eco.bat 1` 실행 시 Windows Terminal이 잠깐 번쩍이다 사라지거나, `0x80070002` (파일을 찾을 수 없음) 에러 발생.

### 원인
- **Tokenization Failure**: `split-pane` 명령어에 전달되는 실행 커맨드 전체를 따옴표(`" "`)로 묶을 경우, `wt` 파서가 "공백을 포함한 전체 문자열"을 하나의 실행 파일 이름으로 오인함.
- **Delimiter Over-escaping**: Win32 API(`ProcessStartInfo`)를 통해 직접 인자를 넘길 때는 쉘 이스케이프(`\;`)가 아닌 순수 세미콜론(`;`)을 사용해야 함.

### 해결 (적용됨, launch_wt_dev.ps1)
- **Outer Quote 제거**: 각 패널의 실행 명령(`$feCmd` 등) 앞뒤의 따옴표를 제거하여 `wt`가 실행 파일과 인자를 토큰별로 정확히 구분하게 함.
- **Raw Delimiter**: 백슬래시 없는 순수 세미콜론(` ; `)으로 명령 단위를 분할.
- **Pipeline Removal**: `Tee-Object` 파이프라인을 완전히 제거하여 구문 복잡도를 낮추고 실행 안정성 확보.

---

## 11. 식단/서류 상태 변경 시 `'AsyncFilterRequestBuilder' object has no attribute 'select'` 에러

### 현상
- 식단 변경 승인(`update_meal_request_status`) 또는 서류 요청 상태 변경(`update_document_request_status`) 시 500 에러 발생.
- Backend 로그에 `'AsyncFilterRequestBuilder' object has no attribute 'select'` 출력.

### 원인
- **supabase-py v2+**에서 `UpdateRequestBuilder`/`DeleteRequestBuilder`는 `.select()` 메서드를 지원하지 않음.
- `update().eq().select()` 체이닝이 불가능.

### 해결 (적용됨, backend/routers/station.py)
- **2단계 분리 패턴** 적용 (CRITICAL_LOGIC §2.4, DEVELOPMENT_STANDARDS §4 참고):

```python
# BAD (supabase-py에서 지원 안 함)
res = await db.table("meal_requests").update(payload).eq("id", id).select("*").execute()

# GOOD
await execute_with_retry_async(db.table("meal_requests").update(payload).eq("id", request_id))
row = await execute_with_retry_async(db.table("meal_requests").select("*").eq("id", request_id).single())
```

### 검증
- `backend/search_error.py` 실행 시 `.update().select()`, `.delete().select()` 등 BAD 패턴이 남아 있으면 출력됨.

---

## 12. 스테이션 그리드 초기 로드 시 빈 화면 (Race Condition)

### 현상
- `/station` 최초 접속 시 DB에 환자 데이터가 있음에도 그리드가 빈 슬롯으로만 보임.
- "DEV: 환자추가" 버튼을 누르면 그때서야 데이터가 채워짐.
- 퇴원 후 `window.location.reload()` 시에도 나머지 환자 카드가 잠깐 사라졌다가 복구되거나, 빈 화면으로 남음.

### 원인
1. **useEffect 내 파괴적 리셋**: effect 첫 줄에서 `setBeds(ROOM_NUMBERS.map(...))`로 빈 슬롯을 덮어써, API 응답 도착 전·후로 그리드가 강제 초기화되며 데이터가 증발.
2. **React Strict Mode 이중 호출**: 개발 모드에서 effect가 두 번 실행되며 `fetchAdmissions()`가 두 번 호출됨. 두 번째 요청의 `requestRef`가 첫 번째를 덮어쓰고, **첫 번째(실제 데이터가 담긴) 응답**이 시퀀스 가드에 걸려 버려짐.
3. **캐시**: 브라우저나 프록시가 빈 배열 `[]` 응답을 캐싱해, 최초 로드 시 캐시된 빈 배열이 반환될 수 있음.

### 해결 (적용됨)

| 구분 | 파일 | 조치 |
|------|------|------|
| **백엔드** | `backend/routers/admissions.py` | `Cache-Control: no-cache, no-store, must-revalidate` 헤더 설정. |
| **프론트** | `frontend/src/hooks/useStation.ts` | ① 초기 상태를 `useState(emptySlotsInitial)`로 선언. effect 내 `setBeds(ROOM_NUMBERS.map(...))` 삭제. ② `initialFetchDoneRef`로 마운트 시 1회만 실행(Strict Mode 방어). ③ `force=true`일 때 시퀀스 가드 우회. ④ `force=true`일 때 `?_t=Date.now()` 캐시 버스팅. |

---

## 13. 간호 스테이션 모달에서 완료된 서류 미표시

### 현상
- 보호자 대시보드에서는 정상적으로 서류가 보이나, 간호 스테이션 모달에서 완료된 서류 요청이 표시되지 않음.

### 원인
- `fetchDashboardData` 호출 직후 WebSocket이나 debounce로 인한 연속 요청이 `force` 요청 응답을 "오래된 응답"으로 버리는 시퀀스 가드 충돌.

### 해결 (적용됨)
- `fetchDashboardData({ force: true })`: `force` 시 시퀀스 가드를 우회하여 해당 응답을 항상 반영.
- 빈 응답(`{}`) 방어 로직 추가: API 응답이 비어 있는 경우 기존 상태 유지.
- `document_requests` 상태 필터 금지 원칙 준수: PENDING·COMPLETED 구분 없이 모든 서류 요청 반환 (CRITICAL_LOGIC §3.3 참고).

---

## 14. Next.js 빌드 캐시 이슈

### 현상
- `Cannot find module './vendor-chunks/lodash.js'` 에러 발생

### 원인
- Next.js 빌드 시 이전 캐시가 남아서 최신 모듈 경로를 찾지 못함

### 해결
```bash
cd frontend
rm -rf .next
npm run dev
```

---

## 15. RLS 정책 위반 (`42501`)

### 현상
- 식단 정보 수정 시 `permission denied` 발생

### 원인
- Supabase RLS 정책에서 `UPDATE` 권한이 누락되었거나 `auth.uid()` 체크가 서비스 롤과 충돌

### 해결
- `SECURITY DEFINER` 권한을 가진 RPC 함수를 생성하여 정책 제약을 우회하거나, 필요한 테이블에 명시적 `UPDATE` 정책 추가

---

## 해결 과정 요약 (타임라인)

| 순서 | 이슈 | 조치 |
|------|------|------|
| 1 | Setup 실패 시 창이 닫혀 원인 불명 | eco.bat Setup에 단계별 errorlevel 검사, `logs\eco_setup.log` 기록, 실패 시 pause |
| 2 | Doctor Node [FAIL] (v24.13 등) | doctor.py: Node major/minor 파싱, major 24 & minor ≥ 12 허용 |
| 3 | Doctor MSVC [FAIL] (경로 주입 환경) | doctor.py: `INCLUDE`에 `ucrt` 있으면 "Environment Injection"으로 통과 |
| 4 | Python 3.14/VS 최신 환경에서 SDK 미인식 | eco.bat Setup에서 Windows Kits 10 최신 버전 자동 탐색 후 INCLUDE/LIB/PATH 주입 |
| 5 | WT 3분할 미동작 / 탭 과다 / 런처 탭 잔류 | launch_wt_dev.ps1 인자 배열로 `;` 전달 |
| 6 | [1번] 선택 시 터미널이 모두 사라짐 | eco.bat [1]에서 start 없이 같은 콘솔에서 PowerShell 실행 → exit로 런처만 종료 |
| 7 | 3분할 레이아웃 역전 | `split-pane -H` 직후 `move-focus down` 추가 → 하단만 좌우 분할 |
| 8 | Frontend `cargo ... program not found` | Rust 툴체인 설치. 설치 후 터미널 재시작. |
| 9 | 에러 모니터 미동작 | launch_wt_dev.ps1: venv python 경로 사용, Tee-Object 파이프라인 제거 |
| 10 | 식단/서류 상태 변경 시 AsyncFilterRequestBuilder 에러 | 2단계 분리 패턴 적용 (§11 참고) |
| 11 | eco.bat [2] 선택 시 터미널 크래시 | Setup 전체를 PowerShell Setup-Environment.ps1로 이관 |
| 12 | eco.bat 실행 시 명령어 파편화 | 배치 파일을 ANSI(CP949)/ASCII로 재저장 (§8 참고) |
| 13 | 간호 스테이션 모달에서 완료된 서류 미표시 | force 시 시퀀스 가드 우회, 빈 응답 처리 강화 |
| 14 | 스테이션 그리드 초기 로드 시 빈 화면 | useEffect 파괴적 리셋 제거, initialFetchDoneRef, force 캐시 버스팅 |

---

## Windows Terminal Layout Race Condition (2026-02-19)

### Issue
`run_dev.bat` 실행 시, 의도한 레이아웃(상단 에러 모니터, 하단 개발 환경)이 아닌 엉뚱한 형태로 창이 분할되거나 터미널이 즉시 종료되는 현상 발생.

### Root Cause
1. **Race Condition**: `wt` 명령어가 비동기로 실행되면서 창이 생성되는 속도보다 `-p` (Pane Index)를 찾는 속도가 더 빠르거나 늦어 인덱싱이 빗나감.
2. **Focus Shift**: 새 창이 생성되면 포커스가 자동으로 이동하는데, 이 시점이 불확실하여 후속 분할 명령이 엉뚱한 창을 대상으로 실행됨.
3. **Batch Parsing**: `;` 문자가 Batch 파일 내에서 쉘 구분자로 잘못 해석되어 명령어가 끊김.

### Solution: Deterministic Layout Strategy
인덱스 번호(`-p 0`)에 의존하는 논리적 타겟팅을 버리고, **물리적 커서 위치**를 기반으로 한 강제 이동 전략을 채택.

1. **Top-Down Construction**: 상단(모니터)을 먼저 만들고 하단 영역을 확보.
2. **Physical Force Move**: **`move-focus down`** 명령어를 명시적으로 사용하여 커서를 무조건 하단으로 내림.
3. **Split**: 하단에 도착한 커서 위치에서 수직 분할(`-V`) 수행.

### 현재 구현 (scripts\launch_wt_dev.ps1)

- **레이아웃 (결정론적)**: `nt` → `split-pane -H --size 0.8` (Backend) → **`move-focus down`** → `split-pane -V --size 0.5` (Frontend). `move-focus down`으로 포커스를 하단으로 고정한 뒤 수직 분할해, 상단이 2분할로 나오는 역전 현상 방지.
- **세미콜론 파싱**: `System.Diagnostics.ProcessStartInfo`를 사용하여 `wt.exe`를 직접 띄워 PowerShell 파싱 오작동 방지.
- **Pipeline Removal**: `Tee-Object`를 통한 쉘 로깅 시도가 WT 파싱 부하를 가중시켜 창이 즉시 종료(`0x80070002`)되거나 Tauri 서버 준비 완료 신호를 방해함. 모든 파이프라인(`|`)을 제거하고 순수 명령만 실행.
- Backend: `cmd /k` + `call .venv\Scripts\activate.bat`.
- Frontend: `pwsh.exe -NoExit -EncodedCommand ...` (npm run tauri dev).

상세 메뉴·CLI·설정은 `docs/DEV_ENVIRONMENT.md` §3 참고.
