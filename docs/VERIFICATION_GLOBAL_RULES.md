# 글로벌 룰 검증 보고서 (Antigravity + CRITICAL_LOGIC)

검증 일시: 2026-02-25  
기준: 사용자 규칙(Antigravity IDE Agent Global Rules), `docs/CRITICAL_LOGIC.md` (SSOT)

---

## 1. 준수 항목

### 1.1 SSOT 및 문서
| 항목 | 상태 | 비고 |
|------|------|------|
| `docs/CRITICAL_LOGIC.md` 존재 | 통과 | 비즈니스/기술 원칙 정의 완비 |
| 코드·문서 한국어 사용 | 통과 | 주석·문서 한국어, 이모지 미사용 |
| 로그 위치 `logs/` | 통과 | `backend/logs/`, `frontend/logs/`, `logs/` 사용 |

### 1.2 아키텍처 (CRITICAL_LOGIC §2)
| 항목 | 상태 | 비고 |
|------|------|------|
| Backend 레이어 | 통과 | Router → Service → Utils (admissions, dashboard 등) |
| Frontend 로직 분리 | 통과 | 비즈니스 로직 `hooks/` (useStation, useVitals, usePatientActions) |
| DB Update 2단계 (supabase-py) | 통과 | `station_service` 등 update 후 별도 select 패턴 |
| KST 단일 시간대 | 통과 | `dateUtils.ts` getKSTDate, getKSTMidnight, calculateHospitalDay (Asia/Seoul) |

### 1.3 동기화·API (CRITICAL_LOGIC §2.2, §2.3)
| 항목 | 상태 | 비고 |
|------|------|------|
| 500ms lastFetchRef 가드 | 통과 | `useStation.ts`, `useVitals.ts`에 적용 |
| 환자 상세 모달 SSOT | 통과 | `useVitals` 상태 우선, `fetchDashboardData({ force: true })` 지원 |

### 1.4 보안·감사 (CRITICAL_LOGIC §1.2, §5)
| 항목 | 상태 | 비고 |
|------|------|------|
| 환자 성함 마스킹 | 통과 | 백엔드 `mask_name`, API `patient_name_masked`/`display_name` |
| 전실/퇴원 audit_logs | 통과 | RPC `transfer_patient_transaction`, `discharge_patient_transaction`에서 INSERT |

### 1.5 환경·검증 (CRITICAL_LOGIC §3)
| 항목 | 상태 | 비고 |
|------|------|------|
| DEV UI 변수 | 통과 | `NEXT_PUBLIC_ENABLE_DEV_UI`, station page 분기 |
| test_env_integrity | 통과 | `pytest tests/test_env_integrity.py -v` 통과 |
| test_critical_logic_doc_exists | 통과 | CRITICAL_LOGIC.md 존재 검증 |

### 1.6 대시보드 데이터 계약 (CRITICAL_LOGIC §3.3)
| 항목 | 상태 | 비고 |
|------|------|------|
| admission display_name | 통과 | `dashboard.py`에서 보강, 스키마/테스트 반영 |
| document_requests 상태 필터 금지 | 통과 | PENDING·COMPLETED 구분 없이 최근 요청 반환 |

---

## 2. 수정·권장 사항

### 2.1 배치 파일 인코딩 (적용 완료)
- **규칙**: CRITICAL_LOGIC §2.5 — 배치 파일은 **파일 인코딩** ANSI(CP949/EUC-KR) 유지. 수정 시 인코딩 변경 금지.
- **테스트**: `test_verify_scripts_encoding.py`는 (1) 내용에 `chcp 65001` 포함 여부, (2) 실행 시 stdout UTF-8 디코딩 검사.
- **조치**: `eco.bat`, `start_backend_pc.bat` 상단에 `chcp 65001 >nul` 추가 (콘솔 코드페이지 설정만 추가, 파일 인코딩은 유지).
- **참고**: 테스트 2단계(실행 출력 디코딩)는 cmd.exe 환경에 따라 실패할 수 있음. 한글/특수문자 출력 시 로컬에서 ANSI 저장 여부 확인 권장.

### 2.2 3대 메모리 파일 (권장)
- **규칙**: 사용자 규칙 §5 — 계획 승인 직후 `mission.md`, `context.md`, `checklist.md` 생성/업데이트.
- **현황**: 프로젝트 루트에 미존재.
- **권장**: 대형 트랙/계획 진행 시 해당 문서 생성해 맥락 유지.

### 2.3 useMeals 500ms 스로틀 (선택)
- **규칙**: CRITICAL_LOGIC §2.2 — 모든 API 호출 훅에 최소 500ms lastFetchRef 가드.
- **현황**: `useMeals.ts`는 `requestRef`로 오래된 응답 무시만 구현, 500ms 스로틀 없음.
- **권장**: 식단 플랜 API 호출 빈도가 높다면 동일 패턴 적용 검토.

---

## 3. 검증에 사용한 명령

```powershell
# 환경·CRITICAL_LOGIC 문서 존재
cd backend; python -m pytest tests/test_env_integrity.py -v

# 배치 파일 chcp 65001 포함 여부 (2단계는 환경 의존)
python -m pytest tests/test_verify_scripts_encoding.py -v
```

---

## 4. docs 폴더 검증 (2026-02-25)

