# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다. `docs/CRITICAL_LOGIC.md`가 비즈니스 규칙의 SSOT라면, `memory.md`는 작업 맥락과 아키텍처 결정 이력의 SSOT 역할을 합니다.

**주요 프로젝트 마일스톤:**
- **UV Native 환경 전환**: `pip` 혼용을 중단하고 `uv`(.venv)로 가상환경 관리 및 의존성 고정 완료.
- **Ark UI 도입**: 컴포넌트 접근성 및 상태 로직 분리를 위해 Ark UI를 표준 프레임워크로 채택.
- **HWP 변환 안정화**: `win32com` COM 캐시 이슈 해결 및 비동기 워커 구조 확립.
- **NotebookLM 최적화**: 데이터셋 빌드 시 파일 크기(5MB) 및 레코드 수 제한 로직 고도화.
- **3-Layer 아키텍처 준수**: Router, Service, Repository 레이어드 패턴 엄격히 유지.

---

## Logs

### [2026-03-01 10:52 KST] - UV Native 환경 마이그레이션
[Context]
- 기존 `pip`와 `uv`가 혼용되어 의존성 관리가 불분명했던 환경을 정리할 필요가 있음.
[Action]
- 가상환경을 `.venv`로 통일하고 `uv sync`를 통한 의존성 관리 표준화.
- 관련 문서(`DEV_ENVIRONMENT.md`) 및 배치 파일(`eco.bat`) 업데이트.
[Status]
- 완료.
[Technical Note]
- Windows Native 환경에서 `uv`는 `pyproject.toml`과 `uv.lock`을 통해 결정론적 빌드를 보장함.

### [2026-03-01 11:17 KST] - HWP COM 임포트 오류 해결
[Context]
- `win32com.client`에서 `_get_good_object_`를 찾지 못하는 순환 참조/초기화 에러 발생.
[Action]
- COM 지원 캐시 재빌드 로직 수정 및 `win32com` 초기화 순서 조정.
[Status]
- 완료.
[Technical Note]
- Partially initialized module 에러는 주로 캐시 손상이나 잘못된 초기화 시점에서 기인함.

### [2026-03-02 02:55 KST] - 데이터셋 빌드 설정 UI 추가
[Context]
- NotebookLM용 데이터셋 생성 시 사용자가 직접 파일 크기 및 레코드 제한을 조절하고 싶어함.
[Action]
- Dataset Build UI에 상세 설정 컨트롤 추가.
- 백엔드 처리 로직 연동 및 기본값(5MB, 200 records) 설정.
[Status]
- 완료.
[Technical Note]
- 프론트엔드 Ark UI 컴포넌트를 사용하여 일관된 디자인 시스템 유지.

### [2026-03-02 05:01 KST] - UI 리팩토링 및 Ark UI 통합 최종화
[Context]
- 프로젝트 전반의 UI를 Ark UI 기반의 Headless 구조로 전환하여 유지보수성 향상.
[Action]
- 주요 컴포넌트(모달, 그리드 등)를 Ark UI로 교체.
- `CRITICAL_LOGIC.md`에 UI 로직 SSOT 원칙 명시.
[Status]
- 완료.
[Technical Note]
- 스타일링(CSS)과 로직(Ark UI States)을 엄격히 분리하여 구현함.

### [2026-03-02 08:36 KST] - 루미넌트 파일 정리 및 구조 감사
[Context]
- 루트 디렉토리의 불필요한 설정 파일 및 임시 파일들을 정리하여 프로젝트 구조 슬림화.
[Action]
- `docs/` 폴더 내 문서 최신화 검증 및 미사용 스크립트 제거.
[Status]
- 완료.
[Technical Note]
- `docs/VERIFICATION_GLOBAL_RULES.md`를 통해 전체 규정 준수 여부 확인.

