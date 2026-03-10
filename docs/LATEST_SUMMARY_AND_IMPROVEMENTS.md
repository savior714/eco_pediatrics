# 최근 변경점 요약 및 아키텍처 개선 제안 (2026-03)

## 1. 최근 주요 변경점 요약 (Executive Summary)

**[1.1] 실행 환경 및 터미널 안정성 확보 (CLI Automation)**
- `eco.bat` 및 `launch_wt_dev.ps1`의 고질적인 파싱/실행 오류(0x80070002 등) 해결.
- **PSScriptRoot Self-Location 패턴**을 적용하여 Windows 환경변수 상속 문제 극복.
- 실행 엔진 폴백(`pwsh.exe` -> `powershell.exe`) 및 `wt.exe -w -1` 플래그로 윈도우 생성 거동 안정화.

**[1.2] Tauri 윈도우 매니지먼트 및 UX 고도화**
- **Singleton Re-instance 패턴** 적용: 스마트폰 QR 미리보기 창 로드 시 기존 창 중복 생성 에러를 막기 위해, 이전 창 폐기(`close`) 후 재생성(`show`) 로직 적용.
- Tauri 보안 정책에 맞추어 `core:window:allow-show`, `allow-set-focus`, `allow-close` 권한(`default.json`) 명시.

**[1.3] 프론트엔드 / 대시보드 사용성 고도화**
- **역동성 제거 및 안정감 부여**: 병동 메인 대시보드를 스크롤 없는 '상황판' 형태로 유지하기 위해 컨테이너 영역을 `overflow-hidden`으로 고정.
- **조작 밀도 향상**: 기존 드롭다운(Select) 방식이었던 식단 신청 모달을 버튼 그룹(Button Group, 고밀도 UI `h-12`)으로 전면 개편하여 모바일 접근성 극대화.

**[1.4] 백엔드 및 DB 뷰(View) 쿼리 리팩토링**
- `view_station_dashboard` SQL View에 걸려 있던 **임의의 시간 필터(체온 5일, 식사 3일 등)를 모두 제거**하여 누락되는 환자 히스토리가 없도록 수정 (`DROP VIEW ... CASCADE` 구조 활용).

---

## 2. 아키텍처 개선점 도출 (Architectural Improvements)

**[2.1] IPC (Inter-Process Communication) 기반 Tauri 윈도우 상태 관리 전환**
- **Current**: QR 미리보기 변경 시 브라우저 창 인스턴스 자체를 파괴(Destroy)하고 재생성(200ms 지연)하는 방식 채택 중.
- **Improvement**: 윈도우 파괴/재생성은 오버헤드가 큼. Tauri의 **Event System (`emit`, `listen`)**을 활용하여, 이미 열려 있는 창에 새로운 QR Token만 Payload로 전달(IPC)하고, React 상태만 즉각 업데이트하는 Single Page Component 렌더링 방식으로 리팩토링 권장.

**[2.2] DB View 무제한 조회의 성능 최적화 (Lazy Loading or CQRS)**
- **Current**: 대시보드 View에서 수일 전(혹은 몇 달 전)의 체온/식사 기록까지 모두 Full Scan 함. 현재는 안정적일 수 있으나 향후 심각한 성능 병목 유발 가능함.
- **Improvement**: 
  1. 가장 최근의 레코드만 담아두는 **Materialized View** 혹은 **Latest Status Table**을 별도로 유지하여 대시보드(Grid) 렌더링 속도 최우선 보장.
  2. 전체 히스토리가 필요한 모달에서는 무한 스크롤(Infinite Scroll) 혹은 커서 기반 페이지네이션(Cursor Pagination) 적용.

**[2.3] UI 컴포넌트 정책 중앙화 (Global Layout Policy)**
- **Current**: 스크롤바 관리(`overflow-hidden`)나 모달의 스타일이 개별 컴포넌트(`Station/page.tsx`, `MealGrid.tsx`)에 하드코딩 되어 있음.
- **Improvement**: Ark UI Headless 패턴의 장점을 살려 `DashboardLayout` 컨텍스트를 제작하고, 패널마다 Scrollable 여부를 Prop으로 넘겨받아 체계적으로 제어하는 등 **디자인 토큰과 레이아웃 정책의 중앙화 (SSOT)** 적용 필요.

**[2.4] 환경 일관성을 위한 Containerization 접근**
- **Current**: Batch와 PowerShell 스크립트에 고도로 의존하여 개발자 PC마다 실행 파싱 에러 방어 로직이 비대해짐 (`eco.bat` 등).
- **Improvement**: 장기적으로 `wt.exe` 스크립트 기반 실행을 Docker Compose(백엔드/DB)와 Node Task Runner(프론트엔드) 조합으로 단순화하여 **환경 의존성(Environment Dependency)의 근본적 제거** 고려.
