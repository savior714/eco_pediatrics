# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다. `docs/CRITICAL_LOGIC.md`가 비즈니스 규칙의 SSOT라면, `memory.md`는 작업 맥락과 아키텍처 결정 이력의 SSOT 역할을 합니다.

**주요 프로젝트 마일스톤 및 아카이브:**
- **UV Native 환경 전환 (2026-03-01)**: `pip` 사용을 중단하고 `uv`를 활용한 결정론적 빌드 환경 구축. `.venv` 및 `uv.lock` 중심의 의존성 관리 표준화. 관련 가이드: `docs/DEV_ENVIRONMENT.md`.
- **Ark UI 도입 및 전면 마이그레이션 (2026-03-02)**: Headless UI 표준으로 Ark UI 채택. Modal, Select, Tabs, Field, NumberInput, Popover, Toast 등 원자적 컴포넌트를 구축하고 기존 레거시 모달(10여 개) 리팩토링 완료.
- **Z-index 및 스타일 시스템 표준화**: `tailwind.config.js`에 의미론적 Z-index 레이어 적용 (`z-toast(5000)`, `z-modal-content(2100)`).
- **배치 파일(eco.bat) 파싱 크래시 해결**: cmd.exe의 경로 괄호(x86) 파싱 및 서브쉘 구문 오류를 `Setup-Environment.ps1` 위임 방식으로 해결. ANSI(CP949) 인코딩 엄격 관리.
- **HWP 변환 안정화**: `win32com` COM 캐시 이슈 해결 및 비동기 워커 구조 확립.
- **문서 체계 일원화 (2026-03-02 22:30)**: 파편화된 `mission.md`, `checklist.md`, `context.md` 및 루트 문서 9개를 `memory.md`로 통합하고, 완료된 계획들은 `docs/archive/`로 격리. `docs/README.md`를 인덱스로 활용.
- **에이전트 환경 정리 (2026-03-02 22:42~23:28)**: 스크롤 자동이동 제거(PatientDetailModal), Error Monitor를 `plugins/error_monitor/` DDD 3-Layer로 이전(`python -m plugins.error_monitor`), .agent/.agents/.skills/ 레거시 전량 삭제, 외부 스킬 리포(savior714/skills) 정예 10종으로 정제, plugins/architecture-principles 전면 개편, 불필요 플러그인 18종 삭제.
- **수액 라벨 인쇄 시스템 구축 (2026-03-02 23:35~)**: 환자별 cc/hr↔gtt 자동 계산, IVLabelPreviewModal elevation="nested"(z-3000), Tauri Bridge + b-PAC SDK COM 연동. 상세: `docs/IV_LABEL_PRINTING_SYSTEM.md`.
- **개발환경 가이드 개편 (2026-03-02 23:55)**: `DEV_ENVIRONMENT.md` 전면 재구성. uv run 통합 표준, 인코딩 원칙 명문화.
- **메모리 누수 전수 수정 (2026-03-03)**: IVUploadForm(successTimerRef), useVitals(debounce cleanup), api.ts(AbortController 30s), meal_service.py(wait_for 10s), main.py(WebSocket 120s), dashboard.py(done_callback). 패턴은 `CRITICAL_LOGIC §5.1`에 영구 등재.
- **문서 체계 개편 (2026-03-03)**: CHANGELOG.md 폐기(memory.md 통합), TROUBLESHOOTING.md §13~§15 추가, VERIFICATION_GLOBAL_RULES.md 현재 상태 컬럼 추가, DEVELOPMENT_STANDARDS.md supabase-py 링크 추가.
- **문서 전수 검증 (2026-03-03)**: 11개 메인 문서 검증. 정합성 8/11(72%). 상세: `docs/VERIFICATION_DOCS_AUDIT_2026_03_03.md`.
- **문서 후속 조치 (2026-03-03)**: ERROR_MONITOR_ARCHITECTURE §9/§10/§13 레거시 경로 및 미래 제안 수정. IV_LABEL_PRINTING_SYSTEM.md 신규 작성. README.md에 신규 문서 링크 추가.

---

## Logs

### [2026-03-03 KST] - 문서 전수 검증 Priority 1 조치 완료

[Context]
- 전수 검증 보고서(VERIFICATION_DOCS_AUDIT_2026_03_03.md)에서 식별된 3건의 Priority 1 미반영 항목에 대한 후속 조치.

[Action]
- **CRITICAL_LOGIC §5.1**: 물리적 확인 결과, 메모리 누수 방지 패턴이 이미 기록되어 있음(기존 작업에서 반영 완료). 추가 조치 불필요.
- **ERROR_MONITOR_ARCHITECTURE**: §9 `run_dev.bat` 레거시 → `scripts/launch_wt_dev.ps1` + `uv run python -m plugins.error_monitor` 로 갱신. §10 Step 6 수동 실행 명령어 갱신. §13 "플러그인 구조로 리팩토링 가능(미래)" → "이미 완료(2026-03-02)" 로 수정.
- **docs/IV_LABEL_PRINTING_SYSTEM.md**: 신규 작성 (아키텍처, 속도 환산 공식, Tauri/Rust 연동, 검증 체크리스트).
- **docs/README.md**: IV_LABEL_PRINTING_SYSTEM.md 링크 추가, Last updated 갱신.

