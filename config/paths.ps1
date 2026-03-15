# [SSOT] 프로젝트 공유 경로·설정 상수 (AI_GUIDELINES §6)
# 사용 방법: . (Join-Path $PSScriptRoot "..\config\paths.ps1")
# $script: 스코프로 정의하여 Dot-sourcing 시 변수 오염을 방지한다.

# --- 배치 파일 관련 ---
$script:ECO_BAT_FILES      = @("eco.bat", "start_backend_pc.bat")
$script:ECO_BAT_NAME       = "eco.bat"

# --- Cargo/Rust 경로 ---
$script:CARGO_BIN_SUBPATH  = ".cargo\bin"

# --- Windows SDK 경로 세그먼트 ---
$script:SDK_KITS_SUBPATH   = "Windows Kits\10"

# --- PowerShell 실행 엔진 ---
$script:PS_ENGINE_PRIMARY  = "pwsh.exe"
$script:PS_ENGINE_FALLBACK = "powershell.exe"

# --- Repomix 포함/제외 목록 ---
$script:REPOMIX_INCLUDE    = "backend/main.py,backend/routers/**,backend/services/**,backend/models.py,backend/constants/**,backend/utils.py,backend/schemas.py,backend/database.py,backend/dependencies.py,backend/logger.py,backend/websocket_manager.py,backend/scripts/**,backend/requirements*.txt,supabase/migrations/**,supabase/schema.sql,supabase/config.toml,docs/**,frontend/src/**,frontend/package.json,frontend/next.config.*,frontend/tsconfig.json"
$script:REPOMIX_IGNORE     = "docs/repomix*.md,docs/tree.txt,docs/prompts/archive/**,**/.env,**/.env.*,**/.env.local,**/*.pem,**/service-account*.json,**/*.key"

# --- 문서 루트 상대 경로 ---
$script:DOCS_ROOT_REL      = "docs"
$script:DOCS_ARCHIVE_REL   = "docs/prompts/archive"
