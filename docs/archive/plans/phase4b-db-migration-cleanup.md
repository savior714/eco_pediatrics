# 🗺️ Project Blueprint: Phase 4-B — DB 뷰 보안 강화 & 마이그레이션 정리
> 생성 일시: 2026-03-12 | 상태: 설계 승인 대기

## 🎯 Architectural Goal
- 미적용 마이그레이션 파일(`20260311_fix_view_security_invoker.sql`) Supabase에 반영
- `SECURITY DEFINER` → `SECURITY INVOKER` 전환으로 RLS 정책이 쿼리 실행자 기준 적용되도록 수정
- `supabase/migrations/` + `backend/` 내 산재된 임시 SQL 파일 정리
- `recorded_at`, `admission_id` 인덱스 존재 확인 및 누락 시 추가

---

## 🛠️ Step-by-Step Execution Plan

### 📦 Task List

- [ ] **Task 1: 미적용 마이그레이션 반영 확인 및 적용**
  - **Goal**: `20260311_fix_view_security_invoker.sql`을 Supabase에 적용하여 뷰 보안 문제 해결
  - **Context**: `supabase/migrations/20260311_fix_view_security_invoker.sql`
  - **Implementation**:
    - [ ] 파일 내용 최종 검토 (현재 내용 요약):
      - `DROP VIEW IF EXISTS view_station_dashboard CASCADE`
      - `CREATE VIEW view_station_dashboard WITH (security_invoker = true) AS ...`
      - `GRANT SELECT ON view_station_dashboard TO authenticated, anon`
    - [ ] `supabase db push` 또는 Supabase Dashboard SQL Editor에서 직접 실행
    - [ ] 적용 후 `view_station_dashboard` 쿼리 정상 동작 확인
  - **Pseudocode**:
    ```bash
    # Supabase CLI 사용 시
    supabase db push
    # 또는 Dashboard > SQL Editor에서 파일 내용 붙여넣기
    ```
  - **Dependency**: None
  - **Verification**: Supabase Dashboard에서 `SELECT * FROM view_station_dashboard LIMIT 1` 정상 반환 확인

- [ ] **Task 2: backend/ 내 임시 SQL 파일 정리**
  - **Goal**: `backend/` 루트에 방치된 임시 SQL/스크립트 파일을 정리하거나 아카이브로 이동
  - **Context**: `backend/` 루트 (`add_delete_policies.sql`, `cleanup_database.sql`, `fix_audit_log_type.sql`, `fix_document_requests_rls.sql`, `fix_policy.sql` 등)
  - **Implementation**:
    - [ ] 각 파일의 적용 여부 확인:
      - 이미 `supabase/migrations/`에 반영된 파일 → 삭제 대상
      - 미적용이나 참고용으로 보존 필요한 파일 → `backend/scripts/sql_archive/`로 이동
    - [ ] `backend/` 루트에 `.py` 파일 아닌 `.sql` 파일이 남지 않도록 정리
    - [ ] `full_scan_report.txt`, `scan_results.txt`, `test_fail_report.txt`, `test_report.txt`, `test_results.txt`, `verify_output.txt` → 삭제 (임시 출력 파일)
  - **Pseudocode**:
    ```
    for each *.sql in backend/:
        check if applied to supabase/migrations/
        if yes → delete
        if no  → move to backend/scripts/sql_archive/
    ```
  - **Dependency**: None (Task 1과 병렬 진행 가능)
  - **Verification**: `ls backend/*.sql` → 결과 없음 / `ls backend/*.txt` → 결과 없음

