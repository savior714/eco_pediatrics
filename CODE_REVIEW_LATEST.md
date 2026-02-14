# 최신 기준 전체 리뷰 (LOCAL HEAD: 현재 작업본)

## 1) Objective
- 최신 푸시 상태를 기준으로 전체 구조를 재점검하고, 현재 장애(`GET /api/v1/admissions` 500) 원인과 즉시 수정 포인트를 명확히 제시.
- 추가 요구사항 반영:
  1) 식사 신청 실무형 모델(환아식 + 보호자식)
  2) 병실별 엑셀 스타일 비고란
  3) 최근 6시간 38도 이상 강조 로직

---

## 2) Architecture Decisions

### 우선순위 분류 (High / Medium / Low)

#### High
1. **`/api/v1/admissions` 장애 원인 즉시 수정**
   - 로그의 핵심 원인: `vital_signs.created_at` 컬럼 참조.
   - 스키마상 vital timestamp는 `recorded_at`만 존재.
   - 따라서 발열/최근 vital 조회는 전부 `recorded_at` 기준으로 통일 필요.

2. **STATION WebSocket 브로드캐스트 결함 수정**
   - `station_connections` 미초기화 참조 제거.
   - `active_connections[token]` 단일 경로로 브로드캐스트.

3. **입원 수속 실패 체감 이슈 완화**
   - admissions 목록 API가 500이면 프론트에서 입원 직후 반영이 깨져 "입원 처리 안 됨"처럼 보임.
   - 목록 API 안정화 + 프론트 fallback 처리가 선행 필요.

#### Medium
1. **환자명 API contract drift** (`patient_name` vs `patient_name_masked`)
2. **병실 dedupe 정확성 개선** (UUID 문자열 비교 제거)
3. **식사 도메인 확장 준비** (환아/보호자, 죽 단계, 비고란)

#### Low
1. 업로드 MIME/용량 검증 강화
2. CORS allowlist 정교화
3. 콘솔 로그/미사용 import 정리

---

## 3) Pseudocode by Phase

### Phase A — 장애 핫픽스
```pseudo
GET /admissions:
  for each admission:
    latest_vitals = vital_signs.order(recorded_at desc)
    latest_temp = latest_vitals[0]?.temperature
    had_fever_in_6h = any(v.temperature >= 38 and v.recorded_at >= now-6h)

websocket.broadcast(token):
  iterate active_connections[token] only
```

### Phase B — 데이터 계약/정확성
```pseudo
frontend patientName = admission.patient_name || admission.patient_name_masked
backend dedupe: compare check_in_at desc (not id string)
```

### Phase C — 식사 신청 도메인 실무 반영
```pseudo
meal_request fields:
  pediatric_meal_type: GENERAL | SOFT_1 | SOFT_2 | SOFT_3
  guardian_meal_type: GENERAL | NONE
  room_note: string (optional)  # 예: "315-2호실로"

station excel-like grid:
  rows=room, cols=[환아식, 보호자식, 비고]
```

### Phase D — 고도화
```pseudo
add validation + audit + websocket sync
```

---

## 4) Risk / Rollback
- `recorded_at` 정렬 수정은 저위험 핫픽스이며 즉시 롤백 가능(단일 파일 중심).
- 식사 도메인 확장은 DB 스키마 포함이므로 단계적 롤아웃(필드 optional -> required 전환) 권장.
- 입원 수속 체감 문제는 admissions 500 재발 시 다시 나타나므로 우선 모니터링 지표 포함 필요.

---

## 5) Done Criteria (테스트/검증 체크리스트)
- [x] `/api/v1/admissions` 200 정상 응답, `vital_signs.created_at` 관련 에러 0건
- [x] 입원 생성 후 스테이션 그리드에서 즉시 환자 반영
- [x] 최근 6시간 발열 환자 카드만 붉은 테두리
- [x] WebSocket STATION 채널에서 알림/IV 이벤트 누락 없음
- [x] 식사 요청 데이터에 환아식/보호자식/비고 필드 확장 설계 확정 (구현 완료)
- [x] Phase G: Refactoring (Meals Router, Schema Update, MealGrid Props) 완료

---

## 6) Antigravity IDE 전달용 Prompt Block
```text
[핫픽스 우선]
1) backend/routers/admissions.py에서 vital 조회 정렬을 created_at -> recorded_at로 통일하고,
   had_fever_in_6h/latest_temp/last_vital_at 필드를 응답에 넣어줘.
2) backend/websocket_manager.py에서 station_connections 참조를 제거하고,
   active_connections[token] 단일 브로드캐스트 로직으로 정리해줘.
3) frontend/hooks/useStation.ts와 app/station/page.tsx에서
   had_fever_in_6h 우선으로 카드 fever 테두리 표시되게 반영해줘.
4) frontend/hooks/useVitals.ts에서 patient_name 없을 때 patient_name_masked fallback 처리해줘.

[다음 기능 설계]
5) 식사 신청 모델을 환아식(GENERAL/SOFT_1/SOFT_2/SOFT_3) + 보호자식(GENERAL/NONE) + 비고(room_note)로 확장하는
   API/DB 초안도 함께 작성해줘.
```
