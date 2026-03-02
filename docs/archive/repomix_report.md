# repomix 덤프 구조 보고서

**목적**: LLM에 프로젝트 전체 맥락을 주입하기 위한 코드베이스 컨텍스트가 **어떤 디렉터리/파일**로 구성되는지 구조적으로 정리한다.  
**출력 파일**: `docs/repomix-output.md` (생성: `scripts/Invoke-Repomix.ps1`)  
**이 문서**: 덤프에 포함·제외되는 항목을 한눈에 보고, 뺄 것/넣을 것을 정리한 뒤 스크립트에 반영하기 위한 단일 진실 공급원(SSOT).

---

## 1. 포함(Include) 구조

아래 경로 패턴만 덤프에 **포함**된다. 스크립트의 `$fullInclude`와 1:1 대응한다.

### 1.1 Backend (FastAPI)

| 패턴 | 포함 범위 | 비고 |
|------|-----------|------|
| `backend/main.py` | 진입점 | 단일 파일 |
| `backend/routers/**` | admissions, station, iv_records, vitals, exams, dev 등 | API 라우트 |
| `backend/services/**` | dashboard, station_service, dev_service 등 | 비즈니스 로직 |
| `backend/models.py` | Pydantic/도메인 모델 | 단일 파일 |
| `backend/constants/**` | 상수 정의 | |
| `backend/utils.py` | 공통 유틸 | 단일 파일 |
| `backend/schemas.py` | 요청/응답 스키마 | 단일 파일 |
| `backend/database.py` | Supabase 클라이언트 | 단일 파일 |
| `backend/dependencies.py` | FastAPI 의존성 | 단일 파일 |
| `backend/logger.py` | 로깅 설정 | 단일 파일 |
| `backend/websocket_manager.py` | WebSocket 브로드캐스트 | 단일 파일 |
| `backend/scripts/**` | 백엔드용 스크립트 | |
| `backend/requirements*.txt` | requirements.txt, requirements-core.txt | 의존성 목록 |

**포함되지 않는 백엔드 경로 (참고)**  
- `backend/.env`, `backend/.env.*` → 제외(민감정보)  
- `backend/tests/**` → 제외(토큰 절약, §4.2 반영)  
- `backend/pyproject.toml` → include에 없음 (필요 시 추가)

---

### 1.2 Frontend (Next.js)

| 패턴 | 포함 범위 | 비고 |
|------|-----------|------|
| `frontend/src/**` | app/, components/, hooks/, lib/, types/ 등 | UI·상태·API 호출 전부 |
| `frontend/package.json` | npm 의존성·스크립트 | |
| `frontend/next.config.*` | Next.js 빌드·런타임 설정 | |
| `frontend/tsconfig.json` | TypeScript 옵션·경로 별칭 | |

**포함되지 않는 프론트 경로 (참고)**  
- `frontend/.env.local`, `frontend/.env.*` → 제외(민감정보)  
- `frontend/public/**` → include에 없음

---

### 1.3 Supabase (DB·스키마)

| 패턴 | 포함 범위 | 비고 |
|------|-----------|------|
| `supabase/migrations/**` | SQL 마이그레이션 | |
| `supabase/schema.sql` | 통합 스키마 (있을 경우) | 단일 파일 |
| `supabase/config.toml` | 로컬 개발 설정(포트, DB 등) | |

**포함되지 않는 Supabase 경로 (참고)**  
- (현재 없음 — config.toml 포함됨)

---

### 1.4 Docs (문서)

| 패턴 | 포함 범위 | 비고 |
|------|-----------|------|
| `docs/**` | docs/ 하위 모든 마크다운·문서 | CRITICAL_LOGIC, TROUBLESHOOTING, 워크플로우 등 |

