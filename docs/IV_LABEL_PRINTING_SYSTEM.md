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
  1. 환자 식별 정보 (마스킹 이름, 병실 번호)
  2. 주입 속도 (cc/hr 및 gtt/min 동시 표기)
  3. 인쇄 시각 (KST 기준)

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
| **UI (미리보기)** | `frontend/src/components/IVLabelPreviewModal.tsx` | 속도 입력, 환산 표시, 인쇄 요청 |
| **진입점 (버튼)** | `frontend/src/components/PatientDetailHeader.tsx` | 모달 open 트리거 |
| **Tauri Bridge** | `frontend/src-tauri/src/commands/iv_label.rs` | Rust → COM 연동 |
| **SDK 통신** | Rust (`windows` 크레이트) | b-PAC SDK COM 인터페이스 호출 |
| **템플릿** | `docs/templates/*.lbx` | Brother 라벨 레이아웃 |

### 3.3 모달 Z-Index 규칙
- **IVLabelPreviewModal**: `elevation="nested"` 적용 (z-index 3000/3100)
- 환자 상세 모달(z-index 2000/2100) 위에 정상 노출됨
- 참조: `CRITICAL_LOGIC §2.1`, `tailwind.config.js` z-index 토큰

---

## 4. 프론트엔드 구현

### 4.1 IVLabelPreviewModal.tsx 핵심 로직

```typescript
// 속도 환산 계산 (CRITICAL_LOGIC §4.2 기준)
const calculateGtt = (ccPerHr: number, setType: 'micro' | 'standard'): number => {
    if (setType === 'micro') return ccPerHr;          // 60 gtt: 1:1
    return Math.round(ccPerHr / 3);                   // 20 gtt: 3:1
};

// 인쇄 요청 (Tauri invoke)
const handlePrint = async () => {
    await invoke('print_iv_label', {
        patientName: vitals.display_name,
        roomNumber: vitals.room_number,
        ccPerHr: inputCcPerHr,
        gttPerMin: calculateGtt(inputCcPerHr, selectedSetType),
        printedAt: getKSTNow(),  // dateUtils.ts KST 헬퍼 사용
    });
};
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
