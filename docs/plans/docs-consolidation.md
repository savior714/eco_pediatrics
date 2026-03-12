# Project Blueprint: docs 통합 — 파편화·중복·완료 문서 정리

> 생성 일시: 2026-03-13 | 상태: 설계 승인 대기

## Architectural Goal

- **목적**: `docs/` 내 문서의 **파편화**, **중복**, **완료된 작업으로 인한 누적**을 정리하여 SSOT를 유지하고, 후속 세션·에이전트가 문서 지도를 빠르게 파악할 수 있게 한다.
- **SSOT**: `docs/CRITICAL_LOGIC.md` 및 `docs/memory.md`와 충돌하지 않으며, 기존 `docs/archive/REFACTOR_DOCS_PLAN.md`의 정책(아카이브 유지·Broken Links 방지)을 계승한다.
- **산출물**: 단일 인덱스(README), 역할이 명확한 루트 문서만 유지, 완료 플랜은 `docs/archive/plans/`로 이관.

---

## 현황 요약

| 구분 | 경로 | 파일 수 | 이슈 |
|------|------|--------|------|
| **루트** | `docs/*.md` | 16+ | LATEST_SUMMARY / IMPROVEMENT_ROADMAP / ARCHITECTURAL_PLAN 역할 중첩; VERIFICATION_DOCS_AUDIT 시점별 스냅샷; ERROR_MONITOR_ARCHITECTURE Deprecated |
| **plans** | `docs/plans/*.md` | 5 | refactor-300-line-targets·phase4a·phase4b 완료 상태 → archive 이관 대상 |
| **archive** | `docs/archive/` | 4 | REFACTOR_DOCS_PLAN 등 기존 보관; **archive/plans/** 미존재 |
| **prompts** | `docs/prompts/` | 25 (활성 11, archive 14) | 구조는 정리됨; 인덱스 없음 |

---

## Step-by-Step Execution Plan

> 각 Task는 **단 하나의 도구 호출(Read / Edit / Write 등 1개)**로 완료된다.  
> 순서대로 진행하며, 이동·삭제 후에는 **Broken Links 검증**을 별도 Task로 수행한다.

### Task List

- [x] **Task 1: docs/archive/plans 디렉터리 생성**
  - **Tool**: 터미널 또는 Write(빈 .gitkeep 등)
  - **Target**: `docs/archive/plans/`
  - **Goal**: 완료된 플랜 보관용 디렉터리 확보
  - **Dependency**: None

- [x] **Task 2: 완료된 플랜 4건을 docs/plans → docs/archive/plans 로 이동**
  - **Tool**: 터미널 (Move-Item) 또는 Read+Write+Delete
  - **Target**: `refactor-300-line-targets.md`, `phase4a-backend-dependency-audit.md`, `phase4a-dep-audit-result.md`, `phase4b-db-migration-cleanup.md`
  - **Goal**: 진행 중/미착수 플랜만 `docs/plans/`에 유지 (phase5-testing-dx.md만 남김)
  - **Dependency**: Task 1

- [x] **Task 3: VERIFICATION_DOCS_AUDIT_2026_03_03.md → docs/archive 로 이동**
  - **Tool**: 터미널 또는 Read+Write+Delete
  - **Target**: `docs/VERIFICATION_DOCS_AUDIT_2026_03_03.md` → `docs/archive/`
  - **Goal**: 시점별 검증 스냅샷은 archive 보관; 현재 검증 기준은 VERIFICATION_GLOBAL_RULES.md만 유지
  - **Dependency**: None

- [x] **Task 4: ERROR_MONITOR_ARCHITECTURE.md → docs/archive 로 이동**
  - **Tool**: 터미널 또는 Read+Write+Delete
  - **Target**: `docs/ERROR_MONITOR_ARCHITECTURE.md` → `docs/archive/`
  - **Goal**: README에 명시된 Deprecated 문서를 archive로 이관
  - **Dependency**: None

- [x] **Task 5: LATEST_SUMMARY_AND_IMPROVEMENTS.md 내용을 memory.md Executive Summary·IMPROVEMENT_ROADMAP과 정합 후 archive 이동**
  - **Tool**: Read (LATEST_SUMMARY, memory, IMPROVEMENT_ROADMAP) → Edit (memory 또는 IMPROVEMENT_ROADMAP에 핵심 요약 반영) → Write/이동
  - **Goal**: “최근 변경 요약”은 memory.md에 이미 있으므로, LATEST_SUMMARY의 **고유 개선 제안**만 IMPROVEMENT_ROADMAP 또는 CRITICAL_LOGIC 참고용 1문단으로 흡수한 뒤 LATEST_SUMMARY를 `docs/archive/`로 이동
  - **Pseudocode**: (1) LATEST_SUMMARY에서 memory/ROADMAP에 없는 항목 추출 (2) 해당 항목을 IMPROVEMENT_ROADMAP “참고” 섹션 등에 1문단 추가 (3) LATEST_SUMMARY → archive
  - **Dependency**: None (Task 2–4와 병렬 가능)

- [x] **Task 6: docs/README.md 갱신 — archive/plans, 이관된 문서 반영**
  - **Tool**: Edit
  - **Target**: `docs/README.md`
  - **Goal**: archive/ 하위에 `archive/plans/`(완료된 플랜) 설명 추가; ERROR_MONITOR_ARCHITECTURE·VERIFICATION_DOCS_AUDIT 링크 제거 또는 archive 경로로 수정
  - **Dependency**: Task 2, 3, 4, 5

- [x] **Task 7: docs 내부 상대 경로 참조 검증 (Broken Links)**
  - **Tool**: Grep 또는 PowerShell (Select-String)으로 `](.*\.md)` 추출 후 대상 파일 존재 여부 확인
  - **Target**: `docs/**/*.md`
  - **Goal**: 이동으로 깨진 링크 식별 후 목록 출력 (수정은 별도 Task)
  - **Dependency**: Task 2, 3, 4, 5, 6
  - **결과 (2026-03-13)**: `docs/**/*.md` 내 마크다운 링크(`](...*.md)`)는 `docs/README.md` 13건만 해당. 루트·archive 대상 모두 존재 확인 → **Broken Links 0건**.

- [ ] **Task 8: prompts 인덱스 추가 (선택)**
  - **Tool**: Write
  - **Target**: `docs/prompts/README.md`
  - **Goal**: 활성 프롬프트(WORKFLOW_30MIN_PROMPTS, prompt_for_llm, ERROR_MONITOR_DEBUG_PROMPT 등)와 archive 구분 한 줄 안내
  - **Dependency**: None

---

## 기술적 제약 및 규칙 (SSOT)

- **Encoding**: UTF-8 no BOM.
- **삭제 금지**: 참조 가능성이 있는 문서는 **archive 이동**만 수행. 삭제는 팀 합의 후에만.
- **CRITICAL_LOGIC / memory.md**: 통합 시 기존 원칙과 충돌하지 않도록 최소 반영만 수행.
- **Environment**: Windows 11 / PowerShell; 경로는 `[System.IO.Path]::GetFullPath()` 등 절대 경로 기준 명시 권장.

---

## Definition of Done

1. [ ] 완료된 플랜 4건이 `docs/archive/plans/`에 있고, `docs/plans/`에는 진행·미착수 플랜만 존재.
2. [ ] VERIFICATION_DOCS_AUDIT, ERROR_MONITOR_ARCHITECTURE, LATEST_SUMMARY가 `docs/archive/`에 있음.
3. [ ] `docs/README.md`가 현재 문서 구조와 archive/plans를 반영하여 갱신됨.
4. [ ] Broken Links 검증 완료 후 깨진 링크 0개 또는 수정 Task 완료.
5. [ ] `docs/memory.md`에 본 통합 작업 요약 1~2줄 추가.