`docs/` 및 `docs/prompts/` 하위 문서를 글로벌 룰(한국어, 이모지 금지, CRITICAL_LOGIC 일치) 기준으로 점검함. 30분 AI 코딩 워크플로우는 `WORKFLOW_30MIN_AI_CODING.md`(절차)·`prompts/WORKFLOW_30MIN_PROMPTS.md`(eco_pediatrics 전용 복붙 프롬프트) 분리 유지.

### 4.1 점검한 문서 목록

| 경로 | 점검 내용 | 결과 |
|------|-----------|------|
| README.md | 목차·한국어·이모지 | 통과 |
| CRITICAL_LOGIC.md | SSOT (이전 검증에서 확인) | 통과 |
| DEV_ENVIRONMENT.md | 한국어·이모지 | 수정함 (이모지 제거) |
| TROUBLESHOOTING.md | 한국어·chcp 설명과 현재 배치 상태 일치 | 수정함 (§8 chcp 문구 정리) |
| CHANGELOG.md | 한국어·이모지 | 통과 |
| DEVELOPMENT_STANDARDS.md | 내용 일치 | 통과 (일부 영문 패턴 유지) |
| SESSION_2026-02-23.md | 한국어·이모지 | 통과 |
| FRONTEND_RENDER_OPTIMIZATION.md | 스테이션 렌더 최적화(TemperatureGraph, MealGrid, NotificationItem) | 통과 |
| SECURITY_REVIEW.md | 한국어·CRITICAL_LOGIC 참조 | 통과 |
| REFACTOR_DOCS_PLAN.md | 한국어·이모지 | 통과 |
| WORKFLOW_30MIN_AI_CODING.md | 한국어·이모지·프롬프트 문서 참조 방식 | 통과 |
| prompts/WORKFLOW_30MIN_PROMPTS.md | eco_pediatrics 전용·Phase 1~3·통합 마스터 프롬프트 | 통과 |
| CODE_REVIEW_LATEST.md | 한국어·이모지 | 통과 |
| ERROR_MONITOR_ARCHITECTURE.md | 한국어·이모지 | 수정함 (이모지 제거) |
| ARCHITECTURAL_PLAN.md | 기술 내용 | 통과 (전문 용어·영문 유지) |
| TROUBLESHOOTING_WT_LAYOUT.md | 기술 내용 | 통과 |
| prompts/PROMPT_OTHER_LLM_*.md | 한국어·구조 | 통과 |
| prompts/prompt_for_gemini.md, VERIFICATION_PROMPT_FOR_GEMINI.md | 참조용 | 미상세 점검 |
| prompts/archive/*.md | 과거 이슈 보관 | 샘플만 확인, 이모지 없음 |
| repomix-*.md, repomix-output.md | 스크립트 생성·덤프(워크플로우는 repomix-output.md 한 파일만 사용) | 용도상 점검 생략 |

### 4.2 적용한 수정

1. **DEV_ENVIRONMENT.md**  
   - `⚠️` → `[주의]`, `🎉`/`❌` → 문구로 대체 (`Environment is HEALTHY!`, `[FAIL]로 표시된 항목`).

2. **ERROR_MONITOR_ARCHITECTURE.md**  
   - 표 셀 내 `📁` 제거 (`파일 기반 (채택)`만 유지).

3. **TROUBLESHOOTING.md** §8  
   - "chcp 65001 제거"를 "chcp 65001은 테스트 통과용으로 포함되어 있음. 파편화 재발 시 제거·ANSI 저장 권장"으로 정리해 현재 배치 상태와 일치시킴.

### 4.3 repomix 출력과 민감정보

- **Invoke-Repomix.ps1**: `$fullInclude`에 `.env` 경로가 없고, `$fullIgnore`에 `**/.env`, `**/.env.*`, `**/.env.local`, `**/*.pem`, `**/service-account*.json`, `**/*.key`를 명시하여 덤프에 민감파일이 들어가지 않도록 함. repomix는 기본적으로 .gitignore도 적용하므로 이중 차단.

### 4.4 권장 사항 (선택)

- **DEVELOPMENT_STANDARDS.md**, **ARCHITECTURAL_PLAN.md**, **TROUBLESHOOTING_WT_LAYOUT.md**: 설명·헤딩이 영문 비중이 큼. 글로벌 룰 "설명에는 한국어"를 엄격히 적용할 경우 한국어 보강 검토.
- **prompts/archive**: 완료된 이슈용 프롬프트만 보관. 신규 작업 시 `docs/CRITICAL_LOGIC.md`·`VERIFICATION_GLOBAL_RULES.md` 우선 참조.

---

## 5. 요약

- **CRITICAL_LOGIC** 및 **글로벌 룰**의 핵심 항목(SSOT, 레이어, KST, 마스킹, audit_logs, 500ms 가드, DB 2단계, 데이터 계약)은 현재 코드·문서와 **일치**함.
- **배치 파일**: `chcp 65001` 추가로 테스트 1단계 충족. 파일 자체는 ANSI 인코딩 유지 권장(IDE 저장 시).
- **docs 폴더**: 이모지 3건 제거, TROUBLESHOOTING §8 문구 정리 반영. 30분 워크플로우 문서는 eco_pediatrics 전용으로 정리되어 절차(WORKFLOW_30MIN_AI_CODING.md)와 복붙 프롬프트(prompts/WORKFLOW_30MIN_PROMPTS.md) 참조 방식 유지.
- **선택 보완**: mission/context/checklist 메모리 파일, useMeals 스로틀, 일부 문서 한국어 확대는 필요 시 추가.
