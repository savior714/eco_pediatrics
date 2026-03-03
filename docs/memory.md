# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다. `docs/CRITICAL_LOGIC.md`가 비즈니스 규칙의 SSOT라면, `memory.md`는 작업 맥락과 아키텍처 결정 이력의 SSOT 역할을 합니다.

**주요 프로젝트 마일스톤 및 아카이브:**
- **UV Native 환경 전환 (2026-03-01)**: `pip` 중단, `uv` 및 `.venv` 중심 의존성 관리 표준화.
- **Ark UI 도입 및 전면 마이그레이션 (2026-03-02)**: Headless UI 표준 채택 및 모달/컴포넌트 인프라 재구축 완료.
- **시스템 안정화 및 최적화 (2026-03-03)**: WebSocket 재연결 루프 방지, httpx Retry 가드, Windows Terminal 3-Pane 레이아웃(`scripts/launch_wt_dev.ps1`) 확립.
- **수액 라벨 인쇄 시스템 (2026-03-03)**: cc/hr 자동 계산, 4대 분류(Rapid/Maint/Anti/Other) 입력 체계, Brother b-PAC SDK 연동 및 WYSIWYG 미리보기 구현.
- **실무 최적화 고밀도 UI (2026-03-03)**: 모든 입력 요소 48px(h-12) 높이 표준화, 섹션별 독립 약물 프리셋 도입, IM/Vitamin D 등 병동 특화 필드 반영.
- **문서 체계 일원화**: 파편화된 실무 문서를 `memory.md`로 통합 관리. (현재 줄 수: 35/200)

---

## Logs

### [2026-03-03 KST] - 과거 로그 압축 및 UI/UX 실무 고도화 완료

[Context]
- memory.md 200줄 도달에 따른 아카이빙 및 압축 수행.
- 수액 라벨 처방 UI의 균형감 개선 및 병동 실무 요구사항(프리셋, IM 추가 등) 반영.

[Action]
- **Executive Summary**: 2026-03-01~03-03 기간의 핵심 성과(UV, Ark UI, IV System, Stability)를 요약 반영.
- **IVLabelPreviewModal.tsx**: 
  1. 입력 필드 및 박스 높이 48px(h-12)로 통일, 수직 간격(`space-y-4`) 조절로 균형 확보.
  2. 섹션별 프리셋 독립화: Rapid(NS, HS), Maint(5DS, 1:4), Anti(3종), Other(Vitamin D).
  3. 기타 약물 타이틀에 'IM' 추가.
- **Field.tsx**: 전역 패딩 축소(p-3)로 컴팩트한 디자인 적용.

[Status]
- 완료. UI 일체감 및 실무 편의성 대폭 향상.

[Technical Note]
- 고밀도 UI 표준(h-12, p-3)을 확립하여 향후 유사 모달 구현 시의 일관성 가이드로 활용.
- `memory.md` 초기화로 컨텍스트 윈도우 효율성 개선.
- 현재 docs/memory.md 줄 수: 40/200

### [2026-03-03]
[Context] 항생제의 임상 투여 단위(mg) 및 투여 빈도(QD/BID/TID) 관리 요구 반영.
[Action] 
- IVLabelPreviewModal.tsx: 
  1. MixedMed 인터페이스 확장: unit(단위), frequency(투여 빈도) 필드 추가.
  2. addMed 헬퍼 함수가 unit을 인자로 받아 초기화하도록 수정.
  3. MedSection 컴포넌트: unit 및 showFrequency 옵션 추가. 항생제 섹션에서 이를 활성화(unit="mg", frequency=true).
  4. 약물 아이템 UI: 주입 빈도 선택용 버튼 그룹(QD, BID, TID, STAT) 추가 및 활성화 상태 스타일링.
  5. 데이터 포맷팅: formatMeds 수정으로 mg 단위와 빈도 정보가 라벨 텍스트에 포함되도록 개선.
[Status] 완료 (1/1)
[Technical Note] 
- 항생제는 앰플 단위보다 용량(mg) 중심 관리가 중요하므로 UI 단위를 커스터마이징 가능하게 설계함.
- 빈도 정보를 MixedMed 상태에 통합하여 라벨 미리보기 및 인쇄 데이터의 정합성을 확보함.
- 현재 docs/memory.md 줄 수: 54/200

