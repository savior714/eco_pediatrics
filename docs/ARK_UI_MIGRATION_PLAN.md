# Ark UI 마이그레이션 아키텍처 계획

## 1. 개요 (Objective)
본 계획은 `eco_pediatrics` 프로젝트의 프론트엔드 UI 시스템을 **Ark UI** 기반의 Headless 구조로 전환하여, 접근성(Accessibility)을 강화하고 상태 로직과 스타일링을 엄격히 분리하는 것을 목표로 합니다.

## 2. 디자인 원칙 (Design Principles)
- **Headless First**: 모든 UI 구성 요소는 Ark UI의 프리미티브 유닛을 사용하며, 로직은 상태 기계(State Machine)에 의존한다.
- **Styling Isolation**: Tailwind CSS를 사용하여 스타일을 정의하되, Ark UI의 `asChild` 패턴을 활용하여 시맨틱 마크업을 유지한다.
- **Logic SSOT**: 컴포넌트 내부의 복잡한 상태 관리를 Ark UI의 전용 Hook으로 이관하여 비즈니스 로직과 UI 뷰를 분리한다.

## 3. 단계별 상세 로드맵 (Roadmap)

### Phase 0: 환경 구성 (Setup)
- **종속성 설치**: `node_modules`에 `@ark-ui/react` 및 관련 유틸리티 설치.
- **디자인 토큰 정의**: Tailwind config에 Ark UI 상태 클래스(`data-opened`, `data-disabled` 등) 연동 설정.

### Phase 1: 원자적 UI 프리미티브 구축 (Atomic Components) - [COMPLETED]
- **기본 컴포넌트 이관**:
    - `Button`: Ark UI 없이 Tailwind 기반 표준화.
    - `Modal / Dialog`: `frontend/src/components/ui/Modal.tsx`를 Ark UI `Dialog` 기반으로 리팩토링.
    - `Select / Menu`: 식단 신청(`MealRequestModal`) 등에서 사용하는 드롭다운을 Ark UI `Select`로 교체.
    - `Tabs`: 환자 상세 모달 내의 탭 구조 이관.

### Phase 2: 복합 컴포넌트 마이그레이션 (Complex Widgets) - [COMPLETED]
- **스테이션 페이지**:
    - `PatientCard`: 호버 및 인터랙션 로직을 Ark UI 프리미티브로 보강.
    - `MealGrid`: 엑셀 스타일 입력부의 포커스 관리 및 상태 전이를 Ark UI `Field`와 연동.
- **모달 시스템 전면 교체**:
    - `PatientDetailModal`, `AddExamModal`, `TransferModal` 등을 Ark UI의 다이얼로그 패턴으로 통일.

### Phase 3: 인터랙션 최적화 및 SSOT 검증 - [COMPLETED]
- **Framer Motion 통합**: Ark UI의 상태 전이 시점에 Framer Motion 애니메이션 최적화.
- **비즈니스 로직 연동**: `hooks/useVitals`, `hooks/useStation` 등의 커스텀 훅과 Ark UI 상태 간의 정합성 검증.
- **Client Boundary Fix**: Next.js App Router 호환을 위한 `"use client"` 지시어 전면 도입.

## 4. 최종 결과 및 효과 (Final Status: 2026-03-02)
- **성능**: `unmountOnExit` 적용으로 모달 메모리 누수 방지.
- **표준화**: 모든 팝업, 알림, 입력 폼이 Ark UI Headless 프리미티브로 일원화됨.
- **안정성**: SSR 환경에서의 렌더링 경계 에러(createToaster 등) 전격 해결.

## 4. 예상 효과
- **유지보수성 향상**: UI 라이브러리에 종속되지 않는 비즈니스 로직 분리.
- **접근성 확보**: 스크린 리더 및 키보드 내비게이션 표준 준수.
- **일관된 UX**: 모든 인터랙티브 요소의 상태 전이가 Ark UI의 State Machine에 의해 통일됨.

## 5. 실행 가이드 (Implementation Note)
1. 모든 컴포넌트 수정 시 **`docs/memory.md`**에 기록을 남긴다.
2. 컴포넌트 로직 수정 전 반드시 **`CRITICAL_LOGIC.md`**의 SSOT 원칙을 재확인한다.
3. 마이그레이션 후 `npm run lint` 및 테스팅을 통해 정적 안정성을 확보한다.
