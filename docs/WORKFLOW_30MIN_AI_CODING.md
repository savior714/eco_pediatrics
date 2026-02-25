# 30분 AI 코딩 워크플로우 (복붙 전용)

짧은 시간·리필 토큰으로 **웹 LLM(두뇌)** + **IDE AI(근육)** 조합으로 기능을 빠르게 구현하기 위한 **단계별 실전 프롬프트 템플릿**입니다.  
대괄호 `[ ]` 안만 프로젝트/기능에 맞게 바꾼 뒤 복사·붙여넣기하면 됩니다.

---

## 전제 조건

- **Phase 1**: 웹 브라우저에서 Gemini 등 사용 가능 (긴 컨텍스트, 코드베이스 분석용).
- **Phase 2–4**: Cursor 등 IDE의 AI 채팅 (eco_pediatrics 프로젝트 열린 상태).
- **코드베이스 덤프**: repomix로 **한 파일(`docs/repomix-output.md`)**만 만들어 두고, Phase 1에서 같은 파일을 붙여넣어 **Step 1(백엔드/DB)** 먼저 물어본 뒤, 같은 파일 다시 붙여넣어 **Step 2(프론트)** 따로 물어본다. 복붙용 프롬프트 문구는 **`docs/prompts/WORKFLOW_30MIN_PROMPTS.md`** 참조.

---

## 0. 코드베이스 덤프 생성 (워크플로우 시작 전 1회)

**목적**: Phase 1에서 **같은 파일**을 붙여넣고 Step 1(백엔드)·Step 2(프론트)를 따로 물어보기 위해, **통합 한 파일**을 미리 만든다.

**스크립트 (권장):**

```powershell
cd [c:\Users\neo24\Desktop\develop\eco_pediatrics]
pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1
```

- **출력**: `docs/repomix-output.md` **한 파일만** 생성 (백엔드+프론트+docs+supabase 통합). 포함/제외 구조는 `docs/repomix_report.md` 참조.

**수동 생성:**

```powershell
npx repomix@latest --style markdown --include "backend/main.py,backend/routers/**,backend/services/**,backend/models.py,backend/constants/**,backend/utils.py,backend/schemas.py,backend/database.py,backend/dependencies.py,backend/logger.py,backend/websocket_manager.py,backend/tests/**,backend/scripts/**,supabase/migrations/**,supabase/schema.sql,docs/**,frontend/src/**" -i "docs/repomix*.md,docs/tree.txt" -o docs/repomix-output.md
```

---

## [Phase 1] 두뇌 가동 — 단계별 작업 지시서 생성

**목적**: 코딩 전, 전체 코드베이스를 분석해 **IDE AI에게 줄 "순차 작업 지시서"**를 뽑는다.

**사용처**: 웹 브라우저 Gemini (또는 동급 장문 컨텍스트 LLM).

**절차**:
1. repomix로 뽑은 **docs/repomix-output.md**를 메모장 등에 열어 둠.
2. **`docs/prompts/WORKFLOW_30MIN_PROMPTS.md`**의 **Phase 1** 절에 있는 프롬프트에서 `[구현할 기능 설명]`만 수정한 뒤 복사.
3. **Step 1**: 웹 LLM에 프롬프트 끝을 "**Step 1(백엔드/DB) 지시서만 작성해 줘.**"로 하고 **repomix-output.md** 전체 붙여넣기 → 전송 → 출력에서 Step 1만 복사.
4. **Step 2**: 같은 프롬프트 끝을 "**Step 2(프론트엔드) 지시서만 작성해 줘.**"로 바꿔, 다시 **repomix-output.md** 전체 붙여넣기 → 전송 → Step 2만 복사.
5. 복사한 Step 1·Step 2 지시서를 Phase 2·3에서 사용.

