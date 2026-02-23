# prompt_for_gemini.md 프로젝트 일치 검증 결과

**검증 일시**: 2026-02-23  
**대상**: `docs/prompts/prompt_for_gemini.md` 출력 내용 vs 현재 eco_pediatrics 코드베이스

---

## 1. 일치하는 항목

| 구분 | 내용 |
|------|------|
| **backend/main.py** | 라우터 prefix, lifespan, DB 웜업, CORS, WS 검증, ENABLE_DEV 조건 포함 로직 일치 |
| **backend/routers/admissions.py** | `response_model=dict`, create_admission, list_admissions, fetch_dashboard_data 경로 일치 |
| **backend/routers/station.py** | 엔드포인트 경로, DocumentRequest/MealRequest PATCH, 브로드캐스트 메시지 구조 일치 (단, 아래 버그 참고) |
| **backend/routers/exams.py** | exam-schedules CRUD, broadcast_to_station_and_patient 사용 일치 |
| **backend/models.py** | AdmissionCreate.attending_physician: Optional[str] = None, validator 포함 일치 |
| **backend/schemas.py** | AdmissionResponse.attending_physician, DashboardResponse 구조 일치 |
| **backend/constants/mappings.py** | DOC_MAP(RECEIPT, DETAIL, CERT, DIAGNOSIS, INITIAL) 일치 |
| **backend/utils.py** | execute_with_retry_async, create_audit_log, normalize_rpc_result, mask_name, is_pgrst204_error 일치 |
| **backend/websocket_manager.py** | ConnectionManager, broadcast(token), broadcast_all 일치 |
| **frontend/src/hooks/useDashboardStats.ts** | useVitals, DOC_MAP, MEAL_LABEL_MAP, viewMode, requestedDocItems 등 로직 일치 |
| **frontend/src/types/domain.ts** | Bed, AdmissionSummary에 attending_physician 필드 포함, WsMessage 타입 일치 |
| **frontend/src/lib/api.ts** | API_BASE, Tauri fetch/log, ApiClient, appLog, pendingGetPromises 공유 로직 일치 |
| **frontend/src/hooks/useStation.ts** | fetchAdmissions, ROOM_NUMBERS, emptySlotsInitial, WS 메시지 처리 방향 일치 |
| **마이그레이션** | `supabase/migrations/20260223_attending_physician.sql` 존재, admissions.attending_physician·view·RPC 반영 |

---

## 2. 불일치 또는 주의 사항

### 2.1 backend/routers/station.py — `logger` import (조치 완료)

- **프롬프트**: 85행 근처에 `logger.info(f"Duplicate document request...")` 인용됨.
- **이전 코드**: `logger` 호출은 있었으나 import 누락으로 `NameError` 가능.
- **조치**: `from logger import logger` 추가 완료. 현재는 프롬프트와 코드 일치.
- **조치**: 프롬프트는 “현재(버그 포함) 코드”를 그대로 반영하고 있음. **프로젝트 측에서 `from logger import logger` 추가 필요.**

### 2.2 경로 표기

- 프롬프트는 Windows 스타일 `backend\...`, `frontend\...` 사용. 실제 레포는 동일 환경이므로 무방.
- 다른 LLM/도구가 경로만 파싱할 경우 `backend/` 등 슬래시로 정규화해 해석하면 됨.

### 2.3 Session Report 상단

- "Session Started", "Total Errors in Session: 0", "에러 감지 전 (대기 중)" 은 **세션 상태** 설명이므로, “현재 프로젝트 코드”와의 일치 여부와는 무관. 에러 트래커 사용 방식에 맞게 유지하면 됨.

---

## 3. 결론

- **출력 전체**: 현재 프로젝트 구조·API·스키마·attending_physician 반영·프론트 훅/타입과 **대부분 일치**한다.
- **유일한 런타임 이슈**: `backend/routers/station.py`에서 `logger` 미 import. 프롬프트는 해당 코드를 정확히 인용하고 있으므로, **프로젝트에서 logger import를 추가하는 것이 필요**하다.

위 반영 후에는 `prompt_for_gemini.md`가 “현재 프로젝트 상황”을 올바르게 전달하는 문맥으로 사용 가능하다.
