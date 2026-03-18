# 안전 가드레일 및 메모리 안전 스펙

> **상위 문서**: [CRITICAL_LOGIC.md](../CRITICAL_LOGIC.md) §5 Safety Guardrails, §5.1 메모리 누수 방지 원칙  
> **관련 스펙**: [06-workflow-admissions.md](./06-workflow-admissions.md) — audit_logs 기록 요구사항

특정 모듈 수정 시 반드시 점검해야 하는 **부수 효과 체크리스트**와 **메모리 누수 방지** 규칙을 실행 명세로 정리한 문서입니다.

---

## 1. 수정 시 필수 점검 사항 (Checklist)

**CRITICAL_LOGIC §5**  
아래 영역을 수정할 때마다 해당 항목이 깨지지 않았는지 확인한다.

### 1.1 바이탈/체온 수정 시

- **대상**: `TemperatureGraph.tsx` 및 체온·바이탈 관련 컴포넌트/훅.
- **필수 확인**: X축 **KST Midnight 정렬** 로직이 유지되는지 검증.
- **근거**: 도메인 불변 원칙(01-domain-invariants)에 따라 모든 시각은 **Asia/Seoul (KST)** 기준으로 표시되며, 그래프 X축이 자정(KST) 기준으로 정렬되지 않으면 일차별 구간 해석이 틀어질 수 있음.

### 1.2 입원/전실/퇴원 로직 수정 시

- **대상**: `admissions` 라우터, RPC(`create_admission_transaction`, `transfer_patient_transaction`, `discharge_patient_transaction`).
- **필수 확인**: **audit_logs** 테이블에 해당 활동 내역(actor_type, action, target_id 등)이 기록되는지 확인.
- **상세**: [06-workflow-admissions.md §5](./06-workflow-admissions.md#5-audit_logs-기록-요구사항) 참조.

### 1.3 API 엔드포인트 수정 시

- **대상**: 대시보드·바이탈·식단·수액·문서 요청 등 서버 상태를 변경하는 API.
- **필수 확인**: 해당 데이터를 구독하는 WebSocket **broadcast_to_room** (또는 동등한 브로드캐스트) 로직이 누락되지 않았는지 확인.
- **이유**: 스테이션·보호자 클라이언트는 WS 이벤트로 캐시를 갱신하므로, API만 수정하고 브로드캐스트를 빠뜨리면 실시간 동기화가 깨짐. (00-architecture §2.2)

### 1.4 UI 컴포넌트 수정 시

- **대상**: 환자 이름·식별 정보를 노출하는 모든 UI.
- **필수 확인**: **mask_name** 유틸리티가 적용되어 환자 성함이 마스킹된 상태로만 노출되는지 확인.
- **금지**: 원본 이름을 그대로 렌더링하는 패턴. 보호자·스테이션 모두 마스킹 정책을 준수해야 함.

---

## 2. 메모리 누수 방지 원칙 (Memory Safety)

**CRITICAL_LOGIC §5.1**  
타이머·비동기 태스크·네트워크 요청의 생명주기를 명시적으로 관리하여 메모리 누수와 좀비 태스크를 방지한다.

### 2.1 Frontend

| 규칙 | 설명 | 검증 포인트 |
|------|------|-------------|
| **setTimeout / setInterval** | 생성 시 ID를 `useRef`에 보관하고, `useEffect` cleanup에서 **clearTimeout** / **clearInterval** 호출. | 컴포넌트 unmount 시 타이머 해제 여부. |
| **Debounce in useCallback** | `useCallback` 내부에서 타이머를 교체하는 debounce 패턴은 컴포넌트 수명과 별개이므로, 별도 **useEffect** cleanup에서 `clearTimeout(ref.current)` 필수. | debounce 사용 훅/컴포넌트에 cleanup 존재 여부. |
| **GET 요청 타임아웃** | `api.ts`의 GET 요청에는 **30초 AbortController** timeout 적용. 30초 초과 시 abort 에러로 간주되어 재시도 로직 적용. | AbortController 생성·abort 호출·signal 전달 일관성. |

### 2.2 Backend

| 규칙 | 설명 | 검증 포인트 |
|------|------|-------------|
| **asyncio.create_task** | `asyncio.create_task()` 사용 시 반환값을 변수에 저장하고, **task.add_done_callback**으로 예외 추적. 미추적 태스크는 GC 시 예외가 silent-discard 됨. | create_task 호출부에 done_callback 또는 await/취소 처리 존재 여부. |
| **Fire-and-forget 내부 DB** | fire-and-forget 태스크 내부 DB 쿼리에는 **asyncio.wait_for(coro, timeout=10.0)** 으로 감싸 좀비 태스크 방지. | 장시간 블로킹 가능 쿼리에 timeout 적용 여부. |
| **WebSocket 수신 루프** | `receive_text()` 루프에 **asyncio.wait_for(timeout=120)** 적용. 타임아웃 시 `close(1001)`로 연결 종료. **manager.disconnect()** 는 반드시 **finally** 블록에서 호출. | WS 핸들러에 timeout 및 finally disconnect 존재 여부. |

---

## 3. 검증 체크리스트

수정·배포 전 아래 항목을 확인한다.

- [ ] **TemperatureGraph KST**: 체온/바이탈 수정 시 X축 KST 자정 정렬 로직이 유지되는가?
- [ ] **audit_logs**: 입원/전실/퇴원 로직 수정 시 해당 활동이 audit_logs에 기록되는가?
- [ ] **broadcast_to_room**: API 수정 시 해당 데이터에 대한 WebSocket 브로드캐스트가 누락되지 않았는가?
- [ ] **mask_name**: UI 수정 시 환자 성함이 mask_name으로 마스킹되어 노출되는가?
- [ ] **setTimeout/clearTimeout**: 프론트엔드 타이머가 cleanup에서 clearTimeout/clearInterval 되는가?
- [ ] **AbortController 30s**: api.ts GET 요청에 30초 AbortController timeout이 적용되는가?
- [ ] **asyncio.create_task**: 백엔드 create_task 사용 시 done_callback 또는 예외 추적이 있는가?
- [ ] **WebSocket finally**: WS 핸들러에서 manager.disconnect()가 finally 블록에서 호출되는가?

---

**배포 전 보안 점검**: [SECURITY_REVIEW.md](../SECURITY_REVIEW.md) 체크리스트를 수행한다.

---

*본 스펙은 CRITICAL_LOGIC §5, §5.1의 실행 가능한 명세이며, 바이탈·입원·API·UI 또는 비동기/타이머 로직 변경 시 CRITICAL_LOGIC과 본 문서를 동시에 정렬해야 한다.*