- [ ] **Task 3: supabase/migrations/ 구조 정리**
  - **Goal**: 마이그레이션 파일 간 중복 없음 확인 및 네이밍 컨벤션 통일
  - **Context**: `supabase/migrations/` 하위 전체 파일
  - **Implementation**:
    - [ ] 현재 파일 목록 검토:
      ```
      20260215_add_demographics.sql
      20260220_enable_rls_all.sql
      20260222_iv_records_infusion_rate_numeric.sql
      20260222_view_token_expires_fix.sql
      20260223_attending_physician.sql
      20260223_backfill_attending_physician.sql
      20260311_fix_view_security_invoker.sql  ← 신규 (Task 1)
      ```
    - [ ] 각 파일이 `CREATE OR REPLACE` vs `DROP ... CASCADE` 패턴 중 무엇을 사용하는지 검토
    - [ ] `DROP ... CASCADE` 사용 파일 → 안전한 `CREATE OR REPLACE` 패턴으로 전환 가능 여부 주석 추가
  - **Dependency**: Task 1 완료 후
  - **Verification**: `supabase db push --dry-run` 오류 없음 확인 (또는 수동 검토)

- [ ] **Task 4: 성능 인덱스 확인 및 추가**
  - **Goal**: `view_station_dashboard`가 사용하는 핵심 컬럼에 인덱스 존재 여부 확인
  - **Context**: Supabase Dashboard > Table Editor / SQL Editor
  - **Implementation**:
    - [ ] `vital_signs(admission_id, recorded_at DESC)` 복합 인덱스 확인
    - [ ] `iv_records(admission_id, created_at DESC)` 복합 인덱스 확인
    - [ ] `meal_requests(admission_id, created_at DESC)` 복합 인덱스 확인
    - [ ] `admissions(status)` 인덱스 확인 (`WHERE status IN ('IN_PROGRESS', 'OBSERVATION')`)
    - [ ] 누락 인덱스 → `supabase/migrations/20260312_add_performance_indexes.sql` 생성
  - **Pseudocode**:
    ```sql
    -- 확인 쿼리
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('vital_signs', 'iv_records', 'meal_requests', 'admissions');

    -- 누락 시 추가
    CREATE INDEX IF NOT EXISTS idx_vital_signs_admission_recorded
      ON vital_signs (admission_id, recorded_at DESC);
    ```
  - **Dependency**: None
  - **Verification**: `EXPLAIN ANALYZE SELECT * FROM view_station_dashboard` → Seq Scan 없이 Index Scan 사용 확인

- [ ] **Task 5: backend/migrations/ vs supabase/migrations/ 이중 관리 정리**
  - **Goal**: `backend/migrations/` 디렉토리(존재 시) 내용을 `supabase/migrations/`로 통합
  - **Context**: `backend/migrations/` (존재 여부 확인 필요)
  - **Implementation**:
    - [ ] `backend/migrations/` 존재 시 → 파일 목록 확인
    - [ ] `supabase/migrations/`에 없는 파일 → 이전 여부 판단 후 이전 또는 삭제
    - [ ] SSOT를 `supabase/migrations/`로 단일화
  - **Dependency**: Task 2, 3 완료 후
  - **Verification**: 마이그레이션 파일이 `supabase/migrations/`에만 존재

---

## ⚠️ 기술적 제약 및 규칙 (SSOT)

- **CASCADE 위험**: `DROP VIEW IF EXISTS ... CASCADE`는 의존 뷰/함수까지 삭제. 적용 전 의존 객체 목록 확인 필수.
- **RLS 검증**: `SECURITY INVOKER` 전환 후 `authenticated` role로 쿼리 시 RLS 정책 정상 적용 확인.
- **마이그레이션 순서**: Supabase는 파일명 타임스탬프 순으로 적용. 신규 파일은 `YYYYMMDD_` 프리픽스 유지.
- **Idempotency**: 모든 마이그레이션 SQL은 `IF EXISTS` / `IF NOT EXISTS` 사용하여 재실행 안전하게 작성.

## ✅ Definition of Done

1. [ ] `view_station_dashboard` → `security_invoker = true` 적용 완료
2. [ ] `backend/` 루트 임시 SQL/txt 파일 제거
3. [ ] `supabase/migrations/` 파일 7개 이상, 중복 없음
4. [ ] 핵심 컬럼 인덱스 존재 확인 완료 (누락 시 마이그레이션 추가)
