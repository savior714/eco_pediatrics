# 디버깅 프롬프트: Python 의존성 설치 실패 문제 (C++ 확장 빌드)

## 문제 요약
- **환경**: Windows 11, Python 3.14.2 64-bit, 프로젝트 루트 `.venv` 가상환경
- **증상**: `pip install -r backend/requirements.txt` 또는 `pip install supabase` 실행 시 **C++ 확장 빌드 단계에서 실패**하여 전체 설치가 중단됨
- **결과**: `fastapi`, `supabase` 등 백엔드 핵심 의존성이 미설치되어 uvicorn 서버 실행 불가

---

## 1. 구체적 오류 메시지

### 1.1 pyiceberg 빌드 실패
```
decoder_fast.c
C:\Users\...\Python314\include\pyconfig.h(59): fatal error C1083: 파일을 열 수 없습니다. 'io.h': No such file or directory
error: command 'cl.exe' failed with exit code 2
ERROR: Failed building wheel for pyiceberg
```

### 1.2 pyroaring 빌드 실패
```
pyroaring.cpp
...\Python314\include\pyconfig.h(59): fatal error C1083: 'io.h': No such file or directory
error: command 'cl.exe' failed with exit code 2
ERROR: Failed building wheel for pyroaring
```

### 1.3 핵심 인사이트
- **`io.h`**: Windows SDK의 C 런타임 헤더. MSVC 컴파일러(`cl.exe`)가 C 확장을 빌드할 때 필요함
- **pyconfig.h(59)** 지점에서 `#include <io.h>` 실패 → `INCLUDE` 환경 변수에 Windows SDK 경로가 누락되었을 가능성

---

## 2. 의존성 체인 (Dependency Chain)

### 2.1 문제 발생 경로
```
supabase==2.28.0
  └── storage3==2.28.0
        └── pyiceberg>=0.10.0  ← C 확장 (decoder_fast.c) 빌드 필요
              └── pyroaring>=1.0.0  ← Cython 확장 빌드 필요
```

### 2.2 requirements.txt 내 관련 패키지 (버전 고정)
```
storage3==2.28.0
supabase==2.28.0
pyiceberg==0.11.0
pyroaring==1.0.3
```

### 2.3 백엔드 실행에 필요한 것
- **필수**: `supabase` (database.init_supabase → Supabase 클라이언트)
- **pyiceberg 우회 불가**: storage3는 **런타임에** `storage3._async.analytics` 모듈에서 `from pyiceberg.catalog.rest import RestCatalog`를 import함. 따라서 `--no-deps`로 supabase·storage3만 설치해도 `import supabase` 시점에 `ModuleNotFoundError: No module named 'pyiceberg'` 발생. **Option B(--no-deps 우회)는 동작하지 않음**.

---

## 3. 환경 및 기존 대응

### 3.1 표준 설정 (docs/DEV_ENVIRONMENT.md)
- **Visual Studio**: 2022/2025 — C++ 데스크톱 개발 워크로드 **필수**
- **eco setup [2번]**: `scripts/Refresh-BuildEnv.ps1`로 SDK 경로를 **사용자 환경 변수에 영구 등록** + 현재 세션에 주입
- **선 설치 시도**: pyroaring, pyiceberg를 `--no-cache-dir`로 먼저 설치 후 `requirements.txt` 설치

### 3.4 근본 해결: Refresh-BuildEnv.ps1
- **경로**: `scripts/Refresh-BuildEnv.ps1`
- **역할**: vswhere 없이 `Get-ChildItem`으로 최신 Windows SDK(10.x.x.x) 탐색 후 `INCLUDE`, `LIB`, `PATH`를 사용자 환경 변수에 영구 등록
- **실행**: `eco setup` 시 자동 호출 또는 수동 `powershell -ExecutionPolicy Bypass -File scripts\Refresh-BuildEnv.ps1`
- **효과**: 새 터미널/IDE 세션에서도 SDK 경로가 유지되어 `io.h` 미발견 문제 재발 방지

### 3.2 현재 우회 조치 (backend/requirements-core.txt)
- **fastapi, uvicorn, pydantic, httpx** 등 C 확장 없이 설치 가능한 패키지만 포함
- `pip install -r requirements-core.txt` → **성공** (FastAPI import 가능)
- **supabase 미포함** → 백엔드 실제 실행(uvicorn main:app)은 여전히 **불가**

