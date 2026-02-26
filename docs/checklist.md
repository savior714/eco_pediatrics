# Checklist (점검 목록)

## uv 가상환경 점검 (완료)

- [x] uv 설치 방법 문서화 (DEV_ENVIRONMENT.md)
- [x] eco.bat: uv 선행 검사, venv 생성/설치를 uv 기준으로 변경, uv.lock 시 uv sync 사용
- [x] start_backend_pc.bat: uv venv / uv pip·uv sync 적용
- [x] doctor.py: uv 검사 추가 (PATH 및 python -m uv fallback)
- [x] backend/pyproject.toml 추가, requirements.txt → [project].dependencies 반영
- [x] backend/uv.lock 생성, [dependency-groups].dev 적용
- [x] uv sync 실행 검증 및 백엔드 import 확인
