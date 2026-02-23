# 30분 AI 코딩 — 복붙용 프롬프트 모음

`docs/WORKFLOW_30MIN_AI_CODING.md`와 함께 사용. **repomix 출력**은 **한 파일**만 쓴다.

---

## 프로젝트 개요 (eco_pediatrics)

- **스택**: FastAPI + Supabase(Postgres) + Next.js App Router. 선택 Tauri.
- **SSOT**: `docs/CRITICAL_LOGIC.md` — RLS, KST, access_token, 레이어·동기화·인코딩 규칙.
- **백엔드**: Router → Service → Utils. `print()` 금지 → `from logger import logger` 사용. supabase-py v2+는 `update().eq().select()` 체이닝 불가 → 2단계(update 실행 후 별도 select) 패턴.
- **프론트**: HTTP는 `frontend/src/lib/api.ts` 인스턴스만 사용. 비즈니스 로직은 `hooks/`, UI는 `components/`. Debug Code Check 통과를 위해 `console.log`/`warn`/`error` 문자열 직접 사용 금지(Stealth 로깅 시 대괄호+문자열 분리).
- **repomix 출력 경로**: `docs/repomix-output.md` (통합 한 파일). 생성: `scripts\Invoke-Repomix.ps1`.

---

## repomix 덤프 생성

**권장 (프로젝트 루트):**

```powershell
pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1
```

**수동 (include/ignore 동일):**

```powershell
npx repomix@latest --style markdown --include "backend/main.py,backend/routers/**,backend/services/**,backend/models.py,backend/constants/**,backend/utils.py,backend/schemas.py,backend/database.py,backend/dependencies.py,backend/logger.py,backend/websocket_manager.py,backend/tests/**,backend/scripts/**,supabase/migrations/**,supabase/schema.sql,docs/**,frontend/src/**" -i "docs/repomix*.md,docs/tree.txt" -o docs/repomix-output.md
```

**용도**: Phase 1에서 **같은 파일**을 붙여넣고, 한 번은 "Step 1(백엔드) 지시서만", 한 번은 "Step 2(프론트) 지시서만" 요청.

---

## Phase 1 (웹 LLM용 — 두뇌)

**순서:** **docs/repomix-output.md** 전체를 붙여넣고 **Step 1(백엔드)** 먼저 요청 → 같은 덤프 다시 붙여넣고 **Step 2(프론트)** 요청.

1. **Step 1**: 아래 프롬프트에서 `[구현할 기능 설명]`만 수정 → 끝에 "**Step 1(백엔드/DB) 지시서만 작성해 줘.**" 추가 → **repomix-output.md** 전체 붙여넣기 → 전송. 출력에서 Step 1만 복사.
2. **Step 2**: "**Step 2(프론트엔드) 지시서만 작성해 줘.**"로 바꿔서, 다시 **repomix-output.md** 전체 붙여넣기 → 전송. Step 2만 복사.

```
너는 10년 차 시니어 소프트웨어 아키텍트야.
아래 첨부된 텍스트는 eco_pediatrics 프로젝트의 전체 코드베이스(repomix 출력)야.

지금부터 이 프로젝트에 **[구현할 기능 설명, 예: 스테이션 그리드에 필터(진료과/입원일) 추가]**를 추가하려고 해.

내가 IDE의 다른 AI 보조 도구에게 순차적으로 작업을 시킬 수 있도록, 다음 규칙에 따라 '단계별 작업 지시서'를 작성해 줘.
코드를 전부 짤 필요는 없고, AI가 알아듣고 완벽하게 코딩할 수 있는 '정확한 명세서'만 작성해.

**[작업 분할 규칙]**
- Step 1: 데이터베이스 스키마(필요 시 Supabase 마이그레이션), 백엔드 API 로직 (FastAPI Router, Service, Model, 의존성). docs/CRITICAL_LOGIC.md 원칙 준수(RLS, KST, access_token 등). supabase-py v2+에서는 update/delete 후 .select() 체이닝 불가 → 2단계 분리 명시. 로깅은 print 대신 logger 사용.
- Step 2: 프론트엔드 UI(Next.js App Router, frontend/src), 상태·API 호출(frontend/src/lib/api.ts), 로딩/에러 UI. CRITICAL_LOGIC의 토큰·마스킹·동기화 규칙 준수.

각 Step별로 **1) 수정/생성할 파일 경로(backend/ 또는 frontend/src/ 기준), 2) 핵심 로직·변수/함수명, 3) 예외 처리·CRITICAL_LOGIC 준수 사항**을 상세히 적어 줘.

**[지금은 Step 1(백엔드/DB) 지시서만 작성해 줘.]**  또는  **[지금은 Step 2(프론트엔드) 지시서만 작성해 줘.]**

[이 아래에 docs/repomix-output.md 내용 전체 붙여넣기]
```

---

