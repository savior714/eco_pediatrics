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
