# [디버깅 프롬프트] eco.bat 실행 후 1번 입력 시 터미널이 바로 꺼지는 현상

> 아래 블록 전체를 다른 LLM에 복사해 붙여 넣어, 과거 트러블슈팅을 참고한 원인 분석 및 해결책을 요청하세요.

---

## 1. 현상

- **실행**: 프로젝트 루트에서 `eco.bat` 실행 후 메뉴에서 **1** 입력(엔터).
- **결과**: 터미널이 **즉시 종료**됨.
- **기대**: [1] 선택 시 런처(cmd) 창은 닫혀도 되지만, **Windows Terminal(WT) 3분할 창**(에러 모니터 / 백엔드 / 프론트엔드)이 뜨고 **유지**되어야 함.

---

## 2. 과거 트러블슈팅 참고 (반드시 참고할 문서)

프로젝트 내에 이미 **동일/유사 현상**에 대한 해결 내역이 있습니다. 아래 문서·섹션을 우선 참고한 뒤 원인을 좁혀 주세요.

### 2.1 배치 파일 인코딩으로 인한 명령어 파편화 (가장 흔한 원인)

- **문서**: `docs/TROUBLESHOOTING.md` **§8**
- **요약**: `eco.bat`이 **UTF-16 LE** 또는 **UTF-8 BOM**으로 저장되면, `cmd.exe`가 1바이트 단위로 해석하면서 명령이 **잘려서** 인식됨.
- **증상 예**: `'cho'은(는) 내부 또는 외부 명령이 아닙니다`, `'edelayedexpansion'은(는) 인식되지 않습니다`, `'1"==""'은(는) 인식되지 않습니다` 등 (`echo`→`cho`, `setlocal enabledelayedexpansion`→`edelayedexpansion`).
- **해결**: 배치 파일을 **ANSI(CP949/EUC-KR)** 또는 **ASCII**로 재저장. IDE에서 **Save with Encoding** → **Korean (EUC-KR)** 또는 **Western (Windows 1252)**.
- **제약**: `docs/CRITICAL_LOGIC.md` **§2.6** — 배치 파일 수정 시 **인코딩을 바꾸지 말 것**. 수정이 필요하면 저장 시 인코딩을 **명시적으로 ANSI/ASCII**로 유지.

**진단 방법**:  
- 창 유지 실행: `cmd /k eco.bat` 후 **1** 입력하여 에러 문구 확인.  
- BOM 확인 (PowerShell): `[System.IO.File]::ReadAllBytes(".\eco.bat")[0..5] -join ','`  
  - `255,254` → UTF-16 LE (**문제**), `239,187,191` → UTF-8 BOM (**문제**), `64,101,99,...`(ASCII) → **정상**.  
- **현재 저장소 기준**: eco.bat 첫 바이트 `64,101,99,104,111,32`(@echo ) 확인됨 → **인코딩 정상**. 문제 지속 시 §2.2·§2.3(WT 인자/프로세스) 쪽으로 진단 진행.

### 2.2 [1번] 선택 시 WT까지 모두 사라지는 현상 (프로세스 트리)

- **문서**: `docs/TROUBLESHOOTING.md` **§6** (및 §7)
- **요약**: 런처에서 `start`로 PowerShell을 띄우면 부모 CMD와의 프로세스 관계 때문에 CMD가 `exit`할 때 자식(WT)까지 함께 종료될 수 있음.
- **적용된 해결**: `start` 없이 **같은 콘솔**에서 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"` 호출 → 스크립트가 WT만 띄우고 반환 → CMD가 `exit`로 **런처만** 종료. WT는 별도 프로세스로 떠 있도록 함.
- **추가**: `docs/prompts/prompt_for_llm.md`에 따르면, `Start-Process` 대신 **`System.Diagnostics.ProcessStartInfo`** + **`UseShellExecute = $true`**로 WT를 띄워 부모와 완전히 분리하는 방식으로 변경한 이력이 있음.

### 2.3 WT가 잠깐 뜨었다 사라짐 / 0x80070002 (파일을 찾을 수 없음)

- **문서**: `docs/TROUBLESHOOTING.md` **§10**
- **요약**: `wt`에 넘기는 인자에서 **전체 명령을 따옴표로 묶으면** wt 파서가 실행 파일 이름을 잘못 해석하거나, **따옴표/이스케이프** 문제로 실행 파일 경로를 찾지 못함.
- **적용된 해결**: `scripts/launch_wt_dev.ps1`에서 각 패널 명령 앞뒤 **따옴표 제거**, 명령 단위 구분은 **백슬래시 없는 세미콜론(` ; `)** 사용.

### 2.4 요약 테이블 (TROUBLESHOOTING.md 내)

- **순서 6**: [1번] 선택 시 터미널 모두 사라짐 → 같은 콘솔에서 PowerShell 실행, exit로 런처만 종료.
- **순서 11**: eco.bat 명령어 파편화 → UTF-16/UTF-8 BOM 인코딩 → ANSI(CP949)/ASCII 재저장, chcp 65001 제거.

---

## 3. 현재 구조 (확인용)

- **eco.bat**: 메뉴에서 `1` 선택 시 `if "%choice%"=="1" goto dev` → `:dev`에서  
  `"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch_wt_dev.ps1" -Root "%ROOT%"`  
  호출 후 **exit**.
- **launch_wt_dev.ps1**: `-Root` 인자로 프로젝트 루트 받음. `wt.exe`를 **ProcessStartInfo**로 실행, 인자에 `-d`, `cmd /k ...`(에러 모니터), `split-pane`(백엔드/프론트) 등 전달.

---

## 4. 요청 사항

1. **원인 특정**: 위 §2의 트러블슈팅(인코딩 §8, 프로세스/인자 §6·§10, launch_wt_dev.ps1·prompt_for_llm.md)을 참고하여, "eco.bat 실행 → 1 입력 → 터미널 바로 꺼짐"의 **가장 유력한 원인**을 제시해 주세요.
2. **진단 절차**: 사용자가 **에러 메시지를 보지 못하고 창만 닫힌다**는 전제에서, 원인을 확인하기 위한 **구체적인 진단 단계**(예: cmd에서 창 유지하며 실행, 인코딩 확인, PowerShell 직접 실행 등)를 제시해 주세요.
3. **해결책**:  
   - 인코딩 문제라면: **배치 파일 내용을 바꾸지 않고** 인코딩만 ANSI/ASCII로 재저장하는 방법을 안내해 주세요. (CRITICAL_LOGIC §2.6 위반 방지.)  
   - 스크립트/경로/인자 문제라면: `eco.bat` 또는 `scripts/launch_wt_dev.ps1`에 대한 **최소 수정안**을 제시해 주세요.
4. **제약**: 배치 파일을 수정할 때 **인코딩을 UTF-8/UTF-16으로 저장하지 말 것**. 저장 시 **ANSI(CP949)** 또는 **ASCII**를 유지해야 함.

---

## 5. 핵심 파일 경로

| 파일 | 역할 |
|------|------|
| `eco.bat` | 런처 메뉴, [1] 선택 시 PowerShell로 launch_wt_dev.ps1 실행 후 exit |
| `scripts/launch_wt_dev.ps1` | WT 3분할 띄우기 (ProcessStartInfo, wt 인자 구성) |
| `docs/TROUBLESHOOTING.md` | §6, §7, §8, §10 및 요약 테이블 |
| `docs/CRITICAL_LOGIC.md` | §2.6 배치 파일 인코딩 제약 |
| `docs/prompts/prompt_for_llm.md` | WT 즉시 종료 관련 과거 분석(ProcessStartInfo, Base64 등) |

---

위 현상과 과거 트러블슈팅을 바탕으로 **원인 진단**과 **해결책(및 진단 절차)**을 제시해 주세요.
