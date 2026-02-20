# Security Review Protocol

본 문서는 **Eco-Pediatrics** 프로젝트의 배포 전 필수 보안 점검 절차를 정의합니다. 모든 배포(Staging/Production) 전 본 문서의 체크리스트를 통과해야 합니다.

---

## 1. Automated Security Check

가장 먼저 자동화 스크립트를 실행하여 기본 보안 위반 사항을 점검합니다.

```cmd
eco check
```

### 점검 항목
1. **Git Leaks**: `.env`, `.pem`, `service-account.json` 등 민감 파일이 Git에 추적되고 있는지 검사.
2. **Debug Code**: `print()`, `console.log()`, `debugger` 등 개발용 코드가 소스에 남아있는지 검사.
   - *단, `scripts/`, `tests/` 폴더 및 `debug_*.py`, `check_*.py` 등 유틸리티 파일은 검사에서 제외됩니다.*
3. **RLS Policy**: Supabase 테이블에 RLS(Row Level Security) 정책이 활성화되어 있는지 (마이그레이션 파일 기준) 검사.

---

## 2. Manual Review Checklist (Critical)

자동화 도구로 검출할 수 없는 비즈니스 로직 보안 사항입니다. **`docs/CRITICAL_LOGIC.md`**를 기준으로 검토하세요.

### 인증 및 권한 (Auth & AuthZ)
- [ ] **Access Token**: 입원 시 생성된 UUID 토큰이 유출되지 않도록 `mask_name` 등 UI 마스킹이 적용되었는가?
- [ ] **RLS Bypass**: `SECURITY DEFINER` 함수(`rpc`) 사용 시, 내부에서 엄격한 권한 체크(예: 관리자 여부)를 수행하는가?
- [ ] **Session Termination**: 퇴원/전실 시 해당 환자의 토큰이 즉시 만료(또는 조회 불가) 처리되는가?

### 데이터 프라이버시 (Privacy)
- [ ] **PII Masking**: 환자 리스트 조회 시 실명(`patient_name`)이 아닌 마스킹 된 이름(`patient_name_masked`)을 우선 사용하는가?
- [ ] **Log Sanitization**: 서버 로그(`logs/`)에 주민등록번호나 전화번호 등 PII가 평문으로 기록되지 않는가?

### 인프라 보안 (Infrastructure)
- [ ] **CORS**: `main.py`의 `ALLOW_ORIGINS` 설정이 프로덕션 도메인으로 제한되어 있는가? (Wildcard `*` 금지)
- [ ] **Supabase**: `anon` 키의 권한이 최소한으로 부여되었는가? (Public Table의 쓰기 권한 제한)

---

## 3. Incident Response

보안 사고 발생 시 대응 절차입니다.

1. **즉시 차단**: Supabase 대시보드에서 해당 `access_token` 또는 API Key를 Revoke 합니다.
2. **로그 분석**: `logs/backend.log` 및 Supabase 접근 로그를 분석하여 유출 경로를 파악합니다.
3. **핫픽스 배포**: 취약점을 패치하고 `eco check`를 통과한 후 긴급 배포합니다.
