# Context (작업 맥락)

- **uv 리팩토링 (2026-02 기준)**  
  - 가상환경: `backend/.venv`는 uv로만 생성 (`uv venv .venv --python 3.14`). 기존 .venv 존재 시 재생성 금지.  
  - 의존성: `backend/pyproject.toml` + `uv.lock` 사용. Setup 시 `uv.lock` 있으면 `uv sync`, 없으면 `uv pip install -r requirements.txt`.  
  - 선행 조건: uv는 PATH 또는 `python -m uv` / `py -3.14 -m uv`로 사용 가능해야 함. doctor.py에서 둘 다 검사.