[Status]
- 완료. Priority 1 조치 3건 처리 완료.

[Technical Note]
- CRITICAL_LOGIC §5.1이 이미 반영되어 있음을 물리적으로 확인. 전수 검증 보고서의 해당 항목은 오진이었음 → 보고서 신뢰도 제한 사항으로 기록.
- memory.md 200줄 초과(209줄) → Executive Summary 압축 및 Logs 초기화 수행.
- 현재 줄 수: 60/200.

### [2026-03-03 KST] - 과거 잔재(CHANGELOG.md 등) 참조 제거 및 문서 최신화

[Context]
- CHANGELOG.md 및 기타 구형 폐기된 문서 구조의 잔재가 루트 README.md 등에 남아 있었음.
- 프로젝트 핵심 변경 사항(Ark UI 도입, 수액 라벨 인쇄 시스템, UV Native 전환)을 README.md에 반영 요망.

[Action]
- **README.md**: 오래된 업데이트 내역 및 삭제된 CHANGELOG.md 언급을 지우고, Ark UI Phase 3 완료, Brother b-PAC SDK 기반 IV Label Printing, UV Native 도입 사항을 명확히 기재. 문서 체계 목록 최신화.
- **WORKFLOW_30MIN_AI_CODING.md**: CHANGELOG.md를 참조하는 옛 부분을 memory.md로 변경.
- **PROMPT_OTHER_LLM_MEAL_NOTE_AFTER_TRANSFER.md**: 문구 내 CHANGELOG.md 참조 교체.
- **git commit 및 push**: 정리된 문서를 메인에 반영.

[Status]
- 완료. 모든 과거 잔재 제거 및 문서 구조 최신화 반영.

[Technical Note]
- docs/memory.md가 유일한 맥락 SSOT임을 모든 관련 문서의 링크에서 통일시킴.

[2026-03-03]
[Context] 수액 속도 설정 UI 개선 및 라벨 미리보기 구현 계획 문의 대응.
[Action] 
- IVLabelPreviewModal.tsx: input[type='number']의 스핀 버튼(상하 화살표) 제거 (Tailwind appearance-none 적용).
- 라벨 미리보기 구현 계획 수립: Brother b-PAC SDK (COM)의 Export 기능을 활용한 실시간 이미지 생성 방식 채택.
[Status] 완료 (1/1)
[Technical Note] 
- 스핀 버튼 제거를 위해 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none 클래스 사용.
- 라벨 프리뷰는 Rust 사이드에서 b-PAC SDK를 호출하여 이미지 파일로 덤프 후 Base64로 반환하는 아키텍처로 구현 예정.
- 현재 docs/memory.md 줄 수: 74/200

[2026-03-03]
[Context] 수액 라벨 인쇄 시스템 논리 결함 수정.
[Action] 
- dateUtils.ts: KST 시각 문자열을 반환하는 getKSTNowString() 헬퍼 함수 추가.
- IVLabelService.ts: 라벨 미리보기 및 인쇄 시 ko-KR local 시간 대신 getKSTNowString()을 사용하여 시간대 정합성 확보.
- IVLabelPreviewModal.tsx: 미리보기 생성(isLoading) 중 '인쇄하기' 버튼 비활성화 가드 추가.
[Status] 완료 (3/3)
[Technical Note] 
- 클라이언트의 시스템 시간에 의존하지 않는 KST 표준 시간대 준수 원칙 강화.
- 반올림 오차 및 정합성 이슈 방지.
- 현재 docs/memory.md 줄 수: 81/200

[2026-03-03]
[Context] WebSocket 무한 재연결 루프 및 DB 부하 이슈 해결.
[Action] 
- useWebSocket.ts: useEffect 의존성 최적화(url, enabled만 남김) 및 클린업 시 모든 핸들러 null 처리하여 좀비 연결 및 루프 차단.
- main.py: 유효하지 않은 토큰 거부 시 ccept() 후 close(4003)를 호출하여 클라이언트가 규격화된 오류 코드를 명학히 수신하도록 수정.
[Status] 완료 (2/2)
[Technical Note] 
- FastAPI/Starlette에서 accept되지 않은 소켓에 close를 보내면 클라이언트가 비정상 종료(1006)로 인식하여 즉시 재시도하는 문제를 ccept -> close 시퀀스로 해결.
- 프론트엔드 클린업 시 onclose = null 뿐만 아니라 onopen, onmessage, onerror를 모두 무효화하여 리렌더링 시의 부수효과를 완전히 차단함.
- 현재 docs/memory.md 줄 수: 88/200

