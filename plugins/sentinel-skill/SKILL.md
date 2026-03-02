---
name: sentinel-skill
description: "Operates and extends the Sentinel self-healing system for all tech stacks: Watchdog log monitoring (Python, JS/TS, Rust/Tauri, system errno, build tools), SOS prompt generation (prompt_for_agent.md), and L1/L2/L3 recovery. Use when working on Sentinel, sentinel_watchdog, AgentPromptGenerator, handle_exception, sentinel_shield, self-healing, or when debugging using prompt_for_agent.md."
---

# Sentinel Skill (자가 치유 아키텍처)

Sentinel은 사이드카/스크래퍼의 에러를 감시하고, 자가 치유(Healer) 및 에이전트용 SOS 프롬프트를 생성하는 방어 기제입니다. Phase 2부터 **Composition 패턴**과 **이중 방어(Proactive + Reactive)** 가 적용되어 있습니다. SSOT: `docs/CRITICAL_LOGIC.md` §8.2(Watchdog), §9(자가 치유 프로토콜).

## 1. 아키텍처 요약

| 구성요소 | 경로 | 역할 |
|----------|------|------|
| 진입점 | `src/sentinel/client.py` | `SentinelSkill`, 글로벌 `sentinel`; `handle_exception()` 호출 시 오케스트레이션 및 리포트 발행 |
| Proactive Shield | `src/sentinel/engine/protector.py` | `@sentinel_shield` 데코레이터; 비즈니스 로직 예외 즉시 포착 → `handle_exception` 호출 |
| Watchdog | `src/sentinel/tools/sentinel_watchdog.py` | `sidecar_debug_v2.log` tail, 에러 패턴 매칭 후 Healer 분기 + `sentinel.handle_exception()` 호출 |
| SOS 생성 | `src/sentinel/infrastructure/agent_bridge.py` | `AgentPromptGenerator`: HealingReport 기반 `prompt_for_agent.md` 생성(소스 컨텍스트 + Senior Architect 페르소나) |
| 리포트 | `src/sentinel/infrastructure/report_manager.py` | JSON 아카이브 + AgentPromptGenerator 호출 |
| **도메인 규약** | `src/domain/interfaces.py` | `NetworkProvider`, `StorageProvider` (추상 규약; 확장 시 여기 정의 우선) |
| **네트워크 전략** | `src/infrastructure/network/` | `HiraNetworkEngine` (NetworkProvider 구현) |
| **저장 전략** | `src/infrastructure/storage/` | `SqliteStorageEngine` (StorageProvider 구현) |

데이터 흐름: **Layer 1** `@sentinel_shield` 예외 → `handle_exception()` → 리포트/SOS **또는** **Layer 2** Watchdog 감지 → `handle_exception()` → HealingOrchestrator → ReportManager → AgentPromptGenerator → `prompt_for_agent.md` 갱신

### 1.1 이중 방어 체계 (Proactive vs Reactive)

- **Layer 1 (Proactive Shield):** 비즈니스 로직에 적용된 `@sentinel_shield` 데코레이터가 예외 발생 **즉시** `handle_exception`을 호출한다. 로그에 기록되기 전에 포착하므로 컨텍스트가 풍부하다.
- **Layer 2 (Reactive Watchdog):** 데코레이터가 놓치거나, 외부 프로세스(HWP, 시스템, Rust/Tauri)에서 발생하는 로그 에러를 실시간 감시하여 대응한다.

에이전트는 에러가 "데코레이터 경로"인지 "로그 감지 경로"인지 구분하면 트러블슈팅이 명확해진다.

- **채널 격리 (IPC):** 사이드카 로그는 **stderr**로 출력되어 감시되며, 순수 JSON 데이터는 **REAL_STDOUT**을 통해 전달된다. 데이터 깨짐·침묵하는 실패 분석 시 이 분리를 인지해야 하며, 통신 인코딩은 항상 **UTF-8**로 강제된다.

### 1.2 설계 원칙 (Phase 2+)