### [2026-03-02 18:32 KST] - Memory Protocol 초기화 및 문서 통합
[Context]
- `CHANGELOG.md`, `CODE_REVIEW_LATEST.md`, `SESSION_2026-02-2x.md`, `context.md` 등 파편화된 문서가 산재하여 관리 효율이 저하됨.
[Action]
- 루트의 `context.md`, `mission.md`, `checklist.md` 내용을 `memory.md` 로그로 통합 후 파일 삭제. (주요 내용: PatientCard 렌더링 최적화)
- `docs/SESSION_2026-02-20.md`, `docs/SESSION_2026-02-23.md`, `docs/CODE_REVIEW_LATEST.md` 핵심 내용을 로그로 이관 및 아카이브 처리.
- `CHANGELOG.md`는 주요 릴리즈 및 기능 단위 이력으로 유지, 세부 작업 맥락은 `memory.md`로 일원화.
[Status]
- 완료.
[Technical Note]
- 글로벌 룰에 따라 모든 세부 작업 맥락은 `memory.md` [Strict Append-Only] 방식으로 기록됨.

### [2026-03-02 18:35 KST] - Ark UI 마이그레이션 계획 수립
[Context]
- 글로벌 룰의 UI 표준에 따라 Ark UI 도입을 위한 구체적인 로드맵 수립이 필요함.
[Action]
- `docs/ARK_UI_MIGRATION_PLAN.md` 생성. (환경 구성, 원자적 컴포넌트, 복합 컴포넌트, 인터랙션 최적화 4단계 로드맵 포함)
[Status]
- 완료.

### [2026-03-02 18:36 KST] - Ark UI 마이그레이션 Phase 0 (환경 구성) 완료
[Context]
- Ark UI 도입을 위한 라이브러리 설치 및 테일윈드 설정이 필요함.
[Action]
- `@ark-ui/react`, `tailwindcss-animate` 패키지 설치 완료.
- `frontend/tailwind.config.js`에 Ark UI 상태 데이터 속성(`data-state`, `data-opened` 등)에 대한 custom variant(`open:`, `closed:`, `selected:` 등) 추가 완료.
[Status]
- Phase 0 완료.

### [2026-03-02 18:37 KST] - Ark UI 마이그레이션 Phase 1 (원자적 UI) - Modal 리팩토링
[Context]
- 기존의 수동 애니메이션 및 상태 관리 로직이 포함된 `Modal.tsx`를 Ark UI 표준 프리미티브로 전환 필요.
[Action]
- `frontend/src/components/ui/Modal.tsx` 리팩토링 완료.
- Ark UI v4+ 최신 사양에 맞춰 `Dialog` 프리미티브와 독립적인 `Portal`, `Presence` 컴포넌트 조합 적용.
- `tailwindcss-animate`를 활용하여 진입/퇴장 애니메이션(`animate-in`, `fade-in`, `zoom-in`) 구현.
[Status]
- Phase 1-1 완료.
[Technical Note]
- Ark UI v4부터 `Dialog.Portal` 대신 독립적인 `Portal` 컴포넌트를 사용하며, 애니메이션 제어를 위해 `Presence` 컴포넌트 내부에 Backdrop과 Content를 배치함.

### [2026-03-02 18:53 KST] - Ark UI 마이그레이션 Phase 1-2 (Select 도입)
[Context]
- `MealRequestModal` 등의 복합 모달 내 드롭다운/선택 영역을 Ark UI `Select`로 교체하여 표준화 필요.
[Action]
- `frontend/src/components/ui/Select.tsx` 공통 프리미티브 생성 (Ark UI v4 `createListCollection` 대응).
- `MealRequestModal.tsx` 리팩토링: 기존 버튼 그리드 방식의 식단 선택부를 Ark UI `Select` 기반으로 교체 및 인코딩/타입 이슈 해결.
[Status]
- Phase 1-2 완료.
[Technical Note]
- Ark UI v4의 `Select`는 `createListCollection`을 통한 정적/동적 아이템 관리를 강제하며, 이를 `useMemo`로 최적화하여 구현함.

