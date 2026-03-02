# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다. `docs/CRITICAL_LOGIC.md`가 비즈니스 규칙의 SSOT라면, `memory.md`는 작업 맥락과 아키텍처 결정 이력의 SSOT 역할을 합니다.

**주요 프로젝트 마일스톤 및 아카이브:**
- **UV Native 환경 전환 (2026-03-01)**: `pip` 사용을 중단하고 `uv`를 활용한 결정론적 빌드 환경 구축. `.venv` 및 `uv.lock` 중심의 의존성 관리 표준화. 관련 가이드: `docs/DEV_ENVIRONMENT.md`.
- **Ark UI 도입 및 전면 마이그레이션 (2026-03-02)**: Headless UI 표준으로 Ark UI 채택. Modal, Select, Tabs, Field, NumberInput, Popover, Toast 등 원자적 컴포넌트를 구축하고 기존 레거시 모달(10여 개) 리팩토링 완료.
- **Z-index 및 스타일 시스템 표준화**: `tailwind.config.js`에 의미론적 Z-index 레이어 적용 (`z-toast(5000)`, `z-modal-content(2100)`).
- **배치 파일(eco.bat) 파싱 크래시 해결**: cmd.exe의 경로 괄호(x86) 파싱 및 서브쉘 구문 오류를 `Setup-Environment.ps1` 위임 방식으로 해결. ANSI(CP949) 인코딩 엄격 관리.
- **HWP 변환 안정화**: `win32com` COM 캐시 이슈 해결 및 비동기 워커 구조 확립.
- **문서 체계 일원화**: 파편화된 `mission.md`, `checklist.md`, `context.md` 및 루트 문서 9개를 `memory.md`로 통합하고, 완료된 계획들은 `docs/archive/`로 격리. `docs/README.md`를 인덱스로 활용.

---

## Logs

### [2026-03-02 18:32~21:00 KST] - Ark UI 고도화 및 배치 파일 물리적 오류 해결 요약
- [Ark UI]: Z-index 토큰화 및 레거시 잔여 모달(Transfer, EditMeal, AddExam, IVUploadForm)의 Ark UI 전환 완료. 전역 토스트(`toaster`) 시스템 도입.
- [Stability]: `eco.bat`의 Environment Setup 단계 크래시 원인(x86 괄호 파싱 및 cmd 제어권 이슈) 분석 후, 모든 로직을 `scripts/Setup-Environment.ps1`로 위임하여 해결.

