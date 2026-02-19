# Troubleshooting

## 1. Next.js 빌드 캐시 이슈
- **문제**: `Cannot find module './vendor-chunks/lodash.js'` 에러 발생
- **원인**: Next.js 빌드 시 이전 캐시가 남아서 최신 모듈 경로를 찾지 못함
- **해결**: `.next` 폴더를 삭제하고 다시 빌드
    ```bash
    cd frontend
    rm -rf .next
    npm run dev
    ```

## 2. Windows Terminal 레이아웃 깨짐
- **문제**: `run_dev.bat` 실행 시 에러 모니터가 하단 전체를 차지하지 않고 BE/FE 패널이 엉뚱하게 분할됨
- **원인**: 보이지 않는 특수 문자(BOM 등)가 배정 파일에 포함되거나, 패널 인덱스 타겟팅(`-t`, `-p`)이 명확하지 않아 발생
- **해결**: 모든 `split-pane` 명령어에 `-p 0` (첫 번째 패널 타겟) 옵션을 추가하고, 파일을 BOM 없는 ANSI/UTF8로 재생성

## 3. PowerShell 로그 인코딩 이슈 (UTF-16 LE)
- **문제**: `Tee-Object`로 생성된 프론트엔드 로그를 `error_monitor.py`가 읽지 못해 감지가 안 됨
- **원인**: PowerShell 5.1의 `Tee-Object`는 기본적으로 UTF-16 LE 인코딩을 사용하여 UTF-8 기반 모니터에서 깨짐 발생
- **해결**: `error_monitor.py`의 로그 읽기 함수(`_tail`)에 다중 인코딩 지원 추가 (UTF-8 시도 후 실패 시 UTF-16 LE 자동 재시도)

## 4. AI 에이전트 문서 편집 실패 및 오염
- **문제**: 에이전트가 문서를 수정할 때 이전 작업의 줄 번호(`26: ` 등)가 실제 파일 내용으로 삽입되거나 매칭에 실패함
- **원인**: `view_file` 출력 결과를 필터링 없이 `TargetContent`나 `ReplacementContent`에 그대로 사용함
- **해결**: 
    1. `TargetContent`에서 줄 번호 접두사를 반드시 제거하고 순수 코드/텍스트만 포함
    2. 다중 행 매칭보다는 고유한 단일 앵커 행을 기준으로 수정
    3. 인코딩(`\r\n` vs `\n`) 호환성을 위해 `multi_replace_file_content` 활용

## 5. RLS 정책 위반 (`42501`)
- **문제**: 식단 정보 수정 시 `permission denied` 발생
- **원인**: Supabase RLS 정책에서 `UPDATE` 권한이 누락되었거나 `auth.uid()` 체크가 서비스 롤과 충돌
- **해결**: `SECURITY DEFINER` 권한을 가진 RPC 함수를 생성하여 정책 제약을 우회하거나, 필요한 테이블에 명시적 `UPDATE` 정책 추가

## 6. Pydantic v2 스키마 검증 에러
- **문제**: `AdmissionResponse` 등에서 특정 필드 누락 시 서버 500 에러 발생
- **원인**: `Optional` 타입은 선언했으나 기본값(`= None`)을 지정하지 않아 필수 필드로 인식됨
- **해결**: 선택적 필드에는 반드시 `= None` 기본값을 명시하여 방어적 구현
