---
name: Error Monitor
description: 에러 모니터 실행, 트러블슈팅 및 Gemini 컨텍스트 패키지 생성 워크플로우
---

# Error Monitor (에러 모니터) 스킬

이 스킬은 **eco_pediatrics** 프로젝트의 모든 서비스(Backend, Frontend 등)에서 발생하는 에러 로그를 실시간 감시하고, 에러 상황 시 LLM/Agent에게 바로 전달 가능한 형태의 **컨텍스트 패키지(`prompt_for_gemini.md`)를 자동 생성 및 활용**하는 방법을 안내합니다.

## 1. 아키텍처 개요

- **Zero-Dependency & Zero-Cost**: API 연동 없이 순수 파일 시스템의 로그 파일(Pure-Polling 방식)을 감시합니다.
- **수집 방식**:
  - `Backend` (FastAPI): `loguru`를 통해 `backend/logs/app.log` 로 직접 출력.
  - `Frontend` (Next.js/Tauri): `Tee-Object`를 통해 터미널 stdout과 `frontend/logs/frontend.log`에 동시 출력.
- **포함 컨텍스트**: 세션 에러 히스토리 + 정의된 소스 코드 파일 묶음 + System Prompt 조합.

> **주의**: 감시 대상 추가가 필요한 경우, 프로젝트 루트의 `error_monitor.py` 파일 내 `WATCH_TARGETS`와 `SOURCE_FILES`를 수정해야 합니다.

---

## 2. 워크플로우: 에러 모니터 실행 및 에러 반영

1. **자동 실행 (권장)**:
   프로젝트 루트에서 `run_dev.bat` 실행.
   - 3분할 윈도우 터미널(WT)이 실행되며, 백그라운드에서 Backend, Frontend와 함께 Error Monitor(이전 로그 초기화 후)가 동시 실행됩니다.

2. **수동 제어 (`error_monitor.py`)**:
   - `python error_monitor.py --clear` : 무한 루프로 로그 꼬리(tail) 감시 시작 (기존 로그 초기화)
   - `python error_monitor.py` : 기존 세션 유지하며 재시작
   - `python error_monitor.py --cleanup` : 모든 로그 및 리포트 데이터 삭제 후 종료

3. **에러 발생 및 리포트 활용**:
   - 에러가 감지되면 프로젝트 루트 파일인 `prompt_for_gemini.md`가 자동 갱신됩니다.
   - 해당 파일 전체(`Ctrl+A` -> `Ctrl+C`)를 복사해 Gemini, NotebookLM, 또는 Antigravity 에이전트에 붙여넣어 디버깅 및 코드 수정 지시를 받습니다.

---

## 3. 트러블슈팅 & 프롬프트 리소스

문제가 발생할 경우, 다른 LLM 모델의 도움을 받기 위해 사전 정리된 디버그 프롬프트를 사용할 수 있습니다. 해당 원본 템플릿들은 `.agent/skills/error_monitor/resources/` 안에 백업용으로 편제되어 있습니다.

- **`resources/ERROR_MONITOR_DEBUG_PROMPT.md`**
  - **용도**: 에러 모니터 시스템 자체(감지 누락, 패널 종료 등)가 오작동할 때 LLM에 원인 분석을 요청하는 프롬프트입니다.
- **`resources/prompt_for_llm.md`**
  - **용도**: `run_dev.bat` 실행 시 윈도우 터미널(`wt.exe`) 화면이 즉시 닫히는(크래시) 등 레이아웃 파싱 관련 문제가 지속될 때 다른 LLM에 디버깅을 요청하는 프롬프트입니다.
- **`resources/prompt_for_gemini.md`**
  - **용도**: 에러가 났을 때 Error Monitor가 동적으로 뱉어내는 템플릿의 형식을 기록한 파일입니다. (루트 디렉토리의 파일을 삭제했을 시를 대비한 원본 백업용)
