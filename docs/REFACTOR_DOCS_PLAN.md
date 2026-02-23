# docs/ 리팩토링 계획서

오래되거나 중복·불필요해진 문서를 정리하기 위한 계획. **실행 전 팀/담당자 확인 권장.**

---

## 1. 현재 docs 구조 요약

| 구분 | 경로/패턴 | 용도 |
|------|-----------|------|
| **핵심 SSOT** | `CRITICAL_LOGIC.md` | 비즈니스·기술 원칙 (절대 수정 시 본 문서 선행 갱신) |
| **워크플로우** | `WORKFLOW_30MIN_AI_CODING.md`, `prompts/WORKFLOW_30MIN_PROMPTS.md` | 30분 AI 코딩 흐름·복붙 프롬프트 |
| **운영·이력** | `TROUBLESHOOTING.md`, `CHANGELOG.md`, `SESSION_2026-02-*.md` | 트러블슈팅·변경 이력·세션 요약 |
| **환경·아키텍처** | `DEV_ENVIRONMENT.md`, `ARCHITECTURAL_PLAN.md`, `DEVELOPMENT_STANDARDS.md`, `SECURITY_REVIEW.md` | 개발 환경·설계·표준·보안 |
| **에러 모니터** | `ERROR_MONITOR_ARCHITECTURE.md`, `prompts/ERROR_MONITOR_DEBUG_PROMPT.md` | 에러 모니터 설명·디버깅 프롬프트 |
| **repomix 덤프** | `repomix-output.md` (스크립트 생성), `repomix-backend.md`, `repomix-frontend.md`, `repomix-diet2-station.md`, `repomix-*-skeleton.md` | 코드베이스 덤프 (일부는 로컬 전용·gitignore) |
| **일회성 프롬프트** | `prompts/DIAGNOSIS_*.md`, `prompts/PROMPT_*.md`, `prompts/prompt_for_*.md` | 과거 이슈 진단·다른 LLM용 복붙 프롬프트 |
| **루트 중복** | `docs/PROMPT_*.md`, `docs/ERROR_MONITOR_DEBUG_PROMPT.md` | `prompts/`와 내용 중복 가능성 |

---

## 2. 문서 계층 구조 (Lifecycle·관리 정책)

DDD 관점에서 문서 성격을 분리해 **인지 부하와 LLM 컨텍스트 오염**을 줄인다.

| 계층 (Layer) | 포함 문서 예시 | 관리 정책 |
|--------------|----------------|-----------|
| **Domain/Core** | `CRITICAL_LOGIC.md`, `ARCHITECTURAL_PLAN.md` | **불변성 유지**. 수정 시 반드시 리뷰 필요. |
| **Workflow** | `WORKFLOW_30MIN_*.md`, `DEVELOPMENT_STANDARDS.md` | **최신화 필수**. 도구/환경 변경 시 즉시 갱신. |
| **Operations** | `TROUBLESHOOTING.md`, `ERROR_MONITOR_*.md`, `CHANGELOG.md`, `SESSION_*.md` | **누적형**. 이슈·세션 발생 시마다 추가. |
| **Archive** | `prompts/archive/*.md`, repomix 보조 파일(선택) | **읽기 전용**. 검색/일상 작업에서 제외. |

---

## 3. 리팩토링 목표

- **중복 제거**: 동일·유사 문서는 한 곳만 유지하고 참조 통일.
- **역할 명확화**: 유지할 문서는 "왜 있는지" 한 줄로 설명 가능하도록.
- **아카이브 정책**: 완료된 이슈용 프롬프트는 삭제하지 않고 `prompts/archive/`로 이동해 필요 시 참조 가능하게 함.
- **repomix**: 공식 워크플로우는 `repomix-output.md` 한 파일만 사용. 나머지 repomix-*는 **.gitignore 등록**하여 로컬 캐시로만 활용·레포 순수성 유지 (특정 모듈 디버깅 시에만 수동 생성, 작업 종료 후 삭제 또는 ignore).
- **Broken Links 방지**: 이동·삭제 후 상대 경로 링크 단절을 검증하는 절차 포함 (§5.1).

---

## 4. 단계별 작업 (권장 순서)

### 4.1 중복 제거