### [2026-03-02 18:55 KST] - Ark UI 마이그레이션 Phase 1-3 (Tabs 도입)
[Context]
- `PatientDetailModal`의 사이드바 정보가 수직으로 길어져 가독성 저하. 정보를 탭(Tabs) 구조로 정리하여 공간 효율성 확보 필요.
[Action]
- `frontend/src/components/ui/Tabs.tsx` 공통 프리미티브 생성.
- `PatientDetailSidebar.tsx` 리팩토링: 요청 사항, 검사 일정, 완료 서류 섹션을 탭으로 그룹화하여 UI 집약도 향상.
[Status]
- Phase 1-3 완료.
[Technical Note]
- 탭 전환 시 `animate-in fade-in slide-in-from-top-1` 애니메이션을 적용하여 부드러운 UX 제공.

### [2026-03-02 18:56 KST] - Ark UI 마이그레이션 Phase 2 (입력 폼 및 입력 도구)
[Context]
- 입원 수속(`AdmitSubModal`) 및 체온 입력(`VitalModal`) 등 주요 입력 폼의 위젯 표준화 필요.
[Action]
- `frontend/src/components/ui/Field.tsx` (Label + Input 통합 필드) 생성.
- `frontend/src/components/ui/NumberInput.tsx` (수치 전용 입력 컴포넌트) 생성.
- `AdmitSubModal.tsx` 리팩토링: `Field`, `Select`, `Modal` 표준 컴포넌트 적용.
- `VitalModal.tsx` 리팩토링: `NumberInput`, `Modal` 표준 컴포넌트 적용.
[Status]
- Phase 2 완료.
[Technical Note]
- `Field.Input`의 TS 타입 이슈 해결을 위해 `asChild` 패턴을 적용하여 표준 `input` 엘리먼트의 속성을 안전하게 확장함.

### [2026-03-02 18:59 KST] - Ark UI 마이그레이션 Phase 3 (인터랙션 및 피드백)
[Context]
- 시스템 알림(`alert`)의 저렴한 UX를 지양하고 프리미엄 수준의 피드백 시스템 도입 필요.
[Action]
- `frontend/src/components/ui/Toast.tsx` 기반의 전역 토스트 시스템(`toaster`) 구축.
- `frontend/src/app/layout.tsx`에 `ToastProvider` 주입.
- `AdmitSubModal.tsx`, `VitalModal.tsx`, `PatientDetailModal.tsx` 내의 모든 `alert`을 `toaster`로 교체.
- `frontend/src/components/ui/Popover.tsx` (상세 정보 툴팁 프리미티브) 생성.
[Status]
- Phase 3 완료 및 Ark UI 전면 마이그레이션 계획 달성.
[Technical Note]
- `toaster.create()`를 통한 명령형 호출과 `ToastProvider`의 선언적 렌더링을 결합하여 유연한 알림 시스템 구현.
- `Modal` 컴포넌트에 `unmountOnExit` 속성을 추가하여 복잡한 `PatientDetailModal`의 메모리 점유 최적화.

### [2026-03-02 19:10 KST] - Next.js 클라이언트 경계(Boundary) 이슈 수정
[Context]
- `layout.tsx`에서 `Toast.tsx`를 임포트할 때 Next.js 서버 컴포넌트 환경에서 클라이언트 전용 API(`createToaster`)가 평가되어 발생하는 렌더링 에러 해결 필요.
[Action]
- `frontend/src/components/ui/Toast.tsx`를 포함한 모든 Ark UI 프리미먼트 파일(`Modal`, `Select`, `Tabs`, `Field`, `NumberInput`, `Popover`) 최상단에 `"use client";` 지시어 추가.
[Status]
- 수정 완료. 빌드 안정성 확보.
[Technical Note]
- Ark UI의 상태 관리 및 포털 로직은 브라우저 API에 의존하므로, App Router 환경에서는 명시적으로 클라이언트 컴포넌트임을 선언해야 함.

