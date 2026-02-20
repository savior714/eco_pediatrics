# Error Monitor 디버깅 요청 — 다른 LLM 에이전트용 프롬프트

아래 블록 전체를 **다른 LLM 에이전트(예: Gemini, Claude 등)에게 붙여넣어** 에러 모니터가 제대로 동작하지 않는 문제를 진단·수정 요청할 때 사용하세요.

---

## 복사용 프롬프트 (Copy-Paste Block)

```
## 프로젝트 및 컴포넌트

- **프로젝트**: eco_pediatrics (Windows 11, PowerShell, Python 3.14, Next.js + Tauri)
- **대상**: Error Monitor — 여러 서비스(Backend / Frontend)의 로그 파일을 감시하고, 에러가 감지되면 `prompt_for_gemini.md`를 세션 히스토리 형식으로 자동 갱신하는 **파일 기반 에러 추적 시스템**

## 기대 동작 (정상 시)

1. **실행**: 프로젝트 루트에서 `python error_monitor.py` 또는 `python error_monitor.py --clear` 실행 시, 모니터가 무한 루프로 동작하며 1.5초마다 다음 로그 파일을 감시한다.
   - `backend/logs/app.log` (Backend)
   - `frontend/logs/frontend.log` (Frontend)
2. **에러 감지**: 로그 내용에 ERROR, Traceback, Exception, FAILED, panicked, ENOENT 등 정의된 정규식 패턴이 있으면, 해당 로그 꼬리(TAIL_LINES=100)를 세션 에러 목록에 추가하고 `prompt_for_gemini.md`를 갱신한다.
3. **출력 파일**: `prompt_for_gemini.md`에는 [Agent-to-Agent Protocol], Session Error History, Source Code Context(고정된 SOURCE_FILES 목록), Instruction이 포함된다.
4. **실행 경로**: Dev Mode는 `eco.bat` → [1] 선택 시 `scripts/launch_wt_dev.ps1`가 Windows Terminal을 띄우고, **첫 번째 패널**에서 `cmd /k python error_monitor.py --clear`를 실행한다. (최근 수정: cmd /c → cmd /k 로 변경해 패널이 바로 닫히지 않도록 함)

## 현재 증상 (사용자 보고)

- **"에러 모니터링 하는 기능이 다시 제대로 작동을 안 하는 것 같다"**
- 구체적으로 다음 중 어떤 문제인지는 사용자가 명시하지 않음. 가능한 후보:
  - Error Monitor 패널이 뜨지 않거나, 뜨자마자 꺼짐
  - Monitor는 떠 있지만 `prompt_for_gemini.md`가 갱신되지 않음
  - Backend/Frontend 로그가 해당 경로에 쌓이지 않아 감지 자체가 불가
  - 에러가 났는데도 패턴 매칭이 되지 않아 리포트에 반영되지 않음
  - 프론트엔드 로그 수집이 안 됨 (Next.js/Tauri는 기본적으로 stdout만 쓰므로, Tee-Object 등으로 frontend/logs/frontend.log에 리다이렉트해야 함)

## 핵심 파일 경로 (프로젝트 루트 기준)

| 역할 | 경로 |
|------|------|
| 모니터 진입점 | `error_monitor.py` |
| WT 3분할 실행 스크립트 | `scripts/launch_wt_dev.ps1` |
| 아키텍처·로그 수집 방법 | `ERROR_MONITOR_ARCHITECTURE.md` |
| 트러블슈팅(Setup/Doctor/WT 레이아웃) | `docs/TROUBLESHOOTING.md` |
| 생성되는 리포트 | `prompt_for_gemini.md` |
| 감시 대상 로그 | `backend/logs/app.log`, `frontend/logs/frontend.log` |

## 요청 사항

1. **원인 추정**: 위 증상이 나올 수 있는 원인을 가능한 범위에서 추정하라. (예: frontend 로그 미수집, 경로 오타, 인코딩 오류, WT 인자 순서, Python PATH 등)
2. **검증 방법**: 사용자가 로컬에서 “모니터가 동작하는지 / 로그가 쌓이는지 / 리포트가 갱신되는지” 단계별로 확인할 수 있는 방법을 제시하라.
3. **수정 제안**: 원인에 맞춰 수정이 필요하면 **[Antigravity Task]** 형식으로 다음을 제시하라.
   - **근본 원인**: 한 줄 요약
   - **파일 경로**: 수정 대상 파일
   - **직접 명령**: 구체적 수정 지시
   - **수정 코드**: diff 또는 최소 교체 코드만 (전체 파일 재작성 금지)

참고: Backend는 loguru로 `logs/app.log`에 직접 기록하므로 별도 리다이렉트 없이 감시 가능. Frontend(Next.js + Tauri)는 터미널에만 출력하므로, `ERROR_MONITOR_ARCHITECTURE.md` §4-2에 따라 **stdout 리다이렉트(Tee-Object 등)** 로 `frontend/logs/frontend.log`에 기록되도록 되어 있어야 모니터가 Frontend 에러를 감지할 수 있다. 현재 `launch_wt_dev.ps1`의 Frontend 패널은 `npm run tauri dev`만 실행하고 있어, frontend.log로의 리다이렉트가 없을 가능성이 있다.
```

---

## 사용 방법

1. 위 **복사용 프롬프트** 블록 전체를 복사한다.
2. 다른 LLM 에이전트 대화창에 붙여넣고 전송한다.
3. 에이전트가 원인 추정·검증 방법·수정 제안을 하면, 해당 제안에 따라 `error_monitor.py`, `launch_wt_dev.ps1`, 또는 프론트 로그 수집 방식을 수정한다.
4. 필요 시 `docs/TROUBLESHOOTING.md`와 `ERROR_MONITOR_ARCHITECTURE.md`를 함께 참조하라고 안내한다.
