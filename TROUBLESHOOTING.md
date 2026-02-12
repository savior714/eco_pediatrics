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
