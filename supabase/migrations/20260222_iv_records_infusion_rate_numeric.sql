-- iv_records.infusion_rate: INTEGER -> NUMERIC
-- 수액 주입 속도(cc/hr)는 정밀 계산 결과로 소수점 발생 가능.
-- 22P02 (invalid input syntax for type integer) 방지.

ALTER TABLE iv_records
ALTER COLUMN infusion_rate TYPE NUMERIC USING infusion_rate::NUMERIC;