- **Composition over Inheritance:** 모든 기능 확장은 전략 패턴(Strategy Pattern)을 따르며, 상속(Mixin) 대신 **인터페이스 주입**을 지향한다. `UnifiedScraper`에 코드를 직접 넣지 말고, 새로운 Provider를 구현하여 서비스에 주입한다.
- **Interface Driven:** `src/domain/interfaces.py`에 정의된 규약(NetworkProvider, StorageProvider 등)을 최우선으로 준수한다.
- **Proactive Defense:** 핵심 로직은 `@sentinel_shield`를 통해 에러가 로그에 기록되기 전 즉시 포착한다.
- **Zero-Root Policy:** 모든 실행 로직과 상태 파일은 루트를 제외한 지정된 폴더(`src/`, `docs/milestones/`, `logs/`) 내에서만 관리한다.

## 2. Watchdog 에러 패턴 — 전 기술 스택 대상

목표: **모든 기술 스택**(Python, JS/TS, Rust/Tauri, 빌드 도구, 시스템 errno)에서 발생하는 에러 로그를 놓치지 않고 감지합니다.

- **DB**: `DB_MISSING_COLUMN`, `DB_MISSING_TABLE` → DatabaseHealer 또는 가이드 로그
- **도메인**: `HWP_CRITICAL`, `MEMORY_REDLINE`, `SIDE_CAR_DEATH`, `FRONTEND_ERROR`
- **GENERIC_CRITICAL** (필수 유지):
  - Python: Traceback, Exception, *Error(ModuleNotFound, Attribute, Value, Type, Import, Key, Runtime, Assertion, Syntax, Reference, Range), TimeoutError
  - JS/TS·Tauri: FAILED, Failed to, Unhandled, Uncaught, panicked, panic, RUST_BACKTRACE, Error =, error[
  - 시스템: ENOENT, ECONNREFUSED, EACCES, EPERM, EAGAIN, ETIMEDOUT, ECONNRESET, Connection refused
  - 런타임/빌드: Fatal, OOM, out of memory, Segmentation fault, SIGSEGV, SIGABRT, timeout

**키워드 필터**(`_analyze_line` early-return): 위와 동일 스택을 커버하도록 키워드 목록을 유지·확장합니다. 새 런타임/로그 형식 추가 시 해당 스택의 대표 에러 토큰을 정규식과 키워드 **둘 다**에 반영해야 누락이 없습니다. 모든 패턴 매칭 시 `sentinel.handle_exception()` 호출로 SOS 생성은 유지합니다.

**무한 루프 방지 (Critical Fix - 2026-02-24)**: Sentinel 자신이 발생시킨 에러 로그(JSON `name` 필드가 "sentinel"로 시작)를 다시 감지하여 에러를 무한 복제하는 "Silent Hang" 현상을 방지하기 위한 Short-circuit 로직이 `_analyze_line` 최상단에 구현되어 있습니다. 수정 시 이 필터링이 유지되어야 합니다.

## 3. 복구 레벨 (L1/L2/L3)

| 레벨 | 명칭 | 대상 | 동작 |
|------|------|------|------|
| L1 | Soft Reset | HWP COM 데드락, 좀비 | hwp.exe 정리, 워커 재생성 |
| L2 | Middle Recovery | DB Lock, 파일 권한 | 세션 강제 종료, 핸들 재점검 |
| L3 | Cold Restart | 메모리 임계치, 교착 | `os._exit(1)` 후 Tauri 재시작 |

Sentinel 코드/Healer 수정 시 위 레벨 정의와 CRITICAL_LOGIC §9를 위반하지 않도록 합니다.

## 4. 비즈니스 로직에서 Sentinel 사용 (표준)

개별 함수 단위의 예외 처리는 **데코레이터**를 표준으로 하며, 전역/일회성 예외만 `handle_exception`을 직접 호출한다.

```python
from src.sentinel.engine.protector import sentinel_shield

@sentinel_shield  # 권장: 에러 발생 시 자동으로 context 수집 및 SOS 생성
def collect_hira_data(self):
    # 비즈니스 로직만 집중
    ...
```

데코레이터를 쓸 수 없는 경우(예: 루프 내 일부만 보호)에만 try/except + `sentinel.handle_exception(e, context={...})`를 사용한다.

## 5. SOS 프롬프트 (prompt_for_agent.md)

- **위치**: `SIDECAR_LOG_FILE`과 동일 디렉터리의 `prompt_for_agent.md` (기본).
- **내용**: Agent-to-Agent Protocol, Senior Architect & Code Reviewer 페르소나, [Antigravity Task] 블록 안내, 에러 컨텍스트, 아키텍처 가이드, **소스 코드 컨텍스트**(sidecar_main, sqlite_storage_engine, hira_network_engine, sentinel_watchdog, client 등), Suggested Fix.
- **환경 제약**: 모든 Suggested Fix는 **Python 3.14**, **Windows 11 Native**, **MSVC(Visual Studio)** 컴파일러 환경에서 동작해야 한다. Bash/Linux 명령어는 지양하고 **PowerShell** 문법을 사용한다. 외부 라이브러리 추가 시 바이너리 휠이 없으면 소스 빌드 가능성을 전제로 한다.
- **에이전트 행동**: 해당 파일을 열고 근본 원인 수정 후, [Antigravity Task] 형식으로 보고.

### 5.1 에이전트 준수 사항 (Operational Rules)

- **Cleanup (최우선):** 근본 원인을 수정한 후 **반드시 `prompt_for_agent.md`를 삭제**하여 환경을 정리하고 Sentinel에 상황 종료를 알린다. 중복 작업·잔류 SOS로 인한 혼선을 방지한다. 이 프로토콜은 `.cursor/rules/sentinel-sos.mdc`에 규정된 최우선 규칙이다.
- **Environment Context:** Suggested Fix 작성 시 **Windows 11**, **Python 3.14**, **MSVC** 환경임을 전제하며, Bash/Linux 명령어는 지양하고 **PowerShell** 문법을 사용한다.
- **Channel Awareness:** 데이터 통신(REAL_STDOUT)과 로그 출력(stderr) 채널이 분리되어 있음을 인지한다. 데이터 전송 중 로그가 stdout에 섞이지 않도록 하며, '데이터 깨짐'·'침묵하는 실패' 분석 시 채널 분리를 먼저 확인한다.

**트러블슈팅 맵 (에러 유형별 우선 조사 위치):**

| 에러 유형 | 우선 조사 경로 |
|-----------|----------------|
| 네트워크(403, Timeout, ECONNREFUSED 등) | `src/infrastructure/network/` |
| DB/마일스톤/저장 실패 | `src/infrastructure/storage/`, `docs/milestones/` |
| 스크래퍼/앱 로직 | `src/app/`, `src/domain/` |
| Sentinel/Healer 자체 | `src/sentinel/` |

소스 컨텍스트에 파일을 추가/제거할 때는 `AgentPromptGenerator.source_files`만 수정한다.

## 6. 수정 시 체크리스트

- [ ] Watchdog 패턴/키워드 변경 시 **전 스택** 커버리지 유지: 새 스택 추가 시 해당 에러 토큰을 GENERIC_CRITICAL 정규식과 keywords 리스트 둘 다에 반영
- [ ] CRITICAL_LOGIC §8.2 문단과 일치하는지 확인
- [ ] Healer 또는 복구 로직 변경 시 L1/L2/L3 정의(§9.1)와 충돌 없는지 확인
- [ ] `handle_exception` 호출 경로가 리포트 발행까지 이어지는지 확인(ReportManager → AgentPromptGenerator)
- [ ] 신규 에러 유형은 가능하면 기존 `error_patterns`(특히 GENERIC_CRITICAL)에 통합하고, 모든 매칭에서 `sentinel.handle_exception()` 호출 유지
- [ ] **Phase 2:** 신규 저장소/통신 로직 추가 시 `src/domain/interfaces.py`에 인터페이스를 먼저 정의했는가?
- [ ] **Phase 2:** `src/app_cli.py`(또는 해당 Composition Root)에서 의존성 주입(DI)을 통해 엔진을 조립했는가? Mixin/다중 상속으로 회귀하지 않았는가?
- [ ] 마일스톤 관리 시 `docs/milestones/` 경로 SSoT를 준수했는가?

## 7. 참고 문서

- **SSOT**: `docs/CRITICAL_LOGIC.md` §8.2, §9
- **구현**: `src/sentinel/` (client, engine/protector, tools/sentinel_watchdog, infrastructure/agent_bridge, report_manager, engine/orchestrator)
- **규약·전략**: `src/domain/interfaces.py`, `src/infrastructure/network/`, `src/infrastructure/storage/`