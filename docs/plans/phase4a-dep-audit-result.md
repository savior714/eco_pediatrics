# 📋 Phase 4-A Task 1: 의존성 감사 결과
> 생성: 2026-03-12 | 분석 대상: `backend/pyproject.toml` (163개 패키지)
> 상태: **사용자 검토 대기** (Task 2 진행 전 승인 필요)

---

## 📊 분류 요약

| 버킷 | 패키지 수 | 설명 |
|------|-----------|------|
| **CORE** | 49 | 프로덕션 서버 실행에 필수 (직접 import + 전이적 의존성) |
| **DEV** | 17 | 테스트·린트·타입체크 전용 |
| **TOOLS** | 83 | 스크립트·GUI·AI·데이터처리 전용 (서버와 무관) |
| **UNKNOWN** | 9 | 직접 import 없음 — 용도 확인 필요 |

---

## ✅ CORE (프로덕션 서버 필수)

### 직접 임포트 확인된 패키지
| 패키지 | 임포트 위치 | 비고 |
|--------|------------|------|
| `fastapi` | main.py, routers/* | 웹 프레임워크 |
| `starlette` | main.py | StarletteHTTPException 직접 사용 |
| `uvicorn` | 실행 서버 | ASGI 서버 |
| `pydantic` | models.py, schemas.py | BaseModel, field_validator |
| `pydantic-core` | pydantic 의존 | pydantic v2 코어 |
| `supabase` | database.py, services/*, scripts/* | DB 클라이언트 |
| `supabase-auth` | supabase 의존 | gotrue 인증 |
| `supabase-functions` | supabase 의존 | Edge Functions |
| `storage3` | supabase 의존 | 파일 스토리지 |
| `postgrest` | utils.py (APIError) | PostgREST 클라이언트 |
| `realtime` | supabase 의존 | 실시간 구독 |
| `loguru` | logger.py, websocket_manager.py | 로깅 |
| `python-dotenv` | database.py, scripts/* | 환경변수 로딩 |
| `httpx` | utils.py (HTTPStatusError) | HTTP 클라이언트 |
| `python-multipart` | FastAPI File/UploadFile | iv_service.py 파일 업로드 |

### 전이적 의존성 (위 패키지들의 런타임 필수)
| 패키지 | 상위 패키지 |
|--------|------------|
| `anyio` | fastapi/starlette 비동기 런타임 |
| `sniffio` | anyio |
| `annotated-types` | pydantic |
| `typing-extensions` | pydantic, starlette |
| `typing-inspection` | pydantic |
| `httpcore` | httpx |
| `h11` | httpcore, uvicorn |
| `h2` | httpx HTTP/2 |
| `hpack` | h2 |
| `hyperframe` | h2 |
| `certifi` | httpx SSL |
| `idna` | httpx |
| `charset-normalizer` | requests |
| `urllib3` | requests |
| `click` | uvicorn CLI |
| `cryptography` | supabase-auth JWT 서명·검증 |
| `cffi` | cryptography |
| `pycparser` | cffi |
| `multidict` | yarl, realtime |
| `yarl` | realtime/aiohttp |
| `propcache` | yarl |
| `websockets` | realtime WebSocket |
| `websocket-client` | realtime WebSocket |
| `wsproto` | WebSocket 프로토콜 |
| `msgpack` | realtime 직렬화 |
| `tenacity` | postgrest 재시도 |
| `deprecation` | supabase 호환성 |
| `python-dateutil` | supabase 날짜 파싱 |
| `pytz` | datetime |
| `tzdata` | 타임존 DB |
| `pywin32` | Windows API (프로덕션 서버가 Windows) |
| `pywin32-ctypes` | pywin32 의존 |
| `win32-setctime` | loguru Windows 파일 타임스탬프 |
| `pyjwt` | supabase-auth 내부 + scripts/check_key_role.py |

---

## 🛠️ DEV (테스트·린트·타입체크 전용)

| 패키지 | 용도 |
|--------|------|
| `pytest` | 테스트 프레임워크 |
| `pytest-cov` | 커버리지 측정 |
| `coverage` | 커버리지 리포트 |
| `iniconfig` | pytest 설정 파싱 |
| `pluggy` | pytest 플러그인 시스템 |
| `mypy` | 정적 타입 검사 |
| `mypy-extensions` | mypy 확장 |
| `pathspec` | mypy `.gitignore` 패턴 파싱 |
| `platformdirs` | mypy/pylint 플랫폼 경로 |
| `pylint` | 코드 린팅 |
| `astroid` | pylint AST 엔진 |
| `mccabe` | 복잡도 검사 (pylint) |
| `isort` | import 정렬 |
| `setuptools` | 패키지 빌드 도구 |
| `watchdog` | uvicorn `--reload` 파일 감시 (개발 모드만) |
| `types-requests` | mypy 타입 스텁 |
| `types-google-cloud-ndb` | mypy 타입 스텁 |

---

## 🔧 TOOLS (스크립트·GUI·AI·데이터처리 — 서버 불필요)

### GUI 프레임워크
| 패키지 | 용도 |
|--------|------|
| `flet` | Flutter 기반 Python GUI |
| `flet-cli` | flet CLI 도구 |
| `flet-desktop` | flet 데스크탑 런타임 |
| `customtkinter` | 모던 tkinter GUI |
| `darkdetect` | 다크모드 감지 (customtkinter 의존) |

### AI / Google API
| 패키지 | 용도 |
|--------|------|
| `google-generativeai` | Gemini AI API |
| `google-ai-generativelanguage` | Gemini 하위 모듈 |
| `google-api-python-client` | Google API 클라이언트 |
| `google-api-core` | Google API 코어 |
| `google-auth` | Google OAuth 인증 |
| `google-auth-httplib2` | google-auth httplib2 어댑터 |
| `google-auth-oauthlib` | google-auth OAuth 플로우 |
| `googleapis-common-protos` | Google Protobuf 공용 타입 |
| `grpcio` | gRPC (google-generativeai 의존) |
| `grpcio-status` | gRPC 상태 코드 |
| `proto-plus` | Protobuf Python 래퍼 |
| `protobuf` | Protocol Buffers |
| `cachetools` | google-auth 토큰 캐시 |
| `pyasn1` | google-auth ASN.1 파싱 |
| `pyasn1-modules` | google-auth ASN.1 모듈 |
| `rsa` | google-auth RSA 서명 |
| `oauthlib` | OAuth 프로토콜 |
| `requests-oauthlib` | OAuth + requests |
| `httplib2` | google-auth-httplib2 의존 |
| `uritemplate` | google-api URI 템플릿 |

### 브라우저 자동화
| 패키지 | 용도 |
|--------|------|
| `selenium` | Chrome 브라우저 자동화 |
| `undetected-chromedriver` | 감지 우회 ChromeDriver |
| `webdriver-manager` | ChromeDriver 자동 관리 |
| `playwright` | Microsoft Playwright 브라우저 자동화 |
| `playwright-stealth` | Playwright 감지 우회 |
| `pyee` | playwright EventEmitter |
| `pysocks` | SOCKS 프록시 (selenium/playwright) |
| `trio` | playwright 비동기 런타임 |
| `trio-websocket` | trio WebSocket |
| `outcome` | trio 결과 타입 |
| `sortedcontainers` | trio 내부 자료구조 |
| `greenlet` | psycopg2 코루틴 |
| `attrs` | trio/outcome 의존 |

### 데이터 처리
| 패키지 | 용도 |
|--------|------|
| `pandas` | 데이터프레임 분석 |
| `numpy` | 수치 연산 |
| `openpyxl` | Excel 읽기·쓰기 |
| `et-xmlfile` | openpyxl XML 의존 |
| `pyhwp` | 한글(HWP) 문서 파싱 |
| `pyhwpx` | HWP 확장 파싱 |
| `pymupdf` | PDF 처리 |
| `lxml` | XML/HTML 파싱 (pyhwp 의존) |
| `beautifulsoup4` | HTML 스크래핑 |
| `soupsieve` | beautifulsoup CSS 셀렉터 |
| `olefile` | OLE2 파일 형식 (pyhwp) |
| `fsspec` | 파일시스템 추상화 (pandas/pyiceberg) |
| `pyiceberg` | Apache Iceberg 데이터 레이크 |
| `pyroaring` | pyiceberg 비트맵 인덱스 |
| `mmh3` | pyiceberg 해시 함수 |
| `zstandard` | 압축 (pyiceberg) |
| `dill` | 확장 직렬화 |
| `tqdm` | 진행 표시줄 |

### 빌드·패키징
| 패키지 | 용도 |
|--------|------|
| `pyinstaller` | 실행 파일 패키징 |
| `pyinstaller-hooks-contrib` | pyinstaller 훅 모음 |
| `altgraph` | pyinstaller 의존 그래프 |
| `pefile` | pyinstaller PE 포맷 파싱 |

### DB 직접 연결
| 패키지 | 용도 |
|--------|------|
| `psycopg2-binary` | PostgreSQL 직접 연결 |
| `peewee` | 경량 ORM |

### 프로젝트 템플릿·도구
| 패키지 | 용도 |
|--------|------|
| `cookiecutter` | 프로젝트 템플릿 생성 |
| `jinja2` | cookiecutter 템플릿 엔진 |
| `markupsafe` | jinja2 의존 |
| `arrow` | cookiecutter 날짜 처리 |
| `binaryornot` | cookiecutter 바이너리 감지 |
| `python-slugify` | cookiecutter 슬러그 생성 |
| `text-unidecode` | python-slugify 유니코드 변환 |
| `strictyaml` | cookiecutter YAML 파싱 |
| `rich` | 터미널 서식 출력 |
| `markdown-it-py` | rich Markdown 렌더링 |
| `mdurl` | markdown-it-py URL 처리 |
| `pygments` | rich 코드 하이라이팅 |
| `colorama` | Windows 터미널 색상 |
| `pyperclip` | 클립보드 복사 |
| `psutil` | 프로세스·시스템 모니터링 |
| `pyyaml` | YAML 파싱 (flet/cookiecutter) |
| `tomlkit` | TOML 편집 (flet 설정) |
| `six` | Python 2/3 호환 레이어 |

---

## ❓ UNKNOWN (직접 import 없음 — 확인 필요)

> **다음 항목은 `grep -r "import {pkg}" backend/ --include="*.py"` 결과 직접 import 없음.**
> Task 2 진행 전 사용자 확인 요청.

| 패키지 | 의심 용도 | 권고 |
|--------|----------|------|
| `qrcode` | QR코드 생성 — backend 전체 grep 결과 직접 import 없음 | **→ TOOLS 이동 권고** (이전 기능 잔류로 추정) |
| `pillow` | 이미지 처리 — 직접 import 없음 | **→ TOOLS 이동 권고** (qrcode 의존 가능) |
| `requests` | HTTP 동기 클라이언트 — supabase 내부 일부 사용 가능 | **CORE 전이적으로 유지 권고** (supabase sync 경로) |
| `strenum` | 문자열 Enum 확장 — 직접 import 없음 | **미사용 가능 → 제거 검토** |
| `packaging` | 버전 파싱 — 다수 패키지 전이적 의존 | DEV/TOOLS 어디든 전이적이므로 명시 불필요 |
| `pyparsing` | 파싱 유틸 — packaging 의존 | 위와 동일 |
| `librt` | Windows 실시간 라이브러리 추정 | **출처 불명 — flet 또는 playwright 의존 가능 → TOOLS** |
| `repath` | 경로 라우팅 — flet 의존 추정 | **→ TOOLS** |
| `annotated-doc` | 어노테이션 문서 생성 추정 | **출처 불명 — 미사용이면 제거 권고** |

---

## ⚠️ 주의 사항

1. **`[dependency-groups].dev`에 이미 `pytest`, `pytest-cov` 존재** — Task 2에서 `[project].dependencies`에서 제거 필요
2. **`pyjwt`의 이중 역할** — supabase-auth 전이적 의존 + scripts 직접 사용. CORE에 유지 권고
3. **`requests`** — 비동기 서버에서 직접 사용 안 하지만 supabase 내부 sync 경로에서 사용 가능 → CORE 유지 권고
4. **`qrcode`, `pillow`** — Phase 1~3 아키텍처 개선 중 제거된 기능 잔류 가능. **실제 사용처 확인 필요**

---

## ✅ 다음 단계 (Task 2 진행 조건)

- [x] `qrcode`, `pillow` grep 확인 완료 → 직접 import 없음 → TOOLS 이동 결정
- [ ] 위 분류 내용 사용자 승인
- [ ] 승인 후 `pyproject.toml` 그룹 분리 (Task 2) 착수
