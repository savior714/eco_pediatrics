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

## 14. Tauri v2 HTTP 권한 이슈 (url not allowed on the configured scope)
- **문제**: Tauri 앱에서 백엔드로의 API 요청(Fetch) 시 `Fetch Fatal: url not allowed on the configured scope` 또는 `http.fetch_send not allowed` 에러 발생.
- **원인**: Tauri v2의 강화된 보안 모델로 인해, 네이티브 Fetch 사용 시 명시적인 URL 허용 목록(Scope)과 명령어 권한(Permissions)이 설정되지 않아 차단됨.
- **해결**:
  1. **윈도우 레이블 매칭**: `src-tauri/tauri.conf.json`의 `windows` 설정에 `"label": "main"`을 추가하여 권한 설정과 창을 매칭시킴.
  2. **Capabilities 설정**: `src-tauri/capabilities/default.json`의 `permissions` 배열에 `http:default` 권한을 객체 구조로 추가하고 URL 스코프를 지정함.
     ```json
     {
       "identifier": "http:default",
       "allow": [
         { "url": "http://127.0.0.1:8000/*" },
         { "url": "http://localhost:8000/*" }
       ]
     }
     ```
  3. **재시작 필수**: 설정 파일 수정 후 반드시 실행 중인 터미널을 종료하고 `npm run tauri dev`를 다시 실행해야 함 (Hot-reload 미적용 영역).
  4. **포트 및 CORS**: Next.js 개발 서버는 표준 3000번 포트를 사용하며, 만약 포트를 변경할 경우 백엔드의 `main.py` 내 `ALLOWED_ORIGINS`에도 해당 포트가 추가되어야 합니다 (미추가 시 보호자 대시보드 로딩 불가).

## 15. Supabase RLS 무시/차단 이슈 (Row Level Security)
- **문제**: 정책(Policy)은 설정되어 있으나 데이터가 로드되지 않거나("Loading..."), 보안 정책이 전혀 적용되지 않는 현상.
- **원인**: 
  1. 테이블 레벨에서 RLS 기능 자체가 활성화(`Disabled`)되지 않음.
  2. `SELECT` 권한 없이 `INSERT` 권한만 설정된 경우 대시보드 페칭 실패.
- **해결**:
  1. **RLS 활성화**: `ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;` 명령을 SQL Editor에서 실행.
  2. **조회 권한 추가**: 대시보드 연동을 위해 `FOR SELECT USING (true)` 정책을 반드시 추가.
  3. **코드 일관성**: `supabase/schema.sql`에 모든 테이블의 `ENABLE ROW LEVEL SECURITY` 구문이 포함되어 있는지 확인.
- **린트 경고 (RLS Policy Always True)**:
  - **문제**: `WITH CHECK (true)` 사용 시 린터가 보안 우회로 간주하여 경고 발생.
  - **해결**: 단순히 무조건 허용하는 대신, `EXISTS` 서브쿼리를 사용하여 삽입하려는 `admission_id`가 현재 `IN_PROGRESS` 상태인지 검증하는 로직을 삽입 정책에 적용.
- **authenticated 역할의 전방위 허용 경고**:
  - **문제**: `FOR ALL TO authenticated USING (true)` 사용 시 린터가 보안 우회로 경고.
  - **해결**: `FOR ALL` 대신 작업별 권한을 검토하고, `USING (auth.role() = 'authenticated')` 조건을 명시하여 "무조건 허용"이 아닌 "명시적 역할 확인" 단계를 추가.
- **비로그인 QR 접근 아키텍처**:
  - **접근 방식**: 별도의 계정 로그인 대신, 입원 시 생성되는 고유 **UUID(`access_token`)**가 포함된 QR 코드를 통해 대시보드에 접근합니다.
  - **보안 전략**:
    - **RLS (Row Level Security)**: 모든 데이터 조회 및 삽입은 해당 `admission_id`가 실제 입원 상태(`status = 'IN_PROGRESS'`)인 경우에만 허용되도록 데이터베이스 레벨에서 강제됩니다.
    - **Defense in Depth**: 백엔드 프록시 검증과 DB RLS 필터링의 2중 보안 계층을 통해 데이터 노출을 원천 차단합니다.

## 16. Tauri에서 환자 서브모달 레이어 깨짐 (스테이션 → 환자 클릭 시)
- **문제**: `tauri dev`로 스테이션 대시보드에서 환자 그리드를 눌러 개별 환자 서브모달을 열면, 모달이 제대로 보이지 않거나 배경 UI가 모달 위에 겹쳐 보임.
- **원인**: `PatientDetailModal`이 Portal 없이 스테이션 페이지 DOM 안에만 렌더되어, Tauri WebView의 stacking context(부모의 `overflow-hidden`, `transform` 등) 영향으로 `fixed`/`z-50`이 기대대로 동작하지 않음.
- **해결**:
  1. **Portal 적용**: `PatientDetailModal` 전체를 `Portal`로 감싸 `document.body`에 렌더하도록 변경.
  2. **z-index·stacking**: 모달 루트에 `z-[9999]`, `isolate` 적용. 흰색 카드에 `relative z-10`, 상단 식단/IV 영역에 `relative z-0`, 체온 차트 스크롤 영역에 `relative z-10` 및 `min-h-0` 적용하여 내부 레이어 순서 고정.
  3. 모달 열릴 때 `document.body.style.overflow = 'hidden'`으로 스크롤 잠금.

## 17. Fetch "error sending request" / 백엔드 연결 불가 및 Supabase env 미설정
- **문제**: Tauri 또는 브라우저에서 `error sending request for url (http://127.0.0.1:8000/api/v1/...)` 또는 콘솔에 "백엔드에 연결할 수 없습니다" 표시. 백엔드 실행 시 `ValueError: SUPABASE_URL and SUPABASE_KEY must be set` 발생.
- **원인**:
  1. 백엔드 서버가 해당 포트에서 기동되지 않음(연결 거부).
  2. `backend/.env`가 없거나, 프로젝트 루트에서 uvicorn 실행 시 `backend/.env`를 읽지 못함.
  3. Supabase 환경 변수 미설정.
- **해결**:
  1. **백엔드 기동**: `backend` 폴더에서 `uv run uvicorn main:app --port 8000 --host 0.0.0.0` 실행. (Windows 포트 이슈 시 8080 사용 및 `frontend/.env.local`에 `NEXT_PUBLIC_API_URL=http://localhost:8080` 설정, Tauri capabilities에 8080 URL 허용 추가.)
  2. **Supabase env**: `backend/.env.example`을 복사해 `backend/.env` 생성 후, Supabase 대시보드 → Project Settings → API에서 Project URL과 anon key를 `SUPABASE_URL`, `SUPABASE_KEY`로 설정.
  3. **database.py**: `.env`를 `database.py` 기준 backend 디렉터리에서 로드하도록 수정하여, 루트에서 uvicorn 실행 시에도 `backend/.env`를 읽도록 함. env 미설정 시 에러 메시지에 ".env.example을 .env로 복사 후 Supabase 키 설정" 안내 추가.
  4. **api.ts**: 연결 실패 시 한글 안내 및 백엔드 기동 예시 명령을 콘솔에 출력하도록 개선.

## 18. 환자 서브모달 내 식단·IV 영역이 체온 차트 위에 겹쳐 보이는 문제
- **문제**: Portal 적용 후에도 서브모달 안에서 식단 카드(오늘 아침/점심/저녁) 및 IV 수액 영역이 체온 차트 위에 그려져 레이어가 깨져 보임.
- **원인**: 모달 내부에서 스크롤 영역(`overflow-y-auto`)과 상단 고정 영역(VitalStatusGrid)이 별도 stacking context를 갖는 경우, Tauri/WebView에서 페인트 순서가 뒤섞임.
- **해결**: 상단 식단/IV 래퍼에 `relative z-0`, 체온 차트가 들어 있는 스크롤 영역에 `relative z-10` 및 `min-h-0`을 부여해, 항상 차트 영역이 식단/IV 위에 그려지도록 함. 모달 루트의 `z-[9999]`·`isolate` 유지.

## 19. 환자 서브모달 UI 정리 (슬래시 제거·테두리 복구)
- **문제**: 식단 카드에서 "환아식 미신청 / 보호자식 미신청" 사이의 `/` 구분이 불필요함. 서브모달 섹션 카드 테두리가 흐릿하거나 일관되지 않음.
- **해결**:
  1. **VitalStatusGrid**: 환아식·보호자식 텍스트 사이의 `/` 제거. 두 줄로만 표시(환아식 → 다음 줄 보호자식), `gap-0.5`로 간격 유지.
  2. **PatientDetailModal**: 상단 영역 하단 테두리 `border-slate-100` → `border-slate-200`. 체온 기록 섹션을 `bg-white`·`border border-slate-200`·`shadow-sm` 카드 스타일로 통일. 차트 영역은 `rounded-xl border border-slate-200 bg-slate-50/50` 적용.
  3. **PatientDetailSidebar**: "예정된 검사 일정" → "오늘의 검사 일정"으로 문구 변경. 검사 일정·신청된 서류·요청 사항 섹션을 `bg-white`·`border border-slate-200`·`shadow-sm`로 통일해 흰 카드와 회색 테두리 복구.