### [2026-03-02 19:15 KST] - 배치 및 파워쉘 스크립트 UV Native 동기화
[Context]
- 과거 `pip`/`venv` 구조가 남아있던 `eco.bat`, `start_backend_pc.bat` 등을 최신 `uv` 표준으로 전면 교체.
[Action]
- `eco.bat`: `py -m venv` → `uv venv`, `pip install` → `uv pip install`로 변경. `backend` 실행 명령을 `uv run`으로 일원화.
- `start_backend_pc.bat`: 하드코딩된 사용자 경로를 제거하고 상대 경로 기반의 `uv` 실행기로 리팩토링.
- `scripts/launch_wt_dev.ps1`: 백엔드 및 모니터 실행 시 `uv run`을 사용하도록 수정.
- `scripts/doctor.py`: 낙후된 `setup_env.bat` 안내 문구를 `eco setup`으로 최신화.
[Status]
- 완료. 모든 실행 스크립트가 UV Native 환경과 100% 호환됨.
[Technical Note]
- `uv run`은 별도의 활성화(`activate`) 없이도 `.venv`를 자동으로 감지하여 실행하므로 스크립트 구조가 훨씬 단순해짐.

### [2026-03-02 19:24 KST] - 환경 문서(DEV_ENVIRONMENT/README) 정합성 전수 조사 및 최신화
[Context]
- Ark UI 및 UV Native 마이그레이션 결과가 상호 참조 중인 모든 주요 문서에 누락 없이 반영되었는지 검토.
[Action]
- `README.md`: 기술 스택 및 구동 가이드를 `uv run` 및 `Ark UI` 기준으로 갱신.
- `docs/DEV_ENVIRONMENT.md`: `pip`/`venv` 절차를 전량 삭제하고 `uv` 기반의 차세대 개발환경 표준으로 재정의.
- `docs/CRITICAL_LOGIC.md`: 의존성 계층 로직에 `uv pip` 권장 사항 반영.
- `docs/ARK_UI_MIGRATION_PLAN.md`: 모든 Phase를 [COMPLETED]로 전환하고 최종 성과 요약.
[Status]
- 완료. 모든 문석과 코드가 마이그레이션 목표 지점에 일치(Sync)함. Git Push 준비 완료.
[Technical Note]
- 문서 SSOT가 확보되었으므로, 차후 신규 에이전트 투입 시에도 환경 설정에 혼선이 없을 것으로 기대됨.

### [2026-03-02 19:45 KST] - Z-index 표준화 및 잔여 모달 마이그레이션
[Context]
- Ark UI 마이그레이션 이후 신규 컴포넌트(`z-70`)와 레거시 컴포넌트(`z-[10001]`) 간의 레이어 충돌 발생.
- 의미론적 Z-index 관리 체계가 부재하여 포지셔닝 이슈 발생 가능성 확인.
[Action]
- `tailwind.config.js`에 의미론적 Z-index 토큰(`layout`, `popover`, `modal-backdrop`, `modal-content`, `toast`) 추가.
- `Modal`, `Select`, `Popover`, `Toast` 등 Ark UI 프리미먼트들에 표준 Z-index 토큰 적용.
- 레거시 모달(`TransferModal`, `EditMealModal`, `AddExamModal`, `IVUploadForm` 줌 오버레이)을 표준 `Modal` 기반으로 전면 리팩토링하여 체계 편입.
- 피드백 시스템 고도화: 수동 `alert`을 `toaster`로 전량 교체.
[Status]
- 완료. 전역 Z-index 충돌 위험 제거 및 UI 일관성 확보.
[Technical Note]
- 최상위 레이어는 `z-toast (5000)`로 설정하여 알림 유실 방지. 모든 모달은 `z-modal-content (2100)` 내외로 수렴됨.

### [2026-02-20 KST] - 보안 감사 및 백엔드 유틸 격리 (Legacy Archive)
- **보안**: 프론트엔드 Stealth Logging 도입, RLS 정책 전면 활성화 마이그레이션 적용.
- **아키텍처**: `backend/scripts/` 디렉토리로 22개 유틸리티 스크립트 격리 이동 및 표준 로거 적용.
- **환경**: `error_monitor.py` 보강 및 `launch_wt_dev.ps1` venv Python 경로 보장.

### [2026-02-23 KST] - UX 고도화 및 스테이션 기능 강화 (Legacy Archive)
- **UX**: 토큰 만료 시 Silent Graceful Degradation(에러 마스킹) 적용.
- **UI**: 스테이션 원장 필터(조/김/원/이), 입원 카운터, Framer Motion 그리드 애니메이션 추가.
- **데이터**: 식단 비고(room_note) 전실 후 유실 방지 로직(제어 컴포넌트+폴백) 구현.

