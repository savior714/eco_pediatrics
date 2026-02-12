# 🏥 소아병동 스마트 커뮤니케이션 대시보드 (PID) 개발 명세서

## 1. 프로젝트 정의 및 핵심 원칙 (Project Definitions)
이 프로젝트는 의료적 진단 도구가 아니며, **보호자의 안심**과 **간호사의 업무 효율**을 위한 커뮤니케이션 도구입니다.

*   **서비스 성격**: EMR 미연동, 비의료기기 (Non-Medical Software).
*   **핵심 가치**:
    *   **보호자**: 아이 곁에 24시간 상주하며, 열이 내리고 있는지(호전 여부)를 시각적으로 확인하여 안심함.
    *   **간호사**: 29병상을 효율적으로 관리하고, 수액 조절기 확인 등의 처치 내역을 사진으로 남겨 안전 사고를 방지함.
*   **접근 보안**: 별도 회원가입 없이 입원 기간에만 유효한 **QR 코드(UUID 토큰)** 기반의 접속 방식을 사용.

---

## 2. 기술 스택 (Tech Stack for IDE)
Google Antigravity IDE가 코드를 생성할 때 기준이 되는 스택입니다.

*   **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS (Shadcn UI).
*   **Backend**: Python FastAPI (비동기 처리, WebSocket 지원).
*   **Database**: Supabase (PostgreSQL) - DB, Auth, Realtime, Storage 통합 활용.
*   **Client**:
    *   보호자용: Mobile Web (반응형).
    *   간호사/식당용: PC Web 및 Tablet (추후 Tauri로 데스크톱 앱 패키징 가능).

---

## 3. 데이터베이스 스키마 설계 (Database Schema)
의료 정보 보호를 위해 민감 정보는 마스킹 처리하고, 로그를 철저히 남깁니다.

| 테이블명 | 주요 컬럼 | 설명 및 목적 |
| :--- | :--- | :--- |
| **Admissions** | `id` (UUID), `patient_name_masked` (이*원), `room_number`, `access_token` (UUID), `status` (IN_PROGRESS/DISCHARGED), `check_in_at` | 입원 세션 관리. 퇴원 시 `status` 변경으로 접근 차단. |
| **VitalSigns** | `id`, `admission_id`, `temp` (Float), `recorded_at` | **열 차트 시각화용**. 진단용이 아닌 추세 확인용. |
| **IV_Records** | `id`, `admission_id`, `photo_url`, `gtt` (속도), `nurse_id`, `created_at` | **증거 남기기용**. 수액 조절기 사진 및 당시 설정 속도 저장. |
| **Requests** | `id`, `admission_id`, `type` (Meal/Doc), `content` (Json), `status` | 식단(일반/죽/금식) 및 서류 신청 내역. |
| **Meal_Menus** | `id`, `date`, `meal_type` (Breakfast/Lunch/Dinner), `menu_description`, `is_npo_possible` | 날짜별 식단 메뉴 정보. |
| **AuditLogs** | `id`, `actor`, `action`, `target_id`, `ip_address`, `timestamp` | **필수**. 누가 조회하고 입력했는지 법적 근거 데이터 기록. |

---

## 4. 기능 상세 로직 (Functional Logic)

### ① 입원 및 QR 액세스 (Admission & Access)
*   **Nurse Logic**: 환자명(이주원)과 병실(201호) 입력 → 서버에서 이름 마스킹(이*원) 후 `Admissions` 테이블 생성 → 접근용 `access_token` 발급 → QR 코드 출력.
*   **Guardian Logic**: QR 스캔 → URL(`domain/dashboard?token={uuid}`) 접속 → 토큰 유효성 및 퇴원 여부(`status`) 체크 후 대시보드 진입.

### ② 체온 흐름 시각화 (Fever Trend Visualization)
*   **목표**: "해열제 투여 후 열이 떨어지고 있는가?"를 보여주어 보호자를 안심시킴.
*   **Logic**:
    1.  **FastAPI WebSocket**: `ws://api/vitals/{token}` 연결 유지.
    2.  간호사가 체온 입력 시 DB 저장과 동시에 소켓으로 Broadcast.
    3.  보호자 화면: 새로고침 없이 그래프 끝점이 실시간으로 연장됨.

