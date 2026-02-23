# docs 리팩토링 — 다른 LLM 에이전트용 프롬프트

아래 블록 전체를 **다른 LLM 에이전트(예: Cursor, Claude, Gemini 등)에게 붙여넣어** `docs/` 및 `docs/prompts/` 정리를 실행하도록 요청할 때 사용하세요.  
**사전에** `docs/REFACTOR_DOCS_PLAN.md` 를 열어두거나 컨텍스트에 포함시키세요.

---

## 복사용 프롬프트 (Copy-Paste Block)

```
너는 프로젝트 문서 구조를 정리하는 시니어 개발자야.

이 프로젝트(eco_pediatrics)의 docs 리팩토링 계획서가 있어. **반드시** 다음 파일을 먼저 읽고 그 내용을 기준으로 동작해.

- **계획서**: docs/REFACTOR_DOCS_PLAN.md

## 실행 전 확인 (계획서 §7)

- TROUBLESHOOTING.md에서 이동 대상 파일을 링크하고 있는지 검색으로 확인했는가?
- repomix 보조 파일을 .gitignore에 추가하는 정책에 동의하는가? (이미 계획서 반영 시 생략 가능)
- PowerShell로 한 번에 실행하려면: 프로젝트 루트에서 `./scripts/Invoke-DocsRefactor.ps1` 실행 가능. 수동으로 할 경우 아래 순서대로.

## 네가 할 일 (순서대로)

1. **계획서 확인**
   - REFACTOR_DOCS_PLAN.md 전체를 읽어서 "4. 단계별 작업"과 "5. 실행 시 주의사항"을 정확히 따라라.
   - CRITICAL_LOGIC.md, WORKFLOW_30MIN_AI_CODING.md, WORKFLOW_30MIN_PROMPTS.md 의 내용은 변경하지 말고, 참조 경로만 필요 시 수정해라.

2. **중복 제거 (§4.1)**
   - docs/ERROR_MONITOR_DEBUG_PROMPT.md 가 docs/prompts/ERROR_MONITOR_DEBUG_PROMPT.md 와 동일·유사하면 docs/ 쪽을 삭제해라.
   - docs/PROMPT_STATION_DEV_BUTTONS_MISSING.md, docs/PROMPT_WT_LAYOUT_INVESTIGATION.md 가 docs/prompts/ 에 동일 파일이 있으면 docs/ 루트 쪽을 삭제해라.
   - 다른 md 파일에서 삭제한 경로를 참조하고 있으면, docs/prompts/ 쪽 경로로 링크를 바꿔라.

3. **아카이브 생성 및 이동 (§4.2)**
   - docs/prompts/archive/ 디렉터리를 만들어라 (없다면).
   - 계획서 "4.2 완료된 이슈용 프롬프트 정리"에 나열된 파일들을 docs/prompts/archive/ 로 이동해라. (나열된 파일명은 REFACTOR_DOCS_PLAN.md 에 있음.)
   - 이동 후, TROUBLESHOOTING.md 나 SESSION_*.md 등에서 해당 문서를 참조하는 링크가 있으면 docs/prompts/archive/... 로 경로를 갱신해라.

4. **repomix 보조 파일 (§4.3)**
   - repomix-output.md 는 삭제·이동하지 마라 (워크플로우 필수). repomix-backend.md, repomix-frontend.md, repomix-diet2-*.md, repomix-*-skeleton.md 는 계획서에 따라 .gitignore에 등록되어 로컬 캐시로만 둔다. 이미 레포에 커밋된 보조 파일이 있으면 삭제하거나 docs/prompts/archive/ 로 이동해라.

5. **참조 점검 및 Broken Links (§4.4, §5.1)**
   - TROUBLESHOOTING.md, CHANGELOG.md, SESSION_2026-02-*.md 안의 모든 docs/ 또는 docs/prompts/ 링크가 유효한지 확인해라. 아카이브로 옮긴 파일을 참조하는 링크는 docs/prompts/archive/... 로 수정해라.
   - 이동·삭제 후 상대 경로 링크 단절이 없는지 검증해라 (계획서 §5.1 참고).

6. **인덱스 (§4.5, §6)**
   - docs/README.md 가 없으면 계획서 §6 초안대로 생성해라. 있으면 아카이브/삭제 반영으로 갱신해라.

## 출력 규칙

- 삭제·이동한 파일 목록을 마크다운 리스트로 정리해서 마지막에 보여줘.
- "수정한 참조 경로"가 있으면 (파일 경로, 이전 경로 → 새 경로) 형태로 요약해 줘.
- CRITICAL_LOGIC.md, WORKFLOW_30MIN_AI_CODING.md, WORKFLOW_30MIN_PROMPTS.md 는 내용 변경 없이, 참조만 바꿀 때만 수정했다고 명시해 줘.
```

---

## 사용 방법

1. **계획서 열기**: `docs/REFACTOR_DOCS_PLAN.md` 를 IDE에서 열거나, 채팅에 "REFACTOR_DOCS_PLAN.md 내용을 참고해"라고 하며 해당 파일을 첨부한다.
2. **프롬프트 붙여넣기**: 위 "복사용 프롬프트" 블록 전체를 복사해 LLM 채팅창에 붙여넣는다.
3. **실행 후 확인**: 삭제/이동 목록과 참조 수정 요약을 확인한 뒤, 필요 시 `git status` / `git diff` 로 변경 범위를 검토한다.
4. **커밋**: 예) `docs: 중복 제거 및 완료 이슈 프롬프트 아카이브 (REFACTOR_DOCS_PLAN)` 으로 커밋한다.

---

## 주의

- 계획서(REFACTOR_DOCS_PLAN.md)는 "권장" 기준이다. 팀에서 "아카이브하지 말고 삭제" 등 정책이 다르면, 프롬프트에 그 정책을 반영해 수정한 뒤 사용하라.
- repomix-output.md 는 .gitignore 대상일 수 있어, 리팩토링 대상에서 제외하는 것이 안전하다.