### [2026-02-24 KST] - 성능 최적화 (Legacy Archive)
- `TemperatureGraph`, `MealGrid`, `NotificationItem` React.memo 최적화.
- `PatientCard` 커스텀 `arePropsEqual` 적용 (context.md/mission.md 작업분).

### [2026-03-02 KST] - eco.bat 2번(Setup) 선택 시 터미널 크래시 수정
[Context]
- eco.bat 실행 후 메뉴에서 [2] Environment Setup 선택 시 터미널이 크래시하는 현상 분석 요청.
[Action]
- 원인: setup 구간의 `for /f` 줄에서 SDK 경로 `C:\Program Files (x86)\...`의 **(x86)** 괄호가 cmd.exe에서 서브쉘/그룹으로 해석되어 구문 오류 또는 크래시 유발.
- 조치: 경로를 배치 소스에 직접 넣지 않고, `set "SDK_INC_BASE=%ProgramFiles(x86)%\..."`로 설정한 뒤 `for /f` 내부에서는 `$env:SDK_INC_BASE`만 사용하도록 변경. PowerShell에는 `-LiteralPath $env:SDK_INC_BASE`로 전달.
[Status]
- 수정 완료. 사용자 검증 대기.
[Technical Note]
- cmd에서 `in ('... (x86) ...')` 형태의 괄호는 파싱 시 특수문자로 처리되므로, 경로는 환경 변수로 빼서 괄호를 배치 소스에서 제거함.

---

## 통합된 Mission·Checklist·Context (참조용)

아래는 과거 `mission.md`, `checklist.md`, `context.md` 내용을 memory.md로 일원화한 요약입니다. 신규 작업 시 이 섹션과 Executive Summary를 참고하면 됩니다.

- **현재 미션**: uv 가상환경 리팩토링 및 pyproject.toml/uv.lock 도입 완료. (추가 미션은 상단 Executive Summary·Logs 참고.)
- **UV 운영 맥락**: `backend/.venv`는 uv로만 생성 (`uv venv .venv --python 3.14`). 의존성은 `pyproject.toml`+`uv.lock` 사용. Setup 시 `uv.lock` 있으면 `uv sync`, 없으면 `uv pip install -r requirements.txt`. uv는 PATH 또는 `python -m uv`/`py -3.14 -m uv`로 사용 가능해야 하며, doctor.py에서 둘 다 검사.
- **UV 점검 체크리스트 (완료)**: DEV_ENVIRONMENT.md 문서화, eco.bat/start_backend_pc.bat uv 적용, doctor.py uv 검사, backend pyproject.toml·uv.lock·uv sync 검증 — 모두 완료.

### [2026-03-02 KST] - mission/checklist/context 문서 memory.md 통합
[Context]
- `mission.md`, `checklist.md`, `context.md`가 memory.md와 기능적으로 중복되어 문서 파편화 발생.
[Action]
- 세 문서 핵심 내용을 memory.md 내 "통합된 Mission·Checklist·Context" 섹션으로 통합. VERIFICATION_GLOBAL_RULES.md §2.2를 memory.md 기준으로 수정. 기존 mission.md, checklist.md, context.md 삭제.
[Status]
- 완료.
[Technical Note]
- 작업 맥락·미션·점검 목록은 memory.md 단일 소스로 유지. 대형 트랙 시 Logs에 [Context]/[Action]으로 추가 기록.

### [2026-03-02 KST] - eco.bat 2번(Setup) 크래시 재조치: Get-SdkVersion.ps1 분리
[Context]
- 이전 수정(경로를 env로 넘기는 방식) 후에도 2번 선택 시 터미널 크래시가 미해결로 보고됨.
[Action]
- SDK 버전 조회를 배치 인라인에서 제거하고, `scripts/Get-SdkVersion.ps1` 전용 스크립트 추가. eco.bat의 for /f는 해당 스크립트 호출만 하도록 변경. 배치 소스에 괄호·인라인 PowerShell -Command 제거.
[Status]
- 완료.
[Technical Note]
- for /f "..." in ('powershell -File "%~dp0scripts\Get-SdkVersion.ps1"') 형태로 단순화. (x86) 경로는 .ps1 내부에서만 사용되어 cmd 파싱 이슈 제거.