[2026-03-03]
[Context] eco.bat 실행 실패(터미널 즉시 종료) 및 docs/prompts/prompt_for_gemini.md 내 대량의 DB 연결 오류 발생 조사.
[Action]
- eco.bat: help 명령어 내 이중 이스케이프가 필요한 '&' 기호 수정(^&). 파일 인코딩을 CP949로 강제 변환.
- backend/utils.py: execute_with_retry_async 함수가 httpx.ConnectError(DNS/네트워크 오류) 발생 시 Fail-fast 하지 않고 재시도(Retry)하도록 로직 보완.
- plugins/error_monitor: --cleanup 옵션 실행 시 즉시 종료되도록 수정. 비정상적으로 커진 prompt_for_gemini.md 리포트 초기화.
[Status] 완료 (3/3)
[Technical Note]
- [Errno 11001] getaddrinfo failed 오류는 일시적 DNS 이슈일 가능성이 높으나, 기존 코드가 이를 비정상 종료로 취급하여 무한 500 에러를 유발함. retryable_errors 범위를 httpx 전체 및 특정 문자열(getaddrinfo)로 확장하여 가용성 확보.
- 현재 docs/memory.md 줄 수: 89/200

[2026-03-03]
[Context] eco.bat [1] Start Dev Mode 실행 시 크래시(터미널 즉시 종료 등) 발생 신고 대응.
[Action]
- eco.bat: Windows PowerShell(v5.1) 호출을 PowerShell 7(pwsh.exe)로 변경하여 유저 규칙(Standard) 준수 및 실행 안정성 확보.
- scripts/launch_wt_dev.ps1: Windows Terminal(wt.exe) 인자 파싱 오류 해결을 위해 쿼팅 로직을 전면 리팩토링함. 모든 서브 패널의 쉘을 pwsh로 통일하고, uv run 호출 시 --project 인자를 명시하여 프로젝트 루트에서의 실행 환경 정합성을 확보함.
[Status] 완료 (2/2)
[Technical Note]
- Windows Terminal에서 세미콜론(;)을 구분자로 사용하는 경우, 앞뒤 커맨드의 인자들이 복합적일 때 쿼팅이 깨지면 wt.exe가 즉시 종료되는 현상이 있음.
- Start-Process의 ArgumentList(문자열 조합) 방식을 최적화하고 명시적으로 pwsh를 사용하여 환경 변수 및 PATH 상속 문제를 해결함.
- 현재 docs/memory.md 줄 수: 119/200

[Context] backend/main.py에서 WebSocket 타임아웃 처리를 위한 asyncio.wait_for 사용 중 NameError: name 'asyncio' is not defined 발생.
[Action] backend/main.py 상단에 import asyncio 및 import uuid 추가, 인라인 import uuid 제거.
[Status] 수정 완료 및 py_compile을 통한 구문 검사 통과.
[Technical Note] 표준 라이브러리(asyncio, uuid) 임포트 누락 수정 및 구조 정리.


[Context] Dev Mode (eco dev) 실행 시 Windows Terminal 패널들이 잘못된 경로(C:\Users\savio)에서 기동되고, uv project 경로 누락 및 Tee-Object 파일 경로 누락 오류 발생.
[Action] 1. scripts\launch_wt_dev.ps1 리팩토링: Root 경로 폴백(ScriptRoot 기준) 추가, Resolve-Path를 통한 절대 경로 강제, 각 패널 커맨드에 Set-Location 명시.
2. plugins\__init__.py 및 plugins\error_monitor\__init__.py 생성하여 모듈 로드 보장.
[Status] 수정 완료. 이제  명시되지 않아도 정상 기동되며, 쿼팅 및 경로 이슈 해결됨.
[Technical Note] wt.exe의 -d 옵션 외에 내부 쉘(pwsh)에서도 Set-Location을 호출하여 이중으로 경로를 보장함.

[Context] Windows Terminal에서 세미콜론(;)이 명령 구분자로 오인되어 4개의 패널로 쪼개지는 현상 발생.
[Action] scripts\launch_wt_dev.ps1 내의 pwsh 커맨드 내부 세미콜론을 \;로 이스케이프하고 3-pane 골든 레이아웃(Top, Bottom Left, Bottom Right) 강제.
[Status] 수정 완료. 이제 의도한 대로 3개의 구역만 생성됨.
[Technical Note] wt.exe는 인자 내 세미콜론을 무모하게 파싱하므로 백슬래시 이스케이프가 필수임.

[Context] 사용자의 요청에 따라 특정 스킬 삭제 처리.
[Action] plugins\tech-stack-organizer 디렉토리를 재귀적으로 강제 삭제(Remove-Item -Recurse -Force).
[Status] 삭제 완료.
[Technical Note] 프로젝트 구성 요소 정리의 일환으로 미사용 스킬 제거.

[Context] Full Project Audit & Optimization
[Action] Reviewed and standardized all layers: Backend, Frontend, Models, Schemas, Utils.
[Status] Task Comprehensive Optimization Completed.
[Technical Note] Python 3.14 type hinting and v2 SDK standards enforced.