**단, 제외(Ignore)에 걸리는 docs/**  
- `docs/repomix*.md` → 덤프 출력물 재귀 포함 방지  
- `docs/tree.txt` → 트리 출력 보조 (선택)  
- `docs/prompts/archive/**` → 과거 이슈용 프롬프트 제외(토큰 절약, §4.2 반영)

---

## 2. 제외(Ignore) 구조

아래 패턴은 **덤프에서 제외**된다. 스크립트의 `$fullIgnore`와 1:1 대응한다.

### 2.1 재귀·보조·아카이브 제외

| 패턴 | 사유 |
|------|------|
| `docs/repomix*.md` | repomix-output.md 등이 다시 덤프에 들어가는 루프 차단 |
| `docs/tree.txt` | 트리 구조 보조 파일 (덤프 불필요) |
| `docs/prompts/archive/**` | 이미 해결된 이슈용 프롬프트·진단 문서 (토큰 절약) |

### 2.2 민감정보 (명시적 제외)

| 패턴 | 사유 |
|------|------|
| `**/.env` | 백엔드/프론트 루트 .env |
| `**/.env.*` | .env.development, .env.production 등 |
| `**/.env.local` | Next.js 로컬 env |
| `**/*.pem` | 인증서·키 |
| `**/service-account*.json` | 서비스 계정 키 |
| `**/*.key` | 키 파일 |

※ repomix는 기본적으로 `.gitignore`도 적용하므로, 위는 **이중 차단**용이다.

---

## 3. 구조 요약 (한눈에)

```
[포함]
├── backend/          → main, routers, services, models, utils, schemas, database, dependencies, logger, websocket_manager, scripts, constants, requirements*.txt (tests 제외)
├── frontend/         → src/** 전부, package.json, next.config.*, tsconfig.json
├── supabase/         → migrations/**, schema.sql, config.toml
└── docs/             → repomix*.md, tree.txt, prompts/archive/** 제외한 전부

[제외]
├── docs/repomix*.md, docs/tree.txt, docs/prompts/archive/**   (재귀·보조·아카이브)
└── **/.env, **/.env.*, **/.env.local, **/*.pem, **/service-account*.json, **/*.key   (민감정보)
```

---

## 4. 뺄 것 / 넣을 것 정리

**이 프로젝트(eco_pediatrics)에서는** 이 덤프를 **30분 AI 코딩 워크플로우**에서 웹 LLM·IDE AI에게 붙여 넣어 "백엔드/프론트 지시서"를 받거나, Mega-Context용으로 한 번에 기능 설계·구현을 요청할 때 쓴다.  
아래를 보고 "이걸 넣으면 LLM이 뭘 더 알 수 있지?", "이걸 빼면 덤프가 얼마나 줄지?"를 판단한 뒤, **동일한 내용을 `scripts/Invoke-Repomix.ps1`의 `$fullInclude` / `$fullIgnore`에 반영**하면 된다.

---

### 4.1 넣고 싶은 항목 (현재 미포함)

**아래 항목은 이미 include에 반영되어 있다** (스크립트 `Invoke-Repomix.ps1`의 `$fullInclude`). 참고용으로 역할만 정리한다.

| 경로 패턴 | 프로젝트에서의 역할 | 비고 |
|-----------|---------------------|------|
| **`backend/requirements*.txt`** | 백엔드 Python 패키지 목록. `requirements.txt`(전체), `requirements-core.txt`(Supabase 제외 코어만) 등. FastAPI, Supabase, Pydantic, pytest 등 버전이 적혀 있음. | 포함됨. 새 패키지·버전 이슈 질문에 유리. |
| **`frontend/package.json`** | 프론트엔드 npm 의존성·스크립트. Next.js, Tailwind, Recharts, Framer Motion, Tauri 관련 패키지와 `npm run dev` / `tauri dev` 등 스크립트가 정의됨. | 포함됨. |
| **`frontend/next.config.*`** | Next.js 빌드·런타임 설정(이미지 도메인, rewrites, env 등). 이 프로젝트에서는 Tauri 연동·API 프록시 등이 들어갈 수 있음. | 포함됨. |
| **`frontend/tsconfig.json`** | TypeScript 컴파일 옵션·경로 별칭(`@/` 등). | 포함됨. |
| **`supabase/config.toml`** | Supabase 로컬 개발 설정(포트, DB 설정 등). | 포함됨. |

**추가로 넣고 싶은 항목이 생기면** 위와 같은 형식으로 표에 추가한 뒤 `$fullInclude`에 콤마로 붙이면 된다.

---

### 4.2 빼고 싶은 항목 (현재 포함됨)

**아래 두 항목은 이미 반영되어 있다**: `docs/prompts/archive/**` → ignore 추가됨, `backend/tests/**` → include에서 제거됨. 나머지는 선택 사항.

| 경로 패턴 | 프로젝트에서의 역할 | 비고 |
|-----------|---------------------|------|
| **`docs/prompts/archive/**`** | 이미 해결된 이슈용 프롬프트·진단 문서. (예: 스테이션 빈 그리드, 서류 완료 미표시, 식단 동기화, WT 레이아웃 등 과거 버그 분석용). | **제외됨.** `$fullIgnore`에 반영. |
| **`backend/tests/**`** | pytest로 작성한 백엔드 단위·통합 테스트. (env 검증, 대시보드 완료 서류 포함 여부 등). 동작하는 앱 코드는 아니고 "검증용 코드". | **제외됨.** `$fullInclude`에서 삭제됨. |
| **`backend/scripts/**`** | 백엔드 쪽에서 쓰는 유틸 스크립트. (실행 진입점이 아닌 보조 스크립트). | 진입점·라우터·서비스만 보고 스크립트는 덤프에서 제외하고 싶을 때 → `$fullInclude`에서 `backend/scripts/**` 삭제. |
| **`docs/` 중 특정 파일** | 예: `CODE_REVIEW_LATEST.md`, `SESSION_2026-02-20.md` 같이 "한 번 쓰고 참고만 하는" 문서. CRITICAL_LOGIC, TROUBLESHOOTING, 워크플로우는 계속 참조됨. | "핵심 문서만" 넣고 싶다면 `$fullIgnore`에 `docs/CODE_REVIEW*.md,docs/SESSION_2026-02-20.md` 등 추가. |

**정리**: archive·tests는 이미 빼 둔 상태. 더 줄이려면 **backend/scripts** 제거나 **docs 특정 파일** ignore 추가를 검토하면 된다.

---

### 4.3 유지할 항목

- **Backend**: routers, services, models, database, dependencies, logger, websocket_manager, utils, schemas → 핵심 런타임·아키텍처.
- **Frontend**: `frontend/src/**` → 앱·컴포넌트·훅·API 전부.
- **Supabase**: migrations, schema.sql → DB 계약.
- **Docs**: CRITICAL_LOGIC, TROUBLESHOOTING, 워크플로우 등 → SSOT·운영 지식.
- **제외**: repomix 출력물 재귀 + 민감정보 패턴 → 유지.

---

## 5. 스크립트와 동기화

- **Include 수정**: `scripts/Invoke-Repomix.ps1` 내 `$fullInclude` 문자열을 이 문서 §1 구조에 맞게 편집. (쉼표 구분, 공백 없이)
- **Ignore 수정**: `$fullIgnore` 문자열을 §2 구조에 맞게 편집.
- **검증**: 수정 후 `pwsh -ExecutionPolicy Bypass -File scripts\Invoke-Repomix.ps1` 실행 → `docs/repomix-output.md` 상단 "included / excluded" 설명과 이 문서가 일치하는지 확인.

이 문서를 **repomix 덤프 구조의 SSOT**로 두고, "뺄 것/넣을 것"을 여기서 정리한 뒤 스크립트에 반영하면 구조화가 수월해진다.
