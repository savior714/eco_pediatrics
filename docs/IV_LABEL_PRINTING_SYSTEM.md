# 수액 라벨 인쇄 시스템 (IV Label Printing System)

**최초 구현**: 2026-03-02
**관련 SSOT**: `docs/CRITICAL_LOGIC.md §4.2`

---

## 1. 개요

환자별 수액 주입 속도(cc/hr)와 낙하 속도(gtt/min)를 자동 계산하여 Brother b-PAC SDK 기반 라벨 프린터로 출력하는 시스템입니다. 간호 스테이션의 환자 상세 모달에서 즉시 인쇄가 가능하며, 속도 변경 시 새 라벨 재인쇄를 강제하는 안전 규칙을 포함합니다.

---

## 2. 핵심 비즈니스 규칙 (SSOT: CRITICAL_LOGIC §4.2)

### 2.1 표준 단위
- **기준 단위**: 모든 수액 주입 속도는 **cc/hr** 단위를 사용한다.

### 2.2 속도 환산 공식
| 수액 세트 종류 | gtt/min 계산 공식 | 비고 |
|---|---|---|
| **Micro set (60 gtt)** | gtt/min = cc/hr | 1:1 환산 |
| **Standard set (20 gtt)** | gtt/min = cc/hr ÷ 3 | 3:1 환산 |

### 2.3 안전 규칙
- **라벨 교체 필수**: 속도 변경 시 반드시 새 라벨지를 인쇄하여 수액백에 부착한다.
- **라벨 필수 포함 항목**:
  1. 환자 식별 정보 (마스킹 이름, 병실 번호, 환자번호(PID), 직접 입력 이름)
  2. 환자 인구통계 (SEX/AGE)
  3. 주입 설정 (메인 수액 종류, cc/hr, gtt/min)
  4. 혼합 약물 정보 및 AST 여부
  5. 검사 결과 내역 (CBC, LFT, Electrolyte, UA, B/Cx, Stool, Resp)
  6. 인쇄 시각 (KST 기준) 및 로고 (에코청소년과)

### 2.4 위계 및 단위 규칙 (2026-03-03 추가)
- **Fluid Hierarchy**: 'Base Fluid(메인 수액)'와 'Mixed Meds(부가 약물)'를 철저히 분리한다. 메인 수액은 대제목으로 표시되며, 약물은 하단 리스트로 구성된다.
- **Antibiotics Unit**: 항생제는 앰플(amp) 단위가 아닌 실무 용량(**mg**) 단위를 기본으로 사용한다.
- **Frequency**: 항생제 및 특정 약물의 경우 투여 빈도(**QD, BID, TID**) 정보를 포함할 수 있다.
- **Hybrid Input (2026-03-03)**: 혼합 약물은 드롭다운(Select)과 직접 입력(Input)이 결합된 하이브리드 방식으로 입력하며, 긴 약물 이름으로 인한 레이아웃 깨짐을 방지하기 위해 `min-w-0` 및 `flex-shrink-0` 설계를 준수한다.
- **Rapid Therapy Unit**: 급속 수액 요법은 주입 속도가 아닌 총 용량(**CC**)을 기준으로 관리한다.
- **Data Integrity**: PID(환자번호)는 숫자 이외의 입력을 제한하며, 최대 6자리(000000)를 준수한다.

---

## 3. 아키텍처

### 3.1 시스템 흐름

```
[간호 스테이션]
PatientDetailHeader.tsx
  └─ [수액 라벨지 인쇄] 버튼 클릭
       └─ IVLabelPreviewModal.tsx (미리보기 + 인쇄 요청)
            └─ Tauri invoke("print_iv_label", payload)
                 └─ [Rust 사이드 (src-tauri/)]
                      └─ b-PAC SDK (COM 인터페이스)
                           └─ .lbx 템플릿 기반 라벨 출력
```

### 3.2 레이어별 책임

| 레이어 | 파일 | 책임 |
|---|---|---|
| **UI (Main)** | `frontend/src/components/IVLabelPreviewModal.tsx` | 처방 위계(Base/Mix) 관리, 프리셋 제공, PID 입력 제한 |
| **UI (Components)** | `frontend/src/components/ui/Field.tsx` | 고밀도 UI 표준(h-12, p-3) 제공 |
| **진입점 (버튼)** | `frontend/src/components/PatientDetailHeader.tsx` | 모달 open 트리거 |
| **Tauri Bridge** | `frontend/src-tauri/src/commands/iv_label.rs` | Rust → b-PAC SDK 연동 |
| **템플릿** | `docs/templates/*.lbx` | Brother 라벨 레이아웃 (62mm 감열지 기준) |

