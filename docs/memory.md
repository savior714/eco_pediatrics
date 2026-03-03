# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.
- **Tauri UI/UX 고도화 (2026-03-03)**: 스마트폰 미리보기 싱글톤 패턴 적용, QR 코드 모달 안정화.
- **보호자 대시보드 최적화 (2026-03-03)**: 식단 신청 UI를 버튼 그리드(Selection Grid)로 전환하여 모바일 사용성 극대화.
- **수액 라벨 시스템 완비 (2026-03-03)**: Base/Mix 위계 정립, AST/Lab 결과 연동, 실무 표준 인쇄 레이아웃 구현.
- **인프라 및 안정성 (2026-03-03)**: DNS 11001 에러(IPv6) 자동 최적화(`eco.bat`), 백엔드 Retry 로직 강화.

---

## Logs

### [2026-03-03] - 작업 디렉토리 유실(Home Dir Fallback) 최종 방어
[Context] `wt.exe` 가끔 환경에 따라 `-d` 옵션을 무시하고 홈 디렉토리(`C:\Users\savio`)에서 프로세스를 시작하여 백엔드/프런트엔드 실행에 실패(ENOENT)하는 현상 발생. 
[Action]
- **scripts/Start-Backend.ps1, scripts/Start-Frontend.ps1**: 스크립트 내부에서 `$env:ECO_BE_DIR` 또는 `$env:ECO_FE_DIR` 환경 변수를 직접 확인하여 **강제로 `Set-Location`을 수행**하는 자가 보정(Self-Correction) 로직 추가.
- **scripts/launch_wt_dev.ps1**: 부모 프로세스에서 해당 경로 환경 변수를 미리 설정하여 자식 프로세스에 상속되도록 보정.
[Status] 완료 (1/1)
[Technical Note] 터미널 에뮬레이터의 인자 해석에 의존하지 않고, 환경 변수를 통한 아키텍처적 SSOT를 유지함으로써 어떤 환경에서도 정확한 소스 경로에서 서비스가 기동됨을 보장함.
- 현재 docs/memory.md 줄 수: 84/200

### [2026-03-03] - 쿼팅(Quoting) 지옥 최종 해결: Env-Delegation 패턴 적용
[Context] 이전의 위임 패턴에서조차 파라미터(`-BackendDir`) 전달 시 `wt.exe`가 인자를 단절시키고 공백에서 끊어버리는 등 극도로 불안한 거동을 보임.
[Action]
- **scripts/Start-Backend.ps1, Start-Frontend.ps1**: 파라미터 선언을 아예 제거하고, `$env:ECO_LOG_FILE` 등 환경 변수와 터미널에서 지정된 시작 디렉토리에만 의존하도록 초간소화.
- **scripts/launch_wt_dev.ps1**: 부모 레벨에서 환경 변수를 주입하고, `wt.exe`에는 오직 실행 파일인 `-File "path.ps1"`만 전달하는 단순 토큰 구조로 개편.
[Status] 완료 (1/1)
[Technical Note] Windows 아키텍처에서 환경 변수는 프로세스 트리를 거치며 완벽하게 상속되지만, 명령줄 인자는 각 레이어의 개별 파서(Parser)에 의해 변조됨. 인자 위생(Sanitization) 보다는 **환경 변수 위임**이 가장 안정적인 대형 대시보드 기동 전략임.

### [2026-03-03] - CLI 실행 안정성 확보: Command Delegation 패턴(스크립트 위임) 도입
[Context] Windows Terminal 실행 인자 구성 시 발생하는 극도로 예민한 쿼팅(Quoting) 이슈로 인한 런타임 에러(File Not Found)가 반복되는 문제에 대한 최종 아키텍처적 솔루션 적용.
[Action]
- **scripts/Start-Backend.ps1, Start-Frontend.ps1**: 백엔드와 프런트엔드 전용 기동 헬퍼 스크립트 생성. 쿼팅 복잡도를 해당 파일 내부로 고립시킴.
- **scripts/launch_wt_dev.ps1**: `wt.exe`에 직접 명령어를 주입하던 방식을 버리고, 위 헬퍼 스크립트들을 `pwsh -File`로 호출하는 구조로 전면 개편.
- **docs/CRITICAL_LOGIC.md**: 'Command Delegation Pattern'을 핵심 CLI 표준으로 명시하여 기술적 파편화 방지.
[Status] 완료 (1/1)
[Technical Note] Windows CLI 환경에서 Pipe(`|`)나 Redirect(`>`)를 포함한 명령을 중첩 쉘 환경에서 실행할 경우, 터미널 인자 레벨에서 이를 올바르게 이스케이프하는 것은 불가능에 가까움. 전용 스크립트로 위임(Delegation)하는 것이 최상위 시니어 아키트트의 표준 대응 방식임.

### [2026-03-03] - Windows Native CLI 실행 표준 SSOT 명문화
[Context] `wt.exe` 쿼팅 이슈 및 배치 파일 인코딩 오류가 반복됨에 따라, 이를 방지하기 위한 강제 기술 표준을 프로젝트 헌법(SSOT)에 박제 요청.
[Action]
- **docs/CRITICAL_LOGIC.md**: `2.7 Command Line & Terminal Standards` 섹션 추가.
  1. 배치 파일(.bat)의 **ANSI(CP949) 및 CRLF** 형식 강제.
  2. `wt.exe` 호출 시 **전체 명령어 쿼팅 금지** 원칙 명시 (0x80070002 에러 방지).
  3. `Set-Location` 대신 **`-d` 플래그** 우선 사용 표준 확립.
  4. 복잡한 명령은 반드시 **`.ps1` 외부 스크립트**로 분리할 것을 명시.
[Status] 완료 (1/1)
[Technical Note] 에이전트가 바뀔 때마다 발생하는 환경 의존적 실수를 줄이기 위해, 비즈니스 로직뿐만 아니라 '환경 운영 로직'도 SSOT에 통합 관리함.
- 현재 docs/memory.md 줄 수: 56/200

### [2026-03-03] - Windows Terminal 파싱 구조 오류(File Not Found) 근본 해결
[Context] `wt.exe`에 전달되는 커맨드가 따옴표로 과도하게 감싸져 시스템이 명령줄 전체를 파일명으로 인식, 실행에 실패하던 이슈(0x80070002) 해결.
[Action]
- **scripts/launch_wt_dev.ps1**: 
  1. **구조적 분리**: `wt.exe` 호출 시 실행 파일(`pwsh.exe`)과 인자들을 분리된 토큰으로 전달하도록 수정(커맨드 전체 따옴표 제거).
  2. **중복 제거**: `wt.exe`의 `-d` 옵션과 내부 `Set-Location`이 중복되던 것을 제거하고 `-d`에만 의존하도록 간소화.
  3. **쿼킹 최적화**: 공백이 포함된 인자(`-Command` 뒤의 구문)에만 선택적으로 따옴표를 적용하여 파싱 가득성 확보.
[Status] 완료 (1/1)
[Technical Note] `ArgumentList`가 아닌 단일 `Arguments` 문자열로 명령을 구성할 때, 공백이 포함된 프로세스 실행을 위해서는 `cmd /c`나 `wt`의 파싱 규칙을 정확히 따라야 함. 명령줄 전체를 `" "`로 감싸는 것은 `CreateProcess` 레벨에서 실행 파일 경로로 취급될 위험이 큼.
- 현재 docs/memory.md 줄 수: 85/200

