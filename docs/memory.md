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