## Phase 2 (IDE용 — Step 1 백엔드/DB)

**순서:** Phase 1에서 받은 **Step 1 지시서**만 복사 → 아래 `[지시서]` 자리에 붙여넣기 → IDE 채팅에 전체 전송. (선택: repomix-output.md 또는 backend 핵심 파일 일부 추가.)

```
너는 최고 수준의 백엔드 개발자야.
지금 첨부된 프로젝트 전체 코드(Mega-Context)를 완벽하게 숙지해.

이 프로젝트는 eco_pediatrics야. FastAPI + Supabase(Postgres) + Next.js 스택이며, docs/CRITICAL_LOGIC.md를 SSOT로 따른다.
백엔드에서는 print() 사용 금지 → from logger import logger; logger.info / logger.error 사용. supabase-py v2+에서는 update/delete 후 .select() 체이닝 불가 → update 실행 후 별도 select() 호출 패턴으로 작성해.

다음은 이 프로젝트에 추가할 기능의 **[Step 1: 백엔드/DB]** 작업 지시서야.

[웹 LLM이 짜준 Step 1 지시서 내용 복사/붙여넣기]

위 지시서에 언급된 모든 파일의 코드를 작성해 줘.
**[절대 지켜야 할 규칙 3가지]**
1. 부분 수정이나 "기존 코드 생략" 같은 축약은 하지 말고, 수정 대상 파일은 **Line 1부터 끝까지 동작하는 전체 코드**로 출력해라.
2. 예외 처리(try/except, HTTP 상태 코드), 타입 힌트, CRITICAL_LOGIC의 RLS·시간대·토큰 규칙을 반영해라.
3. 신규 마이그레이션이 필요하면 supabase/migrations/ 또는 backend/migrations/에 SQL 파일로 제안해라.

대상 파일들의 전체 코드를 출력해.

[선택: docs/repomix-output.md 내용 또는 backend/ 핵심 파일 일부 붙여넣기]
```

---

## Phase 3 (IDE용 — Step 2 프론트엔드)

**순서:** Phase 1에서 받은 **Step 2 지시서**만 복사 → 아래 `[지시서]` 자리에 붙여넣기 → IDE 채팅에 전체 전송.

```
백엔드 코드는 방금 프로젝트에 적용했어. 컨텍스트를 유지한 상태에서 다음 **[Step 2: 프론트엔드]** 지시서를 수행해.

[웹 LLM이 짜준 Step 2 지시서 내용 복사/붙여넣기]

frontend/src는 Next.js App Router + api.ts 기반이야. 앞서 만든 백엔드 API와 연결되는 프론트엔드 코드를 작성해 줘.
CRITICAL_LOGIC의 토큰·마스킹·동기화(Throttling, 시퀀스 가드) 규칙을 지켜라. 디버그 로그가 필요하면 console 대신 프로젝트 기존 Stealth 로깅 방식(대괄호+문자열 분리)을 따르거나, 해당 로그를 생략해라.

**[절대 지켜야 할 규칙 3가지]**
1. 수정/생성되는 모든 프론트엔드 파일에 대해 기존 코드 생략 없이 **전체 코드(Full source code)**로 출력해라.
2. API 로딩 상태(Loading UI)와 실패 시 에러 표시(Error UI)를 포함해라.
3. 프로젝트 기존 UI/CSS·컴포넌트 구조(frontend/src/components/, hooks/)를 따르고, CRITICAL_LOGIC의 마스킹·토큰 처리 규칙을 지켜라.

전체 코드를 출력해 줘.
```

---

## Phase 4 (IDE용 — 문서·주석·테스트)

**순서:** Phase 3까지 적용한 뒤, 아래 프롬프트 전체를 IDE 채팅에 붙여넣기.

```
방금 작성한 기능이 에러 없이 동작해. 이제 퀄리티를 올릴 거야. 다음 3가지를 **한 번에 모두** 수행해.

1. **문서화:** README.md 또는 docs/에 오늘 추가한 기능 설명·사용법·API 명세를 마크다운으로 정리해 '해당 문서 전체 내용'으로 출력해라.
2. **주석:** 오늘 수정/생성한 **핵심 파일 2개**에 대해, 주요 함수·클래스에 docstring(JSDoc/타입 스타일)을 상세히 달아서 **해당 파일 전체 코드**로 다시 출력해라.
3. **테스트:** 오늘 작성한 핵심 비즈니스 로직에 대한 단위 테스트(백엔드: backend/tests/, pytest; 프론트 필요 시 frontend/ 테스트 규칙)를 엣지 케이스 포함해 파일로 출력해라.

토큰 제한 없이 상세·전체 코드로 출력해 줘.
```

---

*출력이 끊기면 IDE 채팅에 **"이어서 계속 전체 코드로 출력해"** 만 입력하면 됨.*

작업 내역: `docs/CHANGELOG.md`