### [2026-03-02 KST] - eco.bat 실행 즉시 터미널 종료(인코딩) 대응
[Context]
- eco.bat 실행 시 메뉴 없이 터미널이 바로 종료되는 현상. TROUBLESHOOTING §8: 배치가 UTF-8로 저장되면 cmd가 잘못 해석함.
[Action]
- eco.bat 내 한글 주석을 ASCII로 교체. scripts/Fix-BatEncoding.ps1 추가: eco.bat·start_backend_pc.bat을 UTF-8/UTF-16에서 읽어 CP949로 재저장. 해당 스크립트 실행으로 두 배치 파일 CP949 변환 완료.
[Status]
- 완료.
[Technical Note]
- 배치 수정 후 창이 바로 닫히면 `pwsh -File scripts/Fix-BatEncoding.ps1` 실행 후 eco.bat 재실행. CRITICAL_LOGIC §2.5: .bat은 ANSI(CP949) 유지.

### [2026-03-02 KST] - eco.bat 2번 선택 시 튕김: for /f 제거, 파일 기반 SDK 버전 읽기
[Context]
- eco.bat 실행은 되나 [2] Setup 선택 시 터미널 크래시 지속.
[Action]
- `for /f ... in ('powershell -File Get-SdkVersion.ps1')` 제거. Get-SdkVersion.ps1에 -OutFile 인자 추가, 버전을 logs\sdk_ver.txt에 기록. 배치에서는 set /p SDK_VER=<logs\sdk_ver.txt 로 읽기만 수행.
[Status]
- 완료.
[Technical Note]
- for /f 서브프로세스 캡처가 일부 환경에서 cmd 크래시를 유발하므로, PowerShell이 파일에 쓰고 배치는 파일에서만 읽도록 변경.

### [2026-03-02 KST] - eco.bat 2번 크래시: if 블록 내 (x86) 괄호 파싱 오류
[Context]
- 파일 기반 SDK 버전 읽기 적용 후에도 [2] Setup 선택 시 크래시 지속.
[Action]
- 원인: `if defined SDK_VER (` 블록 안의 `set "SDK_INC=C:\Program Files (x86)\..."` 등에서 **(x86)** 의 `)` 가 cmd에 의해 if의 닫는 괄호로 해석되어 블록 파싱 오류 발생. 블록 전에 `set "PF86=%ProgramFiles(x86)%"` 로 경로베이스 설정 후, 블록 내부에서는 `%PF86%\...` 만 사용하도록 수정.
[Status]
- 완료.
[Technical Note]
- if ( ... ) 블록 안에는 리터럴 괄호를 두지 않고, 블록 밖에서 변수로 치환해 사용.

### [2026-03-02 KST] - Setup(2번) 전체를 PowerShell로 위임
[Context]
- 다른 LLM 분석: cmd에서 npm/uv 등 .cmd 래퍼를 call 없이 호출하면 제어권 이전으로 즉시 종료될 수 있음. if 블록 내 괄호 파싱도 불안정.
[Action]
- :setup 구간 전체를 제거하고, pwsh -File "%~dp0scripts\Setup-Environment.ps1" -ProjectRoot "%~dp0" 호출만 남김. scripts/Setup-Environment.ps1 신규 생성: 선행 조건 검사, backend(.venv, Refresh-BuildEnv, Get-SdkVersion, INCLUDE/LIB/PATH 주입, uv pip), frontend(npm install), doctor.py, SETUP_LOG 기록.
[Status]
- 완료.
[Technical Note]
- eco.bat은 수정 후 Fix-BatEncoding.ps1로 ANSI(CP949) 저장 필요. Setup-Environment.ps1은 UTF-8 (no BOM).