| 현재 위치 | 조치 | 비고 |
|-----------|------|------|
| `docs/ERROR_MONITOR_DEBUG_PROMPT.md` | 삭제 | `docs/prompts/ERROR_MONITOR_DEBUG_PROMPT.md`와 동일·유사. prompts/만 유지. |
| `docs/PROMPT_STATION_DEV_BUTTONS_MISSING.md` | 삭제 또는 prompts로 이동 | `docs/prompts/PROMPT_STATION_DEV_BUTTONS_MISSING.md`와 중복 시 하나만 유지. |
| `docs/PROMPT_WT_LAYOUT_INVESTIGATION.md` | 삭제 또는 prompts로 이동 | `docs/prompts/PROMPT_WT_LAYOUT_INVESTIGATION.md`와 중복 시 하나만 유지. |

- 다른 문서에서 위 경로를 참조하고 있으면 **`docs/prompts/` 쪽으로 링크 수정**.

### 4.2 완료된 이슈용 프롬프트 정리 (아카이브)

아래는 "한 번 쓰고 해결된" 이슈용 프롬프트로 보임. **삭제하지 말고** `docs/prompts/archive/`(또는 `docs/archive/prompts/`)로 이동 권장.

- `DIAGNOSIS_PATIENT_DETAIL_MODAL_LOGIC.md`
- `DIAGNOSIS_DASHBOARD_PAGE_LOGIC.md`
- `DIAGNOSIS_USE_DASHBOARD_STATS_LOGIC.md`
- `DIAGNOSIS_MEAL_MODULES_LOGIC.md`
- `DIAGNOSIS_USEVITALS_LOGIC.md`
- `PROMPT_COMPLETED_DOCS_NOT_SHOWING.md` (원인 분석·해결 반영 후 참고용)
- `PROMPT_STATION_INITIAL_LOAD_EMPTY.md` (스테이션 빈 그리드 해결 후)
- `PROMPT_OTHER_LLM_STATION_GRID_EMPTY.md`, `PROMPT_OTHER_LLM_STATION_GRID_DB_SQL_VERIFICATION.md` (동일 이슈 관련)
- `PROMPT_ECO_BAT_1_CLOSES_TERMINAL.md`
- `PROMPT_WT_LAYOUT_INVESTIGATION.md`
- `PROMPT_STATION_DEV_BUTTONS_MISSING.md`
- `PROMPT_MEAL_SYNC_SUBMODAL_STALE.md`
- `PROMPT_DEPENDENCY_ISSUES.md`
- `PROMPT_REFACTOR_LOGIC_ONLY_PROTOCOL.md`, `PROMPT_REFACTOR_AREAS_AND_CHECKLIST.md`, `PROMPT_LOGIC_ONLY_REFACTOR_BATCH.md`

**유지 (자주 참조·재사용)**  
- `WORKFLOW_30MIN_PROMPTS.md`, `REFACTOR_AUDITOR_GUIDE.md`, `ERROR_MONITOR_DEBUG_PROMPT.md`  
- 필요 시 `PROMPT_COMPLETED_DOCS_NOT_SHOWING.md`는 TROUBLESHOOTING/세션 문서에서 참조하므로 archive 후에도 링크만 갱신.

### 4.3 repomix 보조 파일 및 .gitignore

| 파일 | 용도 | 권장 |
|------|------|------|
| `repomix-output.md` | 스크립트 생성, 워크플로우 Phase 1용 | 유지 (현재 이미 gitignore) |
| `repomix-backend.md`, `repomix-frontend.md` | 백엔드/프론트 전용 덤프 | **.gitignore 추가**. 로컬에서만 수동 생성·캐시 활용. |
| `repomix-diet2-station.md`, `repomix-*-skeleton.md` | 기능별·스켈레톤 덤프 | **.gitignore 추가** 또는 archive. 레포에 올리지 않음. |

- **원칙**: 공식 워크플로우는 `repomix-output.md` 한 파일만 사용. 보조 파일은 필요 시 수동 생성 후 작업 종료 시 삭제하거나 ignore로 레포 순수성 유지.

### 4.4 문서 간 참조 점검

- `TROUBLESHOOTING.md`, `SESSION_*.md`, `CHANGELOG.md`에서 `docs/` 또는 `docs/prompts/` 링크가 깨지지 않도록 아카이브/삭제 후 경로 수정.
- `WORKFLOW_30MIN_AI_CODING.md`·`WORKFLOW_30MIN_PROMPTS.md`는 repomix-output.md만 참조하도록 유지 (이미 반영됨).

### 4.5 인덱스 (docs/README.md)

- **docs/README.md**를 두고, 유지하는 문서 목록과 한 줄 설명을 적어 AI·개발자가 문서 지도를 가장 먼저 파악하도록 한다. 초안은 아래 §6 참고.

