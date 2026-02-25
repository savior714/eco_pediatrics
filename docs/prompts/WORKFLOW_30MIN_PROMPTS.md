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
**덤프 구조 정리**(포함/제외 항목, 뺄 것·넣을 것 정리): `docs/repomix_report.md` 참조.

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
3. 신규 마이그레이션이 필요하면 supabase/migrations/에 SQL 파일로 제안해라.

대상 파일들의 전체 코드를 출력해.

[선택: repomix 출력 또는 backend/ 일부 핵심 파일 내용 붙여넣기]
```

---

## Phase 3 (IDE용 — Step 2 프론트엔드)

**순서:** Phase 1에서 받은 **Step 2 지시서**만 복사 → 아래 프롬프트에 붙여넣기 → IDE 채팅에 전송.

```
백엔드 코드는 방금 프로젝트에 적용했어. 컨텍스트를 유지한 상태에서 다음 **[Step 2: 프론트엔드]** 지시서를 수행해.

[웹 LLM이 짜준 Step 2 지시서 내용 복사/붙여넣기]

frontend/src는 Next.js App Router + frontend/src/lib/api.ts 기반이야. 앞서 만든 백엔드 API와 연결되는 프론트엔드 코드를 작성해 줘.

**[절대 지켜야 할 규칙 3가지]**
1. 수정/생성되는 모든 프론트엔드 파일에 대해 기존 코드 생략 없이 **전체 코드(Full source code)**로 출력해라.
2. API 로딩 상태(Loading UI)와 실패 시 에러 표시(Error UI)를 포함해라.
3. 프로젝트 기존 UI/CSS·컴포넌트 구조(frontend/src/components/, hooks/)를 따르고, CRITICAL_LOGIC의 마스킹·토큰 처리 규칙을 지켜라.

전체 코드를 출력해 줘.
```

---

## 통합 마스터 프롬프트 (Mega-Context 전용)

**Gemini 2.0 Pro** 또는 **Claude (Mega-Context 지원)** 등 대규모 컨텍스트를 한 번에 처리할 수 있는 LLM용. repomix 덤프를 붙여넣고 기능 하나를 설계·구현·문서화까지 한 번에 요청할 때 사용.

---

### 준비

1. **repomix 덤프 생성**: 위 "repomix 덤프 생성" 절의 명령으로 `docs/repomix-output.md` 생성.
2. 아래 **[Master Implementation Prompt]** 에서 `[구현할 기능 설명]`만 수정한 뒤 전체 복사.

---

### [Master Implementation Prompt]

```markdown
너는 10년 이상의 경력을 가진 Senior Full-stack Architect이자 의료/병동 도메인 전문가야.
지금부터 아래 첨부된 `repomix-output.md`(프로젝트 전체 컨텍스트)를 완벽하게 숙지하고, 내가 요청하는 기능을 **설계, 구현, 문서화, 테스트**까지 한 번에 완료해 줘.

### 🎯 구현할 기능 (Objective)
- **[여기에 구현할 기능 상세 설명 작성, 예: 스테이션 그리드에 원장별 필터 및 입원 카운터 추가]**

### 🏗️ 프로젝트 SSOT 및 아키텍처 원칙 (Mandatory)
1. **SSOT**: `docs/CRITICAL_LOGIC.md`를 모든 결정의 유일한 진실 공급원으로 삼는다. RLS, KST(Asia/Seoul), access_token, 레이어·동기화·인코딩 규칙을 준수한다.
2. **Backend (FastAPI + Supabase)**:
   - **레이어**: Router (진입/DTO) → Service (비즈니스 로직) → Utils/Repo 순서를 엄수한다.
   - **로깅**: `print()` 금지. `from logger import logger` 사용.
   - **DB 업데이트**: supabase-py v2+는 `update().eq().select()` 체이닝 불가. update/delete 실행 후 브로드캐스트·응답용 데이터가 필요하면 **별도 select()** 호출(2단계 분리).
3. **Frontend (Next.js App Router)**:
   - HTTP는 `frontend/src/lib/api.ts` 인스턴스만 사용. 비즈니스 로직은 `hooks/`, UI는 `components/`.
   - 토큰 만료(404/403) 시 Graceful Degradation(CRITICAL_LOGIC §3.4). 마스킹·동기화 규칙 준수.
4. **Encoding**: 배치 파일(.bat, .cmd)은 ANSI(CP949), 그 외 소스는 UTF-8 (no BOM) (CRITICAL_LOGIC §2.5).

### 📋 작업 프로세스 (Output Requirements)
다음 순서에 따라 **동작 가능한 전체 코드**를 출력해 줘:

**Step 1: 통합 설계 및 작업 지시서**
- 수정·생성될 모든 파일 목록과 각 파일별 변경 핵심 로직을 요약한다.

**Step 2: 전체 코드 구현 (Full Source Output)**
- 수정된 모든 파일을 라인 1부터 끝까지 전체 코드로 출력한다. backend/ (routers, services, migrations) → frontend/src/ (components, hooks, app) 순서.

**Step 3: 문서화 및 검증**
- docs/ 또는 README에 추가된 기능 설명·API 명세를 정리한다. 필요 시 backend/tests/에 pytest 단위 테스트를 제안한다.

---
### [여기에 docs/repomix-output.md 내용 전체 붙여넣기]
```

---

### 사용 팁

- **Mega-Context**: 프로젝트 전체 구조를 알고 있으므로 "이 기능 구현해서 전체 파일 다 내놔" 한 번에 요청 가능.
- **출력 중단 시**: "이어서 계속 전체 코드로 출력해 줘"로 이어받기.
- **검증**: 적용 후 `pytest`(백엔드), `npm run build`(프론트) 또는 `eco dev`로 확인.