### 3.3 고밀도 UI 설계 (High-Density UI)
- **표준 높이**: 모든 입력 필드 및 박스 높이를 **48px (h-12)**로 통일하여 시각적 일체감 확보.
- **수평 레이아웃**: 공간 효율을 위해 'Base Fluid 선택'과 'Infusion Rate 입력'을 7:5 비율의 한 줄(Grid)로 배치.
- **레이아웃 안정성**: 긴 약물 이름 입력 시 UI 깨짐 방지를 위해 `flex-1 min-w-0` 및 `flex-shrink-0` 설계를 적용.
- **포커스 유지**: 컴포넌트 재생성으로 인한 포커스 유실 방지를 위해 하위 컴포넌트(`MedSection`)와 헬퍼 함수를 외부 스코프로 추출.

### 3.3 모달 Z-Index 규칙
- **IVLabelPreviewModal**: `elevation="nested"` 적용 (z-index 3000/3100)
- 환자 상세 모달(z-index 2000/2100) 위에 정상 노출됨
- 참조: `CRITICAL_LOGIC §2.1`, `tailwind.config.js` z-index 토큰

---

## 4. 프론트엔드 구현

### 4.1 IVLabelPreviewModal.tsx 핵심 로직

```typescript
// Base Fluid & Rate 동적 바인딩
const fluidType = rapidRate > 0 
    ? (rapidBaseFluid || 'RAPID') 
    : (maintBaseFluid || 'MAINTENANCE');

// 약물 데이터 구조 확장 (MixedMed)
interface MixedMed {
    id: string;
    name: string;
    amount: number;
    unit?: string;             // amp | mg (항생제는 mg 기본)
    frequency?: 'QD' | 'BID' | 'TID'; // 투여 빈도
}

// 데이터 포맷팅 (라벨 인쇄용)
const formatMeds = (meds: MixedMed[]) => 
    meds.map(m => `${m.name} ${m.amount}${m.unit}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ');
```

### 4.2 메모리 누수 방지 (CRITICAL_LOGIC §5.1 준수)
- `successTimerRef`: 인쇄 완료 후 성공 메시지 타이머 ID 보관
- `useEffect` cleanup: `clearTimeout(successTimerRef.current)` 호출
- 참조: memory.md [2026-03-03 메모리 누수 수정 - IVUploadForm.tsx]

---

## 5. Tauri / Rust 사이드

### 5.1 의존성 (Cargo.toml)
```toml
[dependencies]
windows = { version = "...", features = ["Win32_System_Com"] }
```

### 5.2 b-PAC SDK COM 연동 원칙
- b-PAC SDK는 **COM 인터페이스**를 사용하므로 Rust의 `windows` 크레이트를 통한 연동이 필수.
- COM 초기화: 각 Tauri command 진입 시 `CoInitializeEx` 호출, 종료 시 `CoUninitialize` 호출.
- `.lbx` 템플릿 경로는 `docs/templates/` 하위에 보관.

---

## 6. 템플릿 관리

- **위치**: `docs/templates/*.lbx`
- **형식**: Brother b-PAC SDK 전용 라벨 레이아웃 파일
- **변경 방법**: Brother P-touch Editor로 편집 후 `docs/templates/`에 저장

---

## 7. 검증 체크리스트

수액 라벨 시스템 수정 시 반드시 확인:

- [ ] **속도 환산 정확도**: Micro(1:1) / Standard(1:3) 공식이 올바르게 적용되는지 확인
- [ ] **KST 시각**: 인쇄 시각이 `dateUtils.ts`의 KST 헬퍼를 통해 출력되는지 확인
- [ ] **환자명 마스킹**: 라벨에 `display_name`(마스킹된 이름) 사용 여부 확인
- [ ] **Z-Index**: IVLabelPreviewModal이 환자 상세 모달 위에 노출되는지 확인
- [ ] **메모리 누수**: 타이머 ref cleanup이 `useEffect`에 등록되어 있는지 확인

---

## 8. 관련 문서

- `docs/CRITICAL_LOGIC.md §4.2` — 속도 환산 공식 및 안전 규칙 (SSOT)
- `docs/CRITICAL_LOGIC.md §5.1` — 메모리 누수 방지 패턴
- `docs/TROUBLESHOOTING.md` — Z-Index 이슈 해결 이력
- `docs/memory.md` — 구현 이력 (2026-03-02 23:35 KST ~)