---

## 5. 실행 시 주의사항 및 검증

- **CRITICAL_LOGIC.md**, **WORKFLOW_30MIN_*.md** 는 수정하지 않음 (내용 변경 없이 참조 경로만 필요 시 수정).
- **삭제 전**: 해당 경로를 참조하는 다른 파일이 있는지 grep 등으로 확인.
- **아카이브**: `docs/prompts/archive/` 로 통일.
- **git**: 리팩토링 커밋은 "docs: 중복 제거 및 아카이브" 등으로 분리하면 이력 추적에 유리함.

### 5.1 Broken Links 검증 (실행 후 필수)

- **리팩토링 실행 직후** 반드시 검증하여 `TROUBLESHOOTING.md` 등에서의 깨진 링크를 수정한다.
- **자동 검증**: 프로젝트 루트에서 `./scripts/Verify-DocsLinks.ps1` 실행. 깨진 링크를 보고하며, 아카이브로 이동된 파일에 대한 링크는 `prompts/X.md` → `prompts/archive/X.md` 로 수정 제안.
- **일괄 수정**: `./scripts/Verify-DocsLinks.ps1 -Fix` 로 제안된 아카이브 경로 치환만 적용 (수정 전 diff 확인 권장).
- 수동 확인 시: `Get-ChildItem docs -Recurse -Filter *.md | Select-String -Pattern '\]\([^)]+\.md\)'` 로 링크 추출 후 대상 존재 여부 확인. 또는 VS Code에서 `](prompts/` 검색 후 클릭하여 유효성 확인.

### 5.2 권장 실행 순서 (로컬 터미널에서 직접 실행)

1. **리팩토링 실행** (아카이브 이동 + 루트 중복 삭제):  
   `pwsh -NoProfile -File ./scripts/Invoke-DocsRefactor.ps1`
2. **드라이 런 검증** (수정 가능/Broken 목록만 출력):  
   `./scripts/Verify-DocsLinks.ps1`  
   출력된 목록을 확인한 뒤 진행.
3. **링크 자동 수정 적용**:  
   `./scripts/Verify-DocsLinks.ps1 -Fix`
4. **최종 확인**: `git diff`로 TROUBLESHOOTING.md 등에서 `prompts/archive/` 경로 반영 여부 확인.

---

## 6. docs/README.md 인덱스 초안

AI·개발자가 문서를 가장 먼저 파악할 수 있도록 아래 구조로 `docs/README.md`를 둔다.

```markdown
# Documentation Index

- **[Core]** `CRITICAL_LOGIC.md` — 비즈니스 핵심 로직 및 기술 원칙
- **[Dev]** `DEV_ENVIRONMENT.md` — 환경 설정 및 PowerShell 워크플로우
- **[AI]** `WORKFLOW_30MIN_AI_CODING.md` — AI 협업 가이드
- **[History]** `TROUBLESHOOTING.md` — 과거 해결된 주요 장애 이력
```

필요 시 ARCHITECTURAL_PLAN, DEVELOPMENT_STANDARDS, ERROR_MONITOR_ARCHITECTURE, prompts/WORKFLOW_30MIN_PROMPTS 등 한 줄씩 추가.

---

## 7. 실행 전 체크리스트

- [ ] **TROUBLESHOOTING.md**에서 이동 대상 파일을 링크하고 있는지 grep/VS Code Search로 확인했는가?
- [ ] **repomix-output.md 외** 보조 덤프(`repomix-backend.md`, `repomix-frontend.md`, `repomix-diet2-*`, `repomix-*-skeleton.md`)를 **.gitignore에 추가**하는 것에 동의하는가?
- [ ] 위 두 항목 확인 후, `scripts/Invoke-DocsRefactor.ps1` 실행 또는 타 LLM용 프롬프트(`prompts/PROMPT_OTHER_LLM_DOCS_REFACTOR.md`)로 단계 실행.

---

## 8. 완료 체크리스트

- [ ] 루트 docs/ 내 PROMPT_*, ERROR_MONITOR_DEBUG_PROMPT 중복 제거
- [ ] 완료 이슈용 프롬프트 `prompts/archive/` 이동
- [ ] repomix 보조 파일 .gitignore 추가 (및 기존 커밋된 보조 파일은 삭제 또는 archive)
- [ ] TROUBLESHOOTING·SESSION·CHANGELOG 링크 점검 및 Broken Links 검증 (§5.1)
- [ ] docs/README.md 인덱스 추가·갱신 (§6)