**Phase 1 프롬프트 전문**: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` § Phase 1 참조. (eco_pediatrics SSOT·supabase-py 2단계·logger 규칙 포함.)

---

## [Phase 2] 근육 가동 — Step 1 (백엔드/DB)

**목적**: Phase 1에서 받은 **Step 1 지시서**대로 백엔드·DB 코드를 IDE AI가 한 번에 작성하게 한다.

**사용처**: Cursor 등 IDE 채팅 (eco_pediatrics 프로젝트 열린 상태).

**절차**:
1. Phase 1에서 출력된 **Step 1 지시서**만 복사해 둠.
2. **`docs/prompts/WORKFLOW_30MIN_PROMPTS.md`**의 **Phase 2** 프롬프트에서 `[웹 LLM이 짜준 Step 1 지시서 내용 복사/붙여넣기]` 자리에 지시서 붙여넣기. (선택: repomix 출력 또는 backend 핵심 파일 일부 추가.)
3. IDE 채팅에 전체 전송 후 생성된 코드를 해당 파일에 반영(덮어쓰기 또는 병합).

**Phase 2 프롬프트 전문**: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` § Phase 2 참조. (print 금지·logger 사용·supabase-py 2단계 패턴 명시.)

---

## [Phase 3] 근육 가동 — Step 2 (프론트엔드)

**목적**: Step 1 코드 반영 후, **Step 2 지시서**대로 프론트엔드 코드를 이어서 작성하게 한다.

**사용처**: Phase 2와 **같은 IDE 채팅** (컨텍스트 유지).

**절차**:
1. Phase 1에서 출력된 **Step 2 지시서**만 복사.
2. **`docs/prompts/WORKFLOW_30MIN_PROMPTS.md`**의 **Phase 3** 프롬프트에서 `[웹 LLM이 짜준 Step 2 지시서 내용 복사/붙여넣기]` 자리에 지시서 붙여넣기.
3. IDE 채팅에 전송 후 생성된 코드를 해당 파일에 반영.

**Phase 3 프롬프트 전문**: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` § Phase 3 참조. (api.ts 단일 사용·CRITICAL_LOGIC 마스킹·토큰 규칙 준수.)

---

## [Phase 4] 잔여 토큰 — 문서·주석·테스트

**목적**: 기능 구현이 끝난 뒤, 남은 시간으로 **문서화·주석·테스트**를 IDE AI에게 맡긴다.

**사용처**: Phase 3과 같은 IDE 채팅.

---

### Phase 4 프롬프트 (복사용)

```
방금 작성한 기능이 에러 없이 동작해. 이제 퀄리티를 올릴 거야. 다음 3가지를 **한 번에 모두** 수행해.

1. **문서화:** README.md 또는 docs/에 오늘 추가한 기능 설명·사용법·API 명세를 마크다운으로 정리해 해당 문서 전체 내용으로 출력해라.
2. **주석:** 오늘 수정/생성한 핵심 파일 2개에 대해, 주요 함수·클래스에 docstring(JSDoc/타입 스타일)을 상세히 달아서 해당 파일 전체 코드로 다시 출력해라.
3. **테스트:** 오늘 작성한 핵심 비즈니스 로직에 대한 단위 테스트(백엔드: backend/tests/, pytest; 프론트 필요 시 frontend 테스트 규칙)를 엣지 케이스 포함해 파일로 출력해라.

토큰 제한 없이 상세·전체 코드로 출력해 줘.
```

---

## 구현 계획 (eco_pediatrics에 녹이는 방법)

### 1. 문서 배치

- **워크플로우 설명**: `docs/WORKFLOW_30MIN_AI_CODING.md` — 팀이 복붙만 하면 되도록 유지.
- **복붙용 프롬프트**: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` — Phase 1~4 프롬프트만 모아 둔 파일. repomix 출력 경로·제외 패턴 안내 포함.
- **repomix 출력**: `docs/repomix-output.md` 한 파일만. Phase 1에서 같은 파일 붙여넣고 백엔드(Step 1) 먼저 물어본 뒤, 같은 파일 다시 붙여넣고 프론트(Step 2) 따로 물어본다.