### ③ 수액 안전 체크 (IV Safety Check)
*   **목표**: 수액이 과도하게 들어가는 사고(Full drop) 방지를 위해 간호사가 체크했다는 **시각적 증거(사진)**를 남김.
*   **Logic**:
    1.  간호사가 환자 QR 스캔 → '사진 업로드' 메뉴 진입.
    2.  **수액 조절기(Drip Controller)** 부분 촬영 및 업로드.
    3.  `Supabase Storage`에 저장 후 URL 반환.
    4.  보호자 화면: "14:00 담당 간호사 확인 완료" 메시지와 함께 해당 사진 표시.

### ④ 식단 및 서류 관리 (Meals & Docs)
*   **식단 신청**:
    *   기본적으로 '일반식' 설정. 보호자가 '죽' 또는 의료진 지시에 따른 '금식' 선택 가능.
    *   마감 시간(예: 10시) 이후에는 변경 버튼 비활성화.
*   **식당용 뷰 (Kitchen View)**:
    *   29개 병상의 식단 신청 현황을 5x6 그리드로 표시.
    *   **금식(NPO)**은 빨간색, **죽**은 노란색으로 고대비 처리하여 조리 실수 방지.
*   **퇴원/서류**:
    *   퇴원 전 필요 서류(진단서 등) 미리 신청.
    *   간호사가 '퇴원 처리' 클릭 시 `access_token` 만료 및 세션 종료.

---

## 5. UI/UX 구성안 (Interface Design)

### 📱 보호자용 (Mobile Web)
*   **메인**: 최상단에 **체온 그래프** 배치 (가장 궁금한 정보). 그 아래 '현재 수액 사진', '식단', '공지사항' 카드 배치.
*   **알림**: 간호사 호출 버튼 대신, 간호사가 확인하고 갔다는 **'완료 로그'**를 잘 보이게 하여 호출 횟수를 줄임.

### 🖥️ 간호사/관리자용 (Desktop/Tablet)
*   **병동 현황판**: 29개 병상 카드가 그리드 형태로 배치. 환자별 체온 상태(정상/고열)에 따라 카드 테두리 색상 변경.
*   **입력 편의**: 키보드 사용을 최소화하고 터치/클릭 위주의 UI (오타 방지).

---

## 6. 개발 단계별 프롬프트 가이드 (Prompting for IDE)

Antigravity IDE에 작업을 지시할 때 아래 순서와 내용을 참고하세요.

### Step 1: 프로젝트 뼈대 및 DB
> "FastAPI와 Supabase를 연동할 거야. `Admissions`, `VitalSigns`, `IV_Records`, `AuditLogs` 테이블을 생성하는 SQL을 짜줘. 특히 `Admissions` 테이블의 `access_token`은 유추 불가능한 UUID로 설정하고, 환자 이름은 마스킹해서 저장해야 해."

### Step 2: 입원 및 QR 생성 (Phase 1)
> "간호사가 환자 정보를 입력하면 QR 코드를 생성하는 `AdmissionForm.tsx` 컴포넌트를 만들어줘. `qrcode.react` 라이브러리를 쓰고, 생성된 QR을 보호자가 찍으면 `/dashboard?token=...`으로 이동하게 해줘. 백엔드에서는 토큰 유효성을 검사하는 `get_dashboard_data` API를 작성해줘."

### Step 3: 실시간 체온 그래프 (Phase 2)
> "보호자 대시보드에 `Recharts`를 이용해 체온 그래프를 그려줘. FastAPI WebSocket을 연결해서, 간호사가 새 체온을 입력하면 그래프가 실시간으로 업데이트되게 해줘. 이건 진단용이 아니라 추세 확인용이야."

### Step 4: 수액 사진 업로드 (Phase 2)
> "Supabase Storage의 `iv-photos` 버킷을 사용해서 간호사가 수액 조절기 사진을 업로드하는 기능을 구현해줘. 사진을 올리면 `IV_Records` 테이블에 URL과 함께 저장되고, 보호자 화면에는 '방금 확인됨'이라는 표시와 함께 사진이 떠야 해."

### Step 5: 식단 및 퇴원 관리 (Phase 3)
> "29개 병상의 식단 신청 현황을 보여주는 5x6 그리드 형태의 `KitchenGridView` 컴포넌트를 만들어줘. 금식 환자는 빨간색 배경으로 강조해줘. 그리고 퇴원 처리가 되면 해당 토큰으로 더 이상 접속하지 못하도록 막는 미들웨어 로직도 추가해줘."