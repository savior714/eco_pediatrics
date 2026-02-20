# CRITICAL_LOGIC (Single Source of Truth)

이 문서는 `eco_pediatrics` 프로젝트의 **중심 축(Pivot)**이 되는 비즈니스 로직과 아키텍처 원칙을 정의합니다. 모든 코드 수정은 본 문서의 원칙과 충돌해서는 안 되며, 의도적인 변경 시에는 시니어 아키텍트의 승인 하에 본 문서를 먼저 업데이트해야 합니다.

---

## 1. Immutable Core: 도메인 불변 원칙
절대적으로 준수해야 하는 최상위 도메인 규칙입니다.

### 1.1 표준 시간대 (Single Timezone)
- **표준**: **Asia/Seoul (KST, UTC+9)**
- **정의**: 서버, DB, 클라이언트 모두 이 시간대를 기준으로 작동한다.
- **방어**: 클라이언트의 시스템 시간(Local Time)을 절대 신뢰하지 않는다. 모든 날짜/시간 처리는 `dateUtils.ts`의 KST 헬퍼를 경유해야 한다.
- **입원 일차(Hospital Day)**: 입원 날짜를 **1일차**로 정의하며, 시각에 관계없이 날짜가 변경될 때마다 카운트를 증가시킨다.

### 1.2 보안 및 접근 제어 (Secured QR)
- **인증**: 입원 시 생성되는 UUID 기반 `access_token`이 유일한 권한 증명이다.
- **권한(RLS)**: 데이터베이스 레벨(Supabase RLS)에서 `status = 'IN_PROGRESS'` 또는 `'OBSERVATION'`인 환자만 조회가 가능하도록 강제한다.
- **퇴원 시 처리**: 퇴원 즉시 토큰을 무효화하며, 보호자 대시보드는 즉시 세션을 종료(`window.close` 또는 리다이렉트)해야 한다.

---

## 2. Technical Architecture: 기술 제약 및 패턴
일관된 코드 품질을 유지하기 위한 기술적 가이드라인입니다.

### 2.1 레이어드 아키텍처 (Layered Architecture)
- **Backend**: `Router` (진입/DTO) -> `Service` (Business Logic) -> `Utils/Repo` (Infra) 순서를 엄격히 준수한다.
- **Frontend**: 비즈니스 로직은 최대한 커스텀 훅(`hooks/`)으로 추출하여 컴포넌트(`components/`)의 순수성을 유지한다.

### 2.2 실시간 동기화 프로토콜 (Sync Strategy)
- **Hybrid Sync**: WebSocket 브로드캐스트는 '트리거' 역할만 수행하며, 실제 데이터 업데이트는 클라이언트에서의 명시적 Refetch를 통해 정합성을 확보한다.
- **Throttling**: 중복 fetch 방지를 위해 모든 API 호출 훅에는 최소 **500ms의 `lastFetchRef` 가드**를 적용해야 한다.

---

## 3. Business Workflows: 핵심 업무 프로세스
복잡한 상태 전이가 일어나는 비즈니스 흐름입니다.

### 3.1 식단 신청 및 승인 (Meal Workflow)
- **슬롯 결정**: `getNextThreeMealSlots` 로직(06시, 14시, 19시 분기)에 따라 표시할 식사 슬롯을 결정한다.
- **상태 관리**: 보호자의 신청은 `requested_*` 필드에 임시 저장되며, 간호 스테이션의 '완료' 처리가 있어야만 실제 식단 필드로 전이된다. 수락 전까지 UI는 기존 식단을 유지한다.

### 3.2 수액 모니터링 (IV Monitoring)
- **표준 단위**: 병원 현장 표준에 따라 모든 수액 주입 속도는 **`cc/hr`** 단위를 사용한다.
- **데이터 구조**: `IV_Records`는 반드시 확인 시각과 현재 속도 정보를 포함해야 한다.

---

## 4. Safety Guardrails: 수정 시 필수 점검 사항 (Checklist)
특정 모듈 수정 시 반드시 함께 검토해야 하는 부수 효과 리스트입니다.

- [ ] **바이탈/체온 수정 시**: `TemperatureGraph.tsx`의 X축 KST Midnight 정렬 로직이 깨지지 않는지 확인.
- [ ] **입원/전실/퇴원 로직 수정 시**: `audit_logs` 테이블에 활동 내역이 기록되는지 확인.
- [ ] **API 엔드포인트 수정 시**: 해당 데이터를 참조하는 WebSocket 브로드캐스트 로직(`broadcast_to_room` 등)이 누락되지 않았는지 확인.
- [ ] **UI 컴포넌트 수정 시**: `mask_name` 유틸리티가 적용되어 환자 성함이 노출되지 않는지 확인.

---
*본 문서는 프로젝트의 헌법과 같습니다. 에이전트는 모든 Action 전 본 문서를 복귀하십시오.*
