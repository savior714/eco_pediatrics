# 원장님 이니셜 표시 불일치 — 다른 LLM용 분석·대응 프롬프트

## 1. 원인 분석 (이 프로젝트 기준)

**현상**: 스테이션 대시보드에서 어떤 환자 카드는 QR 버튼 왼쪽에 원장님 이니셜(예: 김, 조)이 보이고, 어떤 환자는 보이지 않음.

**근본 원인**:

- **프론트엔드**: `PatientCard.tsx`에서 `bed?.attending_physician`이 있을 때만 이니셜 박스를 렌더링함 (`{bed?.attending_physician && (...)}`). 즉, **데이터 유무에만 의존**하며, 표시 로직 자체는 동일함.
- **데이터 차이**:
  - **이니셜이 보이는 환자(예: 304호, 310-1호)**: 입원 수속 시점에 `attending_physician` 기능이 적용된 이후로 등록되었거나, DB에 해당 컬럼이 채워진 레코드. API(`view_station_dashboard` → `/api/v1/admissions`) 응답에 `attending_physician` 값이 포함됨.
  - **이니셜이 안 보이는 환자(예: 303호)**: `attending_physician` 컬럼 추가 **이전**에 입원 처리된 레코드이거나, 마이그레이션/뷰 갱신 전 데이터. DB에 `attending_physician`이 `NULL`/빈 값이라 API 응답에 없고, 프론트는 그대로 표시하지 않음.

**정리**: “레거시(기능 도입 전 입원) vs 신규(기능 도입 후 입원)” 데이터 차이로 인한 표시 불일치이며, UI 버그가 아님.

---

## 2. 다른 LLM에게 전달할 프롬프트 (복사용)

아래 블록 전체를 복사해 다른 LLM 에이전트에게 전달하세요.

```
[분석 요청: 원장님(attending_physician) 이니셜 표시 불일치]

## 컨텍스트
- 프로젝트: 소아과 스테이션 대시보드(eco_pediatrics). 입원 환자별로 담당 원장님(attending_physician)을 지정하는 기능을 최근 도입함.
- 구현 내용:
  1. DB: admissions 테이블에 attending_physician (TEXT) 컬럼 추가, view_station_dashboard 뷰 SELECT에 해당 컬럼 포함.
  2. 백엔드: AdmissionCreate/응답 스키마에 attending_physician 반영, create_admission 시 INSERT, list_admissions는 view_station_dashboard 기반으로 enriched 응답에 attending_physician 포함.
  3. 프론트: 입원 수속 폼에서 원장님 선택(조요셉/김종률/원유종/이승주), PatientCard에서 bed.attending_physician이 있을 때만 QR 버튼 왼쪽에 첫 글자(이니셜) 박스 렌더링.

## 관찰된 현상 (대시보드 스크린샷 기준)
- 303호 (이*령): QR 버튼 옆에 원장님 이니셜 없음.
- 304호 (조*): 이니셜 "김" 표시됨.
- 310-1호 (이*주): 이니셜 "조" 표시됨.

## 요청 사항
1. **가설 확인**: 위 불일치의 원인이 "기능 도입 전 입원(attending_physician NULL) vs 도입 후 입원(값 존재)" 데이터 차이 때문인지 확인해 주세요. 프론트는 bed.attending_physician 존재 시에만 이니셜을 그리도록 되어 있음.
2. **다음 단계 제안**: 가설이 맞다면, 아래 중 필요한 것을 구체적으로 제안해 주세요.
   - 기존 입원 레코드에 대한 DB 백필: 기본 원장님 또는 배치로 담당 원장 할당하는 마이그레이션/스크립트.
   - 프론트: attending_physician이 NULL/빈 값일 때 "담당의 미지정" 등 대체 표기로 일관된 UX 제공.
   - 그 외 데이터 정합성·UI 일관성을 위한 권장 조치.
3. **출력 형식**: 가설 검증 결과(1문단), 권장 조치 목록(번호별), 선택 시 적용할 수 있는 코드/스크립트 예시나 수정 위치(파일·함수명)를 포함해 주세요.
```

---

## 3. 참고: 이 프로젝트 내 관련 위치

- **프론트 표시 조건**: `frontend/src/components/PatientCard.tsx` — `bed?.attending_physician &&` 블록.
- **API 데이터 매핑**: `backend/services/admission_service.py` — `list_active_admissions_enriched` 내 `attending_physician: item.get('attending_physician')`.
- **뷰/스키마**: `supabase/migrations/20260223_attending_physician.sql` — `admissions.attending_physician`, `view_station_dashboard`, RPC.

위 프롬프트만으로도 다른 LLM이 원인 확인과 백필/UI 개선 제안을 할 수 있도록 구성되어 있음.
