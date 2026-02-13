# Troubleshooting

## 1. Next.js 빌드 캐시 이슈
- **문제**: `Cannot find module './vendor-chunks/lodash.js'` 에러 발생
- **원인**: Next.js 빌드 캐시 오염
- **해결**: `frontend/.next` 폴더를 삭제하고 다시 빌드하여 해결

## 2. 필수 에러 컴포넌트 누락
- **문제**: 런타임 중 에러 발생 시 앱이 크래시됨
- **해결**: `global-error.tsx` 및 `not-found.tsx`를 추가하여 안정성 확보

## 3. 배치 파일 구문 오류
- **문제**: `easy_start.bat` 실행 시 `&` 특수문자로 인해 명령어가 끊김
- **해결**: 배치 파일 내 `&`를 `^&`로 이스케이프 처리하여 해결

## 4. Supabase 스키마 캐시 동기화 (`PGRST204`, `PGRST205`)
- **문제**: 컬럼명 변경(`infusion_rate`) 또는 새 테이블(`document_requests`) 추가 후 API에서 인지하지 못함
- **해결**: SQL Editor에서 `COMMENT ON TABLE ...` 명령어로 주석을 달거나 `NOTIFY pgrst, 'reload schema';`를 실행하여 캐시 강제 갱신

## 5. RLS 정책 위반 (`42501`)
- **문제**: 데이터 삽입(INSERT) 시 `new row violates row-level security policy` 에러 발생
- **원인**: RLS는 활성화되었으나 허용 정책(`POLICY`)이 없음
- **해결**: `CREATE POLICY` 명령어로 `FOR INSERT` 권한을 부여하여 해결

## 6. pyiceberg / pyroaring 빌드 실패 (`io.h` 없음, Failed building wheel)
- **문제**: `pip install -r requirements.txt` 시 pyiceberg, pyroaring 빌드에서 `'io.h': No such file or directory` 등 C 컴파일 오류 발생
- **원인**: Supabase 클라이언트의 **storage3 2.26+** 버전이 pyiceberg를 의존성으로 추가함. pyiceberg는 C 확장을 빌드하며, Python 3.14/32비트나 Windows SDK 미설치 환경에서는 빌드가 실패함.
- **해결**:
  1. **supabase 버전 고정**: 이 프로젝트는 `supabase==2.25.0`으로 고정해 두었습니다 (storage3 2.25.0은 pyiceberg 미포함). 기존 `.venv`가 있다면 삭제한 뒤 `easy_start.bat`을 다시 실행하세요.
  2. **가상환경 사용**: `easy_start.bat`은 `backend\.venv`를 사용합니다. 전역 pip가 아닌 이 venv 안에서만 설치되므로, 위 버전 고정과 함께 사용하면 해당 오류를 피할 수 있습니다.
  3. **Python 버전**: **Python 3.11 또는 3.12 64비트** 사용을 권장합니다. 32비트나 3.14는 많은 패키지의 미리 빌드된 휠이 없어 컴파일이 필요할 수 있습니다.
  4. **Windows SDK**: 소스 빌드가 꼭 필요하다면, Visual Studio Installer에서 "C++를 사용한 데스크톱 개발" 및 Windows 10/11 SDK를 설치한 뒤 다시 시도하세요.

## 7. 검사 일정 추가가 안 됨 / 스테이션–입원 연동 (개발용 더미)

- **문제**: 스테이션에서 환자 클릭 후 "검사 일정 추가"를 눌러도 항목이 생성되지 않거나, "입원 정보가 연동되지 않아"만 보임.
- **원인**: 검사 일정은 **실제 입원(admission) ID**에만 연결됩니다. Supabase에 스테이션 병실 번호(301, 302, 310-1 등)와 일치하는 입원이 없으면 해당 병상에는 `admission_id`가 비어 있어 검사 추가가 불가합니다.
- **해결 (개발 환경)**  
  백엔드 실행 후 아래 API를 **한 번** 호출해 30개 병상에 해당하는 입원 더미를 생성하세요.
  ```bash
  curl -X POST http://localhost:8000/api/v1/seed/station-admissions
  ```
  또는 브라우저에서 `http://localhost:8000/docs` → `POST /api/v1/seed/station-admissions` → Execute.  
  이후 스테이션 페이지를 새로고침하면 모든 병상이 입원 ID와 연동되고, 검사 일정 추가 및 보호자 대시보드 연동을 확인할 수 있습니다. 이미 해당 병실에 입원이 있으면 건너뛰므로 중복 생성되지 않습니다.

## 8. 실시간 연동 안 됨 (검사 일정 삭제/체온 추가 등)
- **문제**: DB에는 반영되는데 대시보드에서 새로고침해야만 보임. 백엔드 로그에 `[WS] No active connections for token` 표시됨.
- **원인**: 프론트엔드에서 웹소켓 연결 시 사용하는 토큰과, 백엔드에서 브로드캐스트할 때 찾는 토큰이 일치하지 않거나 연결이 끊김. 혹은 `delete` 등 일부 API에서 `admission_id`로 토큰을 조회하는 로직 미비.
- **해결**: 
  1. `useVitals.ts` 등에서 웹소켓 연결(`ws://.../ws/{token}`)이 정상적으로 유지되는지 확인 (로그 확인).
  2. 백엔드 `manager.broadcast` 호출 전, 해당 `admission_id`의 `access_token`을 정확히 조회하여 타겟팅하는지 확인.
  3. **테스트 데이터(Seed)**를 사용하여 입원-토큰 관계가 명확한 상태에서 테스트 권장.

## 9. Windows 환경 `WinError 10035` (Blocking IO)
- **문제**: 백엔드 API 호출 시 `WinError 10035`가 발생하며 요청이 중단됨.
- **원인**: 동기식(Sync) Supabase 클라이언트 사용 시 Windows의 비차단(non-blocking) 소켓 동작과 충돌.
- **해결**: 백엔드를 `AsyncClient` 기반의 비동기 구조로 리팩토링하여 해결. `lifespan`을 통해 클라이언트를 한 번 초기화한 뒤 모든 엔드포인트에서 `Depends`로 주입받아 사용.

## 10. `WinError 10013`, `10048` (포트 액세스 거부/충돌)
- **문제**: 서버 시작 시 `액세스 권한에 의해 숨겨진 소켓에 액세스를 시도했습니다` 또는 `각 소켓 주소는 하나만 사용할 수 있습니다` 에러 발생.
- **원인**:
  1. 이전 프로세스가 비정상 종료되거나 좀비 프로세스로 남아 8000 포트를 점유 중.
  2. **Hyper-V / WSL2 예약 포트**: 윈도우 시스템이 특정 포트 범위를 예약하여 일반 앱의 접근을 차단함.
- **해결**: 
  1. **프로세스 종료**: `netstat -ano | findstr :8000`으로 PID 확인 후 `taskkill /F /PID <PID> /T` 실행.
  2. **예약 범위 확인**: `netsh interface ipv4 show excludedportrange protocol=tcp` 명령어로 8000번이 제외 범위에 포함되는지 확인.
  3. **포트 변경**: 시스템 예약 범위에 포함된 경우, `uvicorn main:app --port 8080`과 같이 포트를 변경하여 실행 (8080, 9000 등 추천).
  4. **권한**: 터미널이나 IDE를 '관리자 권한'으로 실행하여 네트워크 바인딩 권한 확보.