### [2026-03-02 22:30 KST] - 문서 파편화 정리 및 Archive 구축
[Context]
- `docs/` 내에 완료된 계획서(`ARK_UI_MIGRATION_PLAN.md`, `REFACTOR_DOCS_PLAN.md`)와 특정 이슈 로그가 산재하여 가독성 저하.
- 루트에 `CLAUDE.md`, `CONTEXT_SNAPSHOT.md`, `NEXT_STEPS.md` 등 파편화된 문서 존재.
- `docs/memory.md`가 200줄을 초과(303줄)하여 압축 요약 필요.
[Action]
- `docs/archive/` 폴더 생성 및 완료된 문서/로그 4건 격리 (`ARK_UI_MIGRATION_PLAN.md` 외).
- 루트의 파편화된 문서 3건 삭제 및 핵심 내용(보안 강화, `useVitals.ts` 등) `Executive Summary`에 반영.
- `docs/TROUBLESHOOTING_WT_LAYOUT.md`를 `docs/TROUBLESHOOTING.md`로 병합.
- `docs/memory.md`를 [200줄 제한 관리] 프로토콜에 따라 과거 로그 요약 및 압축 리팩토링 수행.
[Status]
- 완료. `docs/memory.md` 줄 수: 45/200.
[Technical Note]
- `memory.md`는 200줄 도달 시마다 `Executive Summary`로 압축하여 컨텍스트 효율성 유지.
- 문서 SSOT: `docs/CRITICAL_LOGIC.md`, 작업 맥락 SSOT: `docs/memory.md`.
### [2026-03-02 22:42 KST] - 실시간 요청 완료 시 자동 스크롤 제거
[Context]
- 환자 상세 모달의 사이드바에서 '실시간 요청' 완료 시 하단의 '신청된 서류(완료)' 섹션으로 자동 스크롤되는 UX가 불필요하다는 피드백.
[Action]
- rontend/src/components/PatientDetailModal.tsx 내 onCompleteRequest 핸들러에서 scrollIntoView 로직 제거.
[Status]
- 완료.
[Technical Note]
- equestAnimationFrame과 scrollIntoView를 사용한 강제 포커싱 로직을 삭제하여 사용자의 현재 응시 지점을 유지함.
### [2026-03-02 22:50 KST] - Error Monitor 플러그인 아키텍처 전환
[Context]
- 루트의 rror_monitor.py 단일 파일이 비대해지고 유지보수가 어려워짐에 따라 DDD 3-Layer 및 Plugins 구조로 격리 필요.
[Action]
- plugins/error_monitor/ 폴더 내 definition.py, epository.py, logic.py, __main__.py 생성.
- scripts/launch_wt_dev.ps1의 실행 명령을 python -m plugins.error_monitor로 변경.
- 루트의 rror_monitor.py 삭제.
[Status]
- 완료.
[Technical Note]
- 상수/설정, 파일 I/O, 비즈니스 로직을 분리하여 표준화된 플러그인 구조로 전환함.
### [2026-03-02 22:58 KST] - 스킬 체계 정리 및 레거시 제거
[Context]
- ntigravity-awesome-skills 리포지토리에서 유래된 대량의 제네릭 스킬(.skills/)이 프로젝트와 관계없이 산재하여 관리 효율 저하 및 에이전트 컨텍스트 낭비 발생.
[Action]
- .skills/ 디렉토리 전량 삭제 (awesome-skills 100여 개 제거).
- 프로젝트 고유 스킬인 rror_monitor를 .agent/skills/에서 plugins/error_monitor/로 통합 관리. (정의 파일 SKILL.md 및 esources/ 리소스 포함)
- plugins/error_monitor/SKILL.md 내 실행 명령어를 python -m plugins.error_monitor로 최신화.
[Status]
- 완료.
[Technical Note]
- 프로젝트와 무관한 워크플로우(/repomix, /skill-generator 등awesome-skills 기반)도 함께 제거되어, 에이전트가 오직 co_pediatrics 전용 도구에만 집중할 수 있는 환경 구축.
### [2026-03-02 23:05 KST] - 중복 워크플로우 제거 및 에이전트 환경 완전 정리
[Context]
- .agent/workflows/error_monitor.md가 플러그인 내 SKILL.md와 내용상 100% 중복되며, 레거시 경로를 참조하고 있음.
[Action]
- .agent/ 폴더 내의 모든 중복 워크플로우 삭제.
- 에이전트 설정 환경(.agent/)을 완전히 제거하여 plugins/ 기반의 새로운 아키텍처로 단일화.
[Status]
- 완료.
[Technical Note]
- 컨텍스트 오염을 방지하기 위해 사용하지 않는 구형 설정들을 모두 소거함.
### [2026-03-02 23:07 KST] - 레거시 에이전트 폴더 전량 삭제 (.agent, .agents)
[Context]
- .agent/ 및 .agents/ 폴더 내의 중복되거나 비어있는 워크플로우(tech-stack-organizer 등)가 신규 plugins/ 기반체계와 혼선을 유발함.
[Action]
- .agent/ 및 .agents/ 디렉토리 전량 삭제.
- 모든 스킬 및 워크플로우를 plugins/error_monitor/ 및 docs/ 내 공식 문서로 일원화.
[Status]
- 완료.
[Technical Note]
- 컨텍스트 오염을 방지하기 위해 사용하지 않는 구형 설정 폴더들을 완전히 제거함.
### [2026-03-02 23:25 KST] - 외부 스킬 리포 통합 및 Plugins 격리 고도화
[Context]
- 사용자의 범용 스킬(savior714/skills) 및 전용 스킬(savior714/tech-stack-organizer)을 plugins/ 하위 체계로 통합하여 관리 효율성 확보.
[Action]
- 두 리포지토리를 클론하여 plugins/ 하위로 이동 및 폴더 정리.
- plugins/tech-stack-organizer 및 epomix, korean-response-master 등 30여 개의 상시 가동형 스킬을 plugins/ 단일 위치로 격리.
- 비어있거나 불필요한 폴더(wesome-skills, savior-skills 등) 및 .git 메타데이터 즉시 삭제.
[Status]
- 완료. 모든 스킬(30개)이 plugins/ 하위에서 관리됨.
[Technical Note]
- 모든 스킬이 plugins/<name>/SKILL.md (또는 README) 구조를 갖추고 있어 에이전트의 스킬 탐색이 규칙적으로 가능해짐.
### [2026-03-02 23:25 KST] - 아키텍처 원칙 스킬 개편 (Global Rules 통합)
[Context]
- 기존 rchitecture-principles 스킬이 단순 복잡도 관리 위주로 되어 있어, 모든 형태의 리팩토링에 적용 가능한 포괄적인 지침이 필요함.
[Action]
- plugins/architecture-principles/SKILL.md를 글로벌 룰(Persona, DDD, 3-Layer, Physical Evidence 등)과 CRITICAL_LOGIC.md 핵심 명세를 포함하여 전면 재작성.
- 이모지 제거, 한국어 사용, 굵은 글씨 강조 등 통일된 문서 형식 적용.
[Status]
- 완료.
[Technical Note]
- 이제 에이전트가 코드 뿐만 아니라 문서, 로그 리팩토링 시에도 본 스킬을 참조하여 일관된 고품질 결과물을 생성할 수 있는 기반을 마련함.
### [2026-03-02 23:25 KST] - 레거시/불필요 플러그인 6종 삭제
[Context]
- docs/memory.md 체계 정착에 따라 역할을 상실했거나 현재 프로젝트와 맞지 않는 도구(Delphi 등) 정리 필요.
[Action]
- plugins/context-restore, plugins/context-sync, plugins/coordinate-calibrator, plugins/delphi-control-finder, plugins/delphi-vcl-automation, plugins/dev-log-archiving 디렉토리 완전 삭제.
[Status]
- 완료.
[Technical Note]
- 컨텍스트 관리는 이제 docs/memory.md 단일 SSOT(Append-Only) 원칙을 따르며, 불필요한 도구들을 제거하여 에이전트의 스캔 부하를 줄임.
### [2026-03-02 23:28 KST] - 레거시/불필요 플러그인 12종 추가 삭제
[Context]
- 아키텍처 원칙 고도화 및 docs/memory.md 체계 정착에 따라 필요성이 사라진 제네릭 도구 등 정리 필요.
[Action]
- plugins/environment-and-debugging, plugins/gui-automation-debugging, plugins/humanized-input-injector, plugins/korean-response-master, plugins/panic-monitoring-loop, plugins/persona-and-comm, plugins/refactor-docs, plugins/src-structure-guardian, plugins/stateful-task-orchestration, plugins/type-driven-structure, plugins/workspace_initializer, plugins/windows-process-terminator 디렉토리 완전 삭제.
[Status]
- 완료. plugins/ 내 12개 플러그인 남음.
[Technical Note]
- 컨텍스트 불필요를 유발하던 제네릭 도구(Persona, Korean Master 등) 및 환경 특화 도구들을 정리하여 시스템 안정성과 에이전트의 효율성을 높임.
### [2026-03-02 23:28 KST] - 각 리포지토리별 스킬 동기화 및 푸시
[Context]
- plugins/ 내에서 생존한 정예 스킬들을 원본 리포지토리(savior714/skills, savior714/tech-stack-organizer)에 반영하여 정리 필요.
[Action]
- savior714/skills: rchitecture-principles (개편본) 포함 10종의 핵심 스킬만 남기고 나머지 레거시 전량 삭제 후 푸시 완료.
- savior714/tech-stack-organizer: 로컬의 plugins/tech-stack-organizer와 동기화 확인.
[Status]
- 완료. 각 외부 리포지토리가 고도화된 정예 스킬셋으로 최신화됨.
[Technical Note]
- skills 리포지토리를 단순 덤프가 아닌, 유효한 스킬들만 남긴 '정제된 상태'로 리팩토링함.
### [2026-03-02 23:35 KST] - 병동 대시보드 수액 라벨 인쇄 시스템 구축 시작
[Context]
- 환자별 수액 라벨 인쇄 및 속도(cc/hr <-> gtt) 자동 계산 기능 추가 요청.
- Brother b-PAC SDK 연동을 위한 Tauri Bridge 구현 및 UI 통합 필요.
[Action]
- docs/templates/ 디렉토리 생성 (준비 작업).
- rontend/src-tauri/Cargo.toml에 windows 크레이트(COM 관련) 추가 준비.
- PatientDetailHeader.tsx에 [수액 라벨지 인쇄] 버튼 추가 및 모달 연동 설계.
[Status]
- 진행 중 (UI 컴포넌트 분석 및 인프라 설계 단계).
[Technical Note]
- b-PAC SDK는 COM 인터페이스를 사용하므로 Rust 사이드에서 windows 크레이트를 통한 연동이 필수적임.
### [2026-03-02 23:45 KST] - 수액 라벨 미리보기 모달 Z-Index 이슈 해결
[Context]
- 환자 상세 모달 위에서 뜨는 수액 라벨 미리보기 모달이 뒤로 숨는 현상 발생. 
[Action]
- IVLabelPreviewModal.tsx의 Modal 컴포넌트에 levation="nested" 속성 추가.
[Status]
- 완료. (Z-index 3000/3100 적용으로 2000/2100인 상세 모달 상단에 정상 노출 확인)
[Technical Note]
- 프로젝트 표준 모달은 levation Props를 통해 중첩 모달의 레이어링을 관리하도록 설계되어 있음.

### [2026-03-02 23:55 KST] - 개발환경 가이드(DEV_ENVIRONMENT.md) 개편 완료
[Context]
- 기존 npm 직접 호출 관성 탈피 및 UV-Native 체계 확립 목적.
[Action]
- docs/DEV_ENVIRONMENT.md를 uv run 기반의 도구 체인 및 글로벌 룰(이모지 금지, 한국어 등)을 포함하여 전면 재구성.
[Status]
- 완료.
[Technical Note]
- 이제 프론트엔드 작업도 uv run --with nodejs npm ... 형식을 따르며, 인코딩 원칙(배치: ANSI / 기타: UTF-8)을 명문화함.