### 3.3 TROUBLESHOOTING (docs/TROUBLESHOOTING.md §3)
- **원인**: pip/빌드 도구가 Windows Kits 10 경로를 자동으로 못 찾는 경우
- **해결**: Setup [2번]에서 SDK 자동 탐색·경로 주입 후 `pyroaring`/`pyiceberg` 선 설치 시도

---

## 4. 조사해야 할 항목

1. **Windows SDK 설치 여부**
   - `C:\Program Files (x86)\Windows Kits\10\Include\10.*` 존재 여부
   - `io.h`가 `...\Include\10.x.x.x\ucrt\io.h` 경로에 있는지

2. **Visual Studio Build Tools / MSVC**
   - `cl.exe`가 PATH에 있는지 (`where cl` 또는 `cl` 실행)
   - `vcvars64.bat` 실행 후 `INCLUDE`, `LIB`가 설정되었는지

3. **Python 3.14 + MSVC 호환성**
   - Python 3.14는 비교적 최신. MSVC 14.5x(VS 2022/2026)와의 조합에서 `pyconfig.h`가 기대하는 헤더 경로와 실제 SDK 경로 불일치 가능성

4. **대안 가능성**
   - supabase 버전 다운그레이드: storage3가 pyiceberg를 요구하지 않는 이전 supabase 버전이 있는지
   - pyiceberg/pyroaring의 **사전 빌드된 wheel** 존재 여부 (Python 3.14용)
   - Docker/WSL2 사용 시 Linux 환경에서는 빌드가 성공하는지

---

## 5. 핵심 파일 경로

| 파일 | 역할 |
|------|------|
| `backend/requirements.txt` | 전체 의존성 (supabase, pyiceberg, pyroaring 포함) |
| `backend/requirements-core.txt` | C 확장 제외 핵심만 (fastapi, uvicorn, pydantic 등) |
| `docs/DEV_ENVIRONMENT.md` | 표준 개발 환경 (VS, SDK, eco setup) |
| `docs/CRITICAL_LOGIC.md` §3.5 | Backend Dependency Layers 정책 |
| `docs/TROUBLESHOOTING.md` §3 | io.h/SDK 미발견 시 해결 가이드 |
| `scripts/Refresh-BuildEnv.ps1` | SDK 경로 영구 등록 스크립트 (근본 해결) |
| `eco.bat` | setup 시 Refresh-BuildEnv.ps1 호출, pyroaring/pyiceberg 선 설치 시도 |

---

## 6. 요청 사항

위 맥락을 바탕으로 다음을 분석·제안해 주세요.

1. **`io.h` 미발견의 정확한 원인** — `INCLUDE` 미설정인지, SDK 경로 오류이지, Python 3.14 호환성 이슈인지
2. **즉시 시도 가능한 수동 대응** — `vcvars64.bat` 호출 방법, `INCLUDE`/`LIB` 수동 설정 예시 (PowerShell 7)
3. **supabase 설치 시 pyiceberg/pyroaring을 우회하는 방법** — storage3가 런타임에 pyiceberg를 import하므로 `--no-deps`는 실패함. storage3의 pyiceberg 의존성을 제거한 **포크** 또는 **구버전 storage3** (pyiceberg 미의존) 존재 여부 확인.
4. **Python 3.14용 wheel 존재 여부** — pyiceberg, pyroaring의 PyPI/Source 폐이지 확인 제안
5. **장기적 해결** — eco setup 개선, CI 환경 권장 사항

---

## 7. 추가 컨텍스트
- 프로젝트: eco_pediatrics (FastAPI 백엔드 + Next.js/Tauri 프론트엔드)
- 백엔드 실행 명령: `python -m uvicorn main:app --reload` (backend 디렉터리에서)
- `main.py`는 `database.init_supabase`를 사용하므로 supabase 패키지가 반드시 필요함

## 8. 관련 이슈: eco.bat / 배치 파일 실행 시 명령어 파편화
- **증상**: `eco setup` 또는 `eco.bat` 실행 시 `'cho'`, `'edelayedexpansion'` 인식 불가 등 에러 후 즉시 종료.
- **원인**: 배치 파일이 UTF-16/UTF-8 BOM으로 저장되어 `cmd.exe` 해석 실패.
- **해결**: `docs/TROUBLESHOOTING.md` §8 및 `docs/CRITICAL_LOGIC.md` §2.6 참고. 배치 파일은 **ANSI(CP949)/ASCII** 인코딩 유지.