### 2. repomix 출력 파일 위치

- **권장 경로**: `docs/repomix-output.md` (통합 한 파일). 생성: `pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1`. 상세·수동 명령: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` § repomix 덤프 생성.
- `.gitignore`에 `docs/repomix-output.md` 등이 포함되어 있어 대용량 덤프는 커밋되지 않음. (repomix 결과물은 로컬 전용.)

### 3. CRITICAL_LOGIC 연동

- Phase 1·2·3 프롬프트에 이미 **"docs/CRITICAL_LOGIC.md 준수"**를 넣었음.
- 새 기능이 SSOT에 영향을 주면, **워크플로우 완료 후** CRITICAL_LOGIC.md를 수동으로 한 번 갱신하는 단계를 체크리스트에 추가해 두면 좋음.

### 4. 실제 사용 순서 (30분 타이머 기준)

| 순서 | 단계 | 예상 시간 | 행동 |
|------|------|-----------|------|
| 0 | 준비 | 2분 | `scripts\Invoke-Repomix.ps1` 또는 문서 내 명령 → `docs/repomix-output.md` 한 파일 준비. |
| 1 | Phase 1 | 5–8분 | 웹 LLM에 Phase 1 프롬프트 + 덤프 붙여넣기 → Step 1/2 지시서 복사 |
| 2 | Phase 2 | 8–10분 | IDE에 Phase 2 프롬프트 + Step 1 지시서 붙여넣기 → 백엔드 코드 반영 |
| 3 | Phase 3 | 8–10분 | IDE에 Phase 3 프롬프트 + Step 2 지시서 붙여넣기 → 프론트 코드 반영 |
| 4 | Phase 4 | 5분 | IDE에 Phase 4 프롬프트 → 문서·주석·테스트 출력 후 반영 |

- 출력이 길어서 끊기면: **"이어서 계속 전체 코드로 출력해"** 만 입력해 이어받기.

### 5. 주의사항

- **SSOT**: 모든 로직·규칙은 `docs/CRITICAL_LOGIC.md` 준수. 백엔드 `print()` 금지·`logger` 사용, supabase-py v2+ update/delete 후 `.select()` 체이닝 불가(2단계 분리).
- **인코딩**: 배치 파일은 ANSI(CP949), 그 외는 UTF-8 no BOM (CRITICAL_LOGIC §2.5).
- **검증**: 적용 후 `pytest`(백엔드), `npm run build`(프론트) 또는 `eco dev`로 확인 권장.
- **보안**: `scripts/Invoke-Repomix.ps1`은 `-i`(ignore)에 `.env`, `.env.*`, `.env.local`, `*.pem`, `service-account*.json`, `*.key`를 **명시적으로** 넣어 민감정보가 덤프에 포함되지 않도록 함. repomix 기본 .gitignore 적용에 더해 이중 차단.

---

### 최근 변경 (작업 내역)

- **2026-02-25**: `docs/prompts/WORKFLOW_30MIN_PROMPTS.md`를 **eco_pediatrics 전용**으로 정리. Phase 1~3·통합 마스터 프롬프트에 CRITICAL_LOGIC·supabase-py 2단계·logger 규칙 반영. 본 워크플로우 문서는 프롬프트 문서 참조 방식으로 정리.
- **2025-02-23**: repomix 출력을 **`docs/repomix-output.md` 한 파일만** 쓰도록 통일. Phase 1은 같은 파일 붙여넣고 Step 1(백엔드) → Step 2(프론트) 따로 묻는 방식만 문서화. 상세: `docs/CHANGELOG.md`.

---

이 문서만 메모장/북마크에 두고, 개발 가능 시간이 생기면 **0 → 1 → 2 → 3 → 4** 순서로 기계적으로 복붙하면 30분 안에 한 사이클을 돌릴 수 있도록 구성되어 있다.