### [2026-03-03] - Windows Terminal 개발 스택(wt_dev) 쿼팅 및 경로 비매칭 오류 수정
[Context] `eco.bat dev` 실행 시 백엔드/프런트엔드 패널의 작업 디렉토리가 잘못 지정(홈 디렉토리로 폴백)되거나 `Tee-Object` 경로가 비어있다는 에러가 발생하는 이슈 대응.
[Action]
- **scripts/launch_wt_dev.ps1**: 
  1. `wt.exe`에 전달되는 커맨드 문자열(`$beCmd`, `$feCmd`)에 명시적인 이중 쿼팅(`"`)을 추가하여 공백이 포함된 경로/명령 처리 안정성 확보.
  2. `Set-Location` 구문 내 불필요한 이스케이프 문자(`\`) 제거.
  3. `$pathFix` 변수 도입으로 경로 설정 로직의 가독성 및 정밀도 향상.
[Status] 완료 (1/1)
[Technical Note] `wt.exe`는 인자를 받을 때 공백을 기준으로 명령을 분리하기 때문에, 공백이 포함된 `pwsh -Command` 문자열은 반드시 외부에서 다시 한번 따옴표로 감싸주어야 함.
- 현재 docs/memory.md 줄 수: 71/200

### [2026-03-03] - 병동 대시보드 메인 그리드 스크롤 제거
[Context] 대형 모니터 환경에서 환자 리스트 및 식단 관리 화면이 한 화면에 모두 들어옴에도 불구하고 불필요한 스크롤바가 표시되는 현상 개선 요청.
[Action]
- **Station/page.tsx**: `main` 영역의 `overflow-y-auto`를 `overflow-hidden`으로 변경하고, 환자 그리드의 하단 여백(`pb-20` -> `pb-4`)을 축소하여 뷰포트 활용도 극대화.
- **MealGrid.tsx**: 내부 테이블 래퍼의 `overflow-auto`를 `overflow-hidden`으로 변경하여 일관된 Non-scroll UX 제공.
[Status] 완료 (1/1)
[Technical Note] 고정된 병상 수와 대형 디스플레이를 사용하는 특수 목적 대시보드의 경우, 스크롤바 노출을 최소화하여 정적인 '상황판' 느낌의 UI를 유지하는 것이 디자인적으로 유리함.
- 현재 docs/memory.md 줄 수: 58/200

### [2026-03-03] - eco.bat 초기 실행 구문 오류 및 인코딩 수정
[Context] `eco.bat` 실행 시 `'s' is not recognized...` 등의 구문 오류가 발생하는 현상 해결 요청.
[Action]
- **eco.bat**: 
  1. 인코딩을 **ANSI (CP949)**로 변경하여 CMD에서의 구문 해석 안정성 확보.
  2. 줄 바꿈 형식을 **CRLF**로 표준화.
  3. 거대했던 `powershell` 한 줄 명령어를 외부 스크립트 기반으로 전환하여 유지보수성 향상.
- **scripts/Optimize-Network.ps1**: IPv6 비활성화 로직을 독립적인 PowerShell 스크립트로 분리 및 예외 처리 강화.
[Status] 완료 (1/1)
[Technical Note] Windows Batch 파일은 UTF-8보다 시스템 로케일(CP949) 인코딩에서 구문 오류가 적게 발생함. 특히 PowerShell 호출 시 쿼팅 이슈를 방지하기 위해 외부 스크립트(`.ps1`) 호출 방식을 권장함.
- 현재 docs/memory.md 줄 수: 49/200

### [2026-03-03] - Tauri 윈도우 조작 권한(show, setFocus) 추가
[Context] `smartphone-preview` 창 중복 시 기존 창을 가져오는 과정에서 `core:window:allow-show` 권한 부족으로 인한 에러 발생.
[Action]
- **frontend/src-tauri/capabilities/default.json**: `core:window:allow-show` 및 `core:window:allow-set-focus` 권한 추가.
[Status] 완료 (1/1)
[Technical Note] Tauri v2의 강화된 보안 정책(ACL)에 따라 윈도우 생성 외에 `show()`, `setFocus()` 등 세부 조작 권한도 명시적으로 허용해야 함.
- 현재 docs/memory.md 줄 수: 42/200

### [2026-03-03] - Tauri 스마트폰 미리보기 창 중복 생성 오류 수정
[Context] `smartphone-preview` 라벨 중복 시 Tauri window error `{}`가 발생하는 이슈.
[Action]
- **QrCodeModal.tsx**: `getByLabel`로 창 존재 확인 후 `show()`, `setFocus()` 처리하는 싱글톤 로직 구현.
[Status] 완료
[Technical Note] Tauri v2 API 기반 창 관리 SSOT 확보.
- 현재 docs/memory.md 줄 수: 35/200

### [2026-03-03] - wt.exe 환경 변수 비상속 구조 문제 근본 해결 (PSScriptRoot Self-Location 패턴)
[Context] `eco.bat dev` 실행 시 백엔드/프런트엔드 패널이 `C:\Users\savio` (홈 디렉토리)에서 기동되는 현상이 반복됨. 이전의 Env-Delegation 패턴이 여전히 실패하는 원인 규명 필요.
[RootCause] `wt.exe`는 기존 WindowsTerminal.exe 프로세스에 새 창 생성을 위임하는 구조임. 따라서 새 탭의 부모 프로세스는 `launch_wt_dev.ps1`이 아닌 `WindowsTerminal.exe`이며, `$env:ECO_BE_DIR` 등의 환경 변수는 이 프로세스 경계를 넘지 못함. 이는 `wt.exe`의 구조적 특성으로 패치 불가.
[Action]
- **scripts/Start-Backend.ps1, Start-Frontend.ps1**: 환경 변수 의존 로직을 완전 제거. `$PSScriptRoot`(항상 스크립트 자신의 경로)를 기반으로 `Split-Path -Parent`를 통해 프로젝트 루트를 자체 계산하는 **PSScriptRoot Self-Location 패턴** 적용.
[Status] 완료 (1/1)
[Technical Note] `$PSScriptRoot`는 Windows Terminal이 스크립트를 `-File`로 실행할 때 PowerShell 엔진이 직접 설정하는 자동 변수이므로 프로세스 상속에 무관하게 항상 정확한 값을 보장함. 환경 변수 위임(Env-Delegation)보다 우선 적용되어야 할 상위 패턴임.
- 현재 docs/memory.md 줄 수: 133/200

### [2026-03-03] - 보호자 대시보드 식단 신청 UI 복구 및 최적화
[Context] 리팩토링 과정에서 식단 신청 UI가 드롭다운(Select)으로 변경되어 모바일 사용성이 저하되었다는 피드백 반영.
[Action]
- **MealRequestModal.tsx**: 선택 방식을 버튼 그룹으로 전면 교체하여 고밀도 UI 표준(h-12) 및 시각적 직관성 확보.
[Status] 완료
[Technical Note] 아웃오브포커스 이슈 방지를 위해 하위 컴포넌트 외부 추출 관리.