### [2026-03-03]
[Context] 항생제 투여 빈도 옵션 정제.
[Action] 
- IVLabelPreviewModal.tsx: 임의로 포함되었던 'STAT' 옵션을 제거하고 'QD', 'BID', 'TID' 3종으로만 제한. MixedMed 인터페이스도 이에 맞춰 수정.
[Status] 완료 (1/1)
[Technical Note] 
- 사용자 요청 사항에 충실하도록 불필요한 임상 용어를 배제함.
- 현재 docs/memory.md 줄 수: 58/200

### [2026-03-03]
[Context] 환자번호(PID) 입력 필드 데이터 무결성 강화.
[Action] 
- IVLabelPreviewModal.tsx: PID 입력 필드(Field)의 onChange 핸들러에 정규식을 추가하여 숫자 이외의 문자 입력을 차단하고, 최대 길이를 6자리로 제한함. inputMode="numeric" 속성을 추가하여 모바일 환경에서도 숫자 키패드가 활성화되도록 개선.
[Status] 완료 (1/1)
[Technical Note] 
- e.target.value.replace(/[^0-9]/g, '') 패턴을 사용하여 한글/영문 등 비숫자 문자의 유입을 물리적으로 차단함.
- 현재 docs/memory.md 줄 수: 63/200

### [2026-03-03]
[Context] 급속/유지 수액 처방 워크플로우를 실무 멘탈 모델(메인 수액 + 부가 약물)에 맞게 리팩토링.
[Action] 
- IVLabelPreviewModal.tsx: 
  1. rapidBaseFluid, maintBaseFluid 상태 도입으로 메인 수액을 독립적으로 관리.
  2. MedSection 컴포넌트: setBaseFluid 프롭 유무에 따라 '메인 수액 선택(단일)' 또는 '믹스 약물 추가(다중)' 모드로 동작하도록 고도화.
  3. UI 로직: 메인 수액(NS, HS, 5DS, 1:4) 선택 시 체크 표시 및 강조 스타일 적용.
  4. 미리보기 연동: 라벨 상단 제목에 'RAPID INFUSION' 대신 선택된 메인 수액 명칭(예: NS)이 표시되도록 동적 바인딩. 약물이 없을 경우 'Pure', 있을 경우 'Mixed' 상태 표시 보완.
[Status] 완료 (1/1)
[Technical Note] 
- 수액 처방의 위계(Base vs Additive)를 UI 레이어에서 분리하여 처방 오류 가능성을 낮추고 직관성을 높임.
- 현재 docs/memory.md 줄 수: 74/200

### [2026-03-03]
[Context] 수액 처방 섹션 레이아웃 수평 최적화.
[Action] 
- IVLabelPreviewModal.tsx: 
  1. MedSection 레이아웃 변경: 메인 수액 선택(Base Fluid)과 주입 속코(Infusion Rate)를 grid-cols-12를 활용해 한 줄(7:5 비율)로 배치.
  2. 수액 선택 버튼 높이를 h-12로 상향하여 속도 입력 필드와 시각적 수평선 일치.
  3. 속도 입력 필드: ppearance-none 및 스핀 버튼 제거 스타일 적용으로 UI 깔끔하게 정돈.
  4. 공간 효율성: 주입 속도 라벨을 	racking-tighter로 조정하여 한 줄 배치 시의 여백 최적화.
[Status] 완료 (1/1)
[Technical Note] 
- 세로 스크롤을 줄이면서도 처방의 핵심 요소(수액 종류, 속도)를 수평적 위계로 재구성하여 가독성을 높임.
- 현재 docs/memory.md 줄 수: 84/200

### [2026-03-03]
[Context] 입력 필드 포커스 유실 버그(Character-by-character focus loss) 해결.
[Action] 
- IVLabelPreviewModal.tsx: 
  1. 버그 원인 파악: MedSection 컴포넌트가 IVLabelPreviewModal 내부 함수로 정의되어 렌더링마다 새로운 컴포넌트 타입이 생성(Unmount/Remount 발생)됨을 확인.
  2. 해결: MedSection 및 관련 헬퍼 함수(addMed, updateMed 등)를 컴포넌트 외부 상위 스코프로 추출.
  3. 코드 정돈: 중복 선언된 핸들러들을 제거하고 상태 전달 로직을 Props 기반으로 명확히 정립.
[Status] 완료 (1/1)
[Technical Note] 
- React에서 입력 필드 포커스 유실은 99% 컴포넌트의 가변적 정의(Nested components)에서 기인함. 이를 외부로 분리함으로써 DOM 안정성을 확보함.
- 현재 docs/memory.md 줄 수: 94/200
