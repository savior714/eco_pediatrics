# 전실 후 식단 관리 비고 사라짐 — 다른 LLM용 분석 요청 프롬프트

## 복사용 블록 (다른 LLM에 그대로 전달)

```
[분석 요청: 전실(병실 이동) 후 식단 관리 UI의 비고(room_note)가 사라지는 현상]

## 컨텍스트
- 프로젝트: eco_pediatrics (소아과 스테이션 대시보드). 환자 전실 시 admissions.room_number만 변경되고, meal_requests는 admission_id로만 연결됨.
- 전실 처리: POST /api/v1/admissions/{admission_id}/transfer (target_room). 백엔드 RPC transfer_patient_transaction는 admissions 테이블의 room_number만 UPDATE. meal_requests 테이블은 수정하지 않음.
- 비고 저장: meal_requests.room_note (TEXT). 식단 그리드(MealGrid)에서는 "비고" 컬럼이 한 행당 하나만 있고, 현재 LUNCH 시간대의 room_note를 해당 행의 비고 값으로 표시·저장함 (defaultValue={matrix[bed.id]?.['LUNCH']?.room_note}, handleUpdate(..., 'LUNCH', 'room_note', value)).
- 식단 데이터 조회:
  - 스테이션 전체 식단 그리드: GET /api/v1/meals/matrix?target_date=YYYY-MM-DD → meal_requests에서 meal_date 일치하는 전부 반환 (room/admission 필터 없음). 프론트는 응답을 admission_id → meal_time → MealRequest 형태의 matrix로 구성하고, patients(beds) 순으로 행을 그림. 행 key는 bed.room.
  - 환자 서브모달 내 식단: 해당 환자의 vitalsData.meals (admission token 기반 대시보드 API).

## 관찰된 현상
- 사용자가 환자를 전실시킨 후, 식단 관리 UI에서 해당 환자의 비고(room_note) 내용이 유지되지 않고 사라진 것처럼 보임. (데이터가 옮겨가야 하는데 사라짐.)

## 요청 사항
1. **원인 분석**: 전실은 admission_id를 바꾸지 않고 room_number만 바꾸므로, DB 상으로는 해당 admission_id의 meal_requests(및 room_note)가 그대로 있어야 함. 그럼에도 비고가 "사라진다"면, (a) 백엔드/쿼리에서 전실된 admission을 제외하는 조건이 있는지, (b) 프론트에서 matrix 구성 시 전실 직후 beds/patients 갱신 순서·의존성으로 인해 해당 admission_id가 matrix에 누락되거나 덮어쓰여지는지, (c) 식단 그리드 행이 bed.room 기준 key라서 전실 시 행이 바뀌는 과정에서 상태/refetch 타이밍 문제가 있는지 등을 추적해 주세요.
2. **해결 방향 제안**: 원인에 맞춰, 비고(room_note)가 전실 후에도 동일 환자(admission)에 대해 그대로 노출·유지되도록 수정할 수 있는 구체적 방법(백엔드/프론트 변경 포인트, 필요한 경우 데이터 모델·API 계약)을 제안해 주세요.
3. **출력**: 가설(가능한 원인 1·2·3), 검증 방법(어디에 로그/브레이크포인트를 두면 확인할 수 있는지), 권장 수정 사항을 단계별로 정리해 주세요.
```

---

## 참고: 관련 파일 위치

| 구분 | 경로 | 참고 내용 |
|------|------|-----------|
| 전실 RPC | `supabase/schema.sql` 또는 마이그레이션 | `transfer_patient_transaction`: admissions.room_number만 UPDATE |
| 식단 matrix API | `backend/services/meal_service.py` | `get_meal_matrix`: meal_date만 조건, admission_id/room 필터 없음 |
| 식단 그리드 UI | `frontend/src/components/MealGrid.tsx` | matrix는 admission_id 기준, 행은 patients 순, 행 key는 `bed.room`, 비고는 LUNCH의 room_note |
| 전실 호출·갱신 | `frontend/src/hooks/usePatientActions.ts` | handleTransfer 성공 시 onClose(), onStationRefresh() 호출 |
| 환자 목록 | `frontend/src/hooks/useStation.ts` | fetchAdmissions로 beds 갱신, 전실 후 해당 환자는 새 room_number로 같은 id로 존재 |

위 프롬프트만으로 다른 LLM이 전실 후 비고 소실 원인을 추적하고 수정 방안을 제안할 수 있도록 구성함.

---

## 해결 반영 (2026-02-23)

- **원인**: 비제어 `defaultValue` + 전실 시 `bed.room` 기반 행 리마운트로 뷰-상태 불일치, LUNCH 단일 의존으로 레코드 없을 때 유실.
- **적용**: `MealGrid.tsx`에 `RoomNoteInput` 제어 컴포넌트 추가, LUNCH/BREAKFAST/DINNER 폴백 읽기·저장. 상세는 `docs/CHANGELOG.md` §2026-02-23, `docs/SESSION_2026-02-23.md` §7 참고.
