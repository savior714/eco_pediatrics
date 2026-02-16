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
- **해결 (이 프로젝트의 표준)**: 
  - **포트 8080 사용**: Windows 환경의 8000번 포트 고질적 문제를 피하기 위해 **백엔드 포트를 8080으로 변경**했습니다.
  - **easy_start.bat**: 자동으로 8080으로 실행되도록 수정되었습니다.
  - **frontend/.env.local**: `NEXT_PUBLIC_API_URL=http://localhost:8080` 설정을 통해 프론트엔드도 자동으로 새 포트를 바라봅니다.
  - 만약 그래도 수동 실행이 필요하다면: `uvicorn main:app --port 8080 --host 0.0.0.0`
- **기존 8000번 포트 강제 해제 필요 시**: 
  1. `netstat -ano | findstr :8000`으로 PID 확인 후 `taskkill /F /PID <PID> /T` 실행.
  2. `netsh interface ipv4 show excludedportrange protocol=tcp`로 예약 여부 확인.
## 11. 체온 차트 X축/날짜 계산 오류
- **문제**: 입원 기간이 길어지거나 특정 조건에서 차트의 데이터 포인트가 겹치거나 날짜(1일차, 2일차...)가 이상하게 표시됨.
- **원인**: 
  1. `Math.abs` 사용으로 인해 체크인 시간보다 데이터 기록 시간이 앞서는 경우(입력 오류 등) 일수 계산이 역전됨.
  2. 일수 계산 시 입원 시각(HH:mm)을 포함하여 24시간을 계산함으로써, 날짜 경계선 처리가 불분명해지는 현상.
- **해결**:
  - `TemperatureGraph.tsx`의 계산 로직을 개선.
  - 입원 시각을 해당 날짜의 **자정(00:00:00)**으로 정규화하여 기준점(`startDayMidnight`)을 설정.
  - 모든 데이터 포인트의 일차(`hospitalDay`)를 `(기록시각 - 입원당일자정) / 24시간` 방식으로 계산하여 날짜별 정렬과 간격이 일정하도록 수정.
  - 최소 5일의 빈 칸을 항상 확보하고, 데이터가 늘어남에 따라 가로 스크롤 너비가 동적으로 확장되도록 보정.

## 12. 입원 일수 계산 불일치 및 체온 차트 색상 오류
- **문제**: 
  1. 대시보드 헤더의 '입원 N일차'와 차트의 X축 날짜가 서로 다르게 표시됨. 24시간 간격(rolling)으로 계산되어 자정이 지나도 일수가 바뀌지 않음.
  2. 체온 차트의 Y축 스케일이 변할 때, 38도 미만임에도 빨간색(고열)으로 표시되는 그라데이션 오류 발생.
- **원인**:
  1. 헤더에서 `new Date().getTime() - checkInAt` 방식으로 단순 시간 차이를 계산함.
  2. 차트 그라데이션의 `offset`이 고정값(35.5도~41도 기준)으로 하드코딩되어 있어, 데이터 범위에 따라 Y축이 변동될 때 색상 경계가 어긋남.
- **해결**:
  1. **`src/utils/dateUtils.ts` 도입**: `calculateHospitalDay` 함수를 만들어 입원일의 **자정(00:00:00)**을 기준으로 캘린더 날짜가 바뀌면 즉시 일수가 증가하도록 표준화.
  2. **동적 그라데이션 계산(재수정)**: `TemperatureGraph.tsx` 그라데이션이 적용되는 대상(Line Path)의 크기는 실제 데이터 범위(`dataMin`~`dataMax`)에 맞춰집니다. 따라서 그라데이션 위치(`offset`)를 `yDomain`이 아닌 **실제 데이터의 최소/최대값**을 기준으로 계산하도록 수정하여, 데이터 분포가 좁거나 편중된 경우에도 38도 경계가 정확히 일치하도록 조치했습니다.
  3. **Gradient ID 충돌 및 문법 해결**: 여러 차트(대시보드, 모달 등)가 동시에 존재할 경우 `tempColor`라는 고정 ID를 공유하여 그라데이션 설정이 덮어씌워지는 문제가 있었습니다. 또한 `React.useId()`가 생성하는 콜론(`:`)이 포함된 ID는 CSS/SVG `url()` 참조 시 문법 오류를 일으킬 수 있어, 콜론을 제거(`replace(/:/g, '')`)한 고유 ID를 사용하도록 수정했습니다.

## 13-10. SDK 설치 후에도 io.h 에러 지속 시

- **원인**: 다중 VS 버전 설치로 인한 컴파일러-SDK 경로 미스매치, 또는 Yanked된 패키지(`numpy 2.4.0`)의 강제 빌드 시도.
- **해결**:
  1. `requirements.txt`에 `numpy==2.4.2` 사용 (Python 3.14 wheel 지원, 빌드 없이 설치).
  2. **Developer Command Prompt**를 사용하여 빌드 환경 변수(`INCLUDE`, `LIB`) 강제 로드.
     - 윈도우 시작 메뉴에서 "Developer Command Prompt for VS 2022" 검색 후 실행.
     - 해당 터미널에서 `cd backend` → `.venv\Scripts\activate` → `pip install -r requirements.txt`
  3. `.venv` 삭제 후 재생성하여 깨진 빌드 아티팩트 제거.

## 13-11. Compiler cl cannot compile programs (VS 버전 미스매치)

- **증상**: SDK 설치 후에도 `cl` 컴파일러 테스트 실패. `ERROR: Compiler cl cannot compile programs.` 메시지 발생.
- **원인**:
  1. **C++ 유니버설(UWP)**은 앱 개발용이며, NumPy 등 C 확장 빌드에 필요한 데스크톱 헤더(`stdio.h`, `io.h`)를 포함하지 않음.
  2. 로그 상의 `Activating VS 18.3.0`과 실제 SDK가 설치된 VS 버전(2019 등)이 불일치.
- **해결**:
  1. **Visual Studio Installer** → [수정] → **C++를 사용한 데스크톱 개발** (Desktop development with C++, **UWP 아님**) 체크. MSVC v143/v144, Windows 11 SDK 확인.
  2. **Developer Command Prompt for VS 2022/2025**에서 프로젝트로 이동 후 `pip install numpy==2.2.3` 실행.
  3. **우회(권장)**: `requirements.txt`에서 `numpy==2.4.2` 사용. Python 3.14용 wheel 제공으로 빌드 불필요.
