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

### 2.2 작업 맥락·미션·체크리스트 (memory.md 통합)
- **규칙**: 작업 맥락·현재 미션·점검 목록은 `docs/memory.md` 단일 소스로 유지. (과거 `mission.md`, `context.md`, `checklist.md`는 memory.md로 통합되어 해당 파일들은 제거됨.)
- **참조**: memory.md 내 "통합된 Mission·Checklist·Context" 섹션 및 Executive Summary·Logs.
- **권장**: 대형 트랙/계획 진행 시 memory.md Logs에 [Context]/[Action] 형식으로 추가 기록.

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

## 4. docs 폴더 검증 (2026-02-25 시점)

**주의**: 이 섹션은 2026-02-25 당시 점검 결과입니다. 이후 문서 체계 개편으로 일부 항목이 변경·삭제되었습니다.

`docs/` 및 `docs/prompts/` 하위 문서를 글로벌 룰(한국어, 이모지 금지, CRITICAL_LOGIC 일치) 기준으로 점검함.

### 4.1 당시 점검 결과 (주요 항목)

| 경로 | 점검 내용 | 결과 | 현재 상태 |
|------|-----------|------|-----------|
| README.md | 목차·한국어·이모지 | 통과 | 유지 (갱신됨) |
| CRITICAL_LOGIC.md | SSOT | 통과 | 유지 (§5.1 추가됨) |
| DEV_ENVIRONMENT.md | 한국어·이모지 | 수정함 (이모지 제거) | 유지 |
| TROUBLESHOOTING.md | chcp 설명과 배치 상태 일치 | 수정함 | 유지 (구조 재편됨) |
| CHANGELOG.md | 한국어·이모지 | 통과 | **삭제됨** (memory.md로 통합) |
| DEVELOPMENT_STANDARDS.md | 내용 일치 | 통과 | 유지 |
| FRONTEND_RENDER_OPTIMIZATION.md | 렌더 최적화 내용 | 통과 | 유지 |
| SECURITY_REVIEW.md | 한국어·CRITICAL_LOGIC 참조 | 통과 | 유지 |
| WORKFLOW_30MIN_AI_CODING.md | 프롬프트 문서 참조 방식 | 통과 | 유지 |
| ERROR_MONITOR_ARCHITECTURE.md | 한국어·이모지 | 수정함 (이모지 제거) | 유지 |
| ARCHITECTURAL_PLAN.md | 기술 내용 | 통과 | 유지 |
| prompts/WORKFLOW_30MIN_PROMPTS.md | eco_pediatrics 전용 | 통과 | 유지 |

### 4.2 당시 적용한 수정

1. **DEV_ENVIRONMENT.md**: `⚠️` → `[주의]`, `🎉`/`❌` → 문구로 대체.
2. **ERROR_MONITOR_ARCHITECTURE.md**: 표 셀 내 `📁` 제거.
3. **TROUBLESHOOTING.md** §8: chcp 65001 문구를 현재 배치 상태와 일치시킴.

### 4.3 repomix 출력과 민감정보

- **Invoke-Repomix.ps1**: `$fullIgnore`에 `**/.env`, `**/.env.*`, `**/*.pem`, `**/service-account*.json`, `**/*.key`를 명시하여 민감파일이 덤프에 포함되지 않도록 이중 차단.

---

## 5. 요약

- **CRITICAL_LOGIC** 및 **글로벌 룰**의 핵심 항목(SSOT, 레이어, KST, 마스킹, audit_logs, 500ms 가드, DB 2단계, 데이터 계약, 메모리 안전)은 현재 코드·문서와 **일치**함.
- **배치 파일**: `chcp 65001` 추가로 테스트 1단계 충족. 파일 자체는 ANSI 인코딩 유지 (CRITICAL_LOGIC §2.5, TROUBLESHOOTING §8 참고).
- **변경 이력**: `CHANGELOG.md` 폐기. 이후 변경 이력은 `docs/memory.md` Logs 섹션으로 일원화.
- **선택 보완**: useMeals 500ms 스로틀은 필요 시 추가 검토.
