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
