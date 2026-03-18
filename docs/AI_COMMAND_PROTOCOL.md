# 🛡️ AI Command Protocol — Zero-Error Terminal Guide

> **용도**: AI 에이전트(Antigravity, Cursor, Claude Code 등)가 PowerShell/Node.js 명령어를 실행할 때 반복 발생하는 오류를 원천 차단하기 위한 실증 기반 참조 문서.
> **적응 범위**: 이 파일을 프로젝트의 `docs/` 폴더에 두면 AI가 온보딩 시 자동으로 읽어 동일한 안전망이 작동합니다.

---

## 0. [CRITICAL] Tool-First & Zero-Shell Discovery (절대 금지 원칙)

파일 탐색, 검색, 목록 조회 시 OS 쉘 명령어의 **사용을 전면 금지**합니다. 에이전트는 반드시 **IDE 전용 구조화 도구**만을 사용해야 합니다.

> **금지 근거**: 쉘 출력물은 비정형 텍스트로 Context Window를 오염시키고(Context Hygiene), 환경별로 결과가 달라지며(Determinism), 경로 오파싱으로 인한 치명적 Side Effect(오삭제, 오수정)를 유발합니다(Type-Safety).

| 작업 유형           | 쉘 명령어 (**전면 금지**)                  | Claude Code         | Cursor / Antigravity                        |
| ------------------- | ------------------------------------------ | ------------------- | ------------------------------------------- |
| 파일/폴더 검색      | `dir /s`, `find`, `Get-ChildItem -Recurse` | **`Glob`**          | **`find_by_name`**                          |
| 파일 내 텍스트 검색 | `grep`, `Select-String`, `dir /s \| grep`  | **`Grep`**          | **`grep_search`**                           |
| 폴더 목록 조회      | `ls`, `dir`                                | **`Glob`**          | **`list_dir`**                              |
| 파일 내용 읽기      | `cat`, `type`, `Get-Content`               | **`Read`**          | **`view_file`**                             |
| 파일 생성/수정      | `Set-Content`, `echo >`, `Add-Content`     | **`Write`, `Edit`** | **`write_to_file`, `replace_file_content`** |

> **예외**: 프로젝트 빌드(`npm run`), 타입 체크(`tsc`), 패키지 관리(`npm install`) 등 **전용 도구가 물리적으로 존재하지 않는 경우**에만 Section 1~7의 안전 수칙을 준수하여 PowerShell을 사용합니다. 이 경우에도 `ls`/`dir` 등 **탐색형 명령어는 절대 혼용 금지**합니다.

---

## 1. File Guard — `cd`는 폴더 전용

### 증상

```
cd '...memory.md' 경로는 존재하지 않으므로 찾을 수 없습니다.
```

### 원인

`Set-Location` (`cd`)은 **디렉토리 전용** 명령어입니다. 파일 경로를 전달하면 PowerShell이 해당 이름의 폴더를 찾으려다 실패합니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시
cd 'c:\develop\project\docs\memory.md'

# ✅ 파일 내용 읽기
Get-Content -LiteralPath 'c:\develop\project\docs\memory.md' -TotalCount 50

# ✅ 파일이 있는 폴더로 이동
Set-Location 'c:\develop\project\docs'
```

---

## 2. Pipeline Guard — `Join-Path` 파이프 금지

### 증상

```
입력을 매개 변수에 바인딩할 수 없습니다. 매개 변수 "Path" 값 "..."을(를) "System.String" 형식으로 변환할 수 없습니다.
```

### 원인

`Join-Path`의 출력은 파이프라인으로 전달할 때 `Get-Content`가 어느 매개변수(`-Path` vs `-LiteralPath`)에 바인딩할지 결정하지 못하거나, 타입 변환에 실패합니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시
Join-Path "docs" "memory.md" | Get-Content

# ✅ 괄호(서브 익스프레션)로 실행 순서 명시
Get-Content (Join-Path "docs" "memory.md") -TotalCount 30

# ✅ 변수를 통한 명시적 분리 (가독성 우선)
$path = Join-Path $PSScriptRoot "docs" "memory.md"
Get-Content -LiteralPath $path -TotalCount 30
```

---

## 3. CLI Arg Guard — `next lint` 인자 오해석

### 증상

```
Invalid project directory provided, it must be an absolute path: C:\...\frontend\lint
```

### 원인

`npm run lint`를 루트에서 실행하면 내부적으로 `next lint`가 호출됩니다. 이때 `--` 이후의 인자를 Next.js가 **"검사할 디렉토리 경로"**로 해석하여 `frontend/lint` 폴더를 찾으려다 실패합니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시 (루트에서 실행, 인자 충돌)
npm run lint -- frontend

# ✅ 대상 디렉토리로 먼저 이동 후 실행
Set-Location frontend; npm run lint

# ✅ package.json scripts에 경로 고정 (근본 해결)
# frontend/package.json:
# "scripts": { "lint": "next lint", "type-check": "tsc --noEmit" }
```

> **추천**: 서브패키지의 `package.json`에 `lint`, `type-check` 스크립트를 명시하여 루트에서 인자를 전달할 필요를 없애는 것이 가장 안전합니다.

---

## 4. npx Guard — 로컬 미설치 패키지 실행 차단

### 증상

```
This is not the tsc command you are looking for
```

### 원인

`npx`는 로컬 `node_modules`에 해당 패키지가 없을 경우 보안상 실행을 차단합니다. 즉, 현재 프로젝트에 `typescript`가 설치되어 있지 않은 상태입니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시 (로컬에 typescript 없으면 차단)
npx tsc --noEmit

# ✅ 패키지명을 명시하여 강제 실행
npx -p typescript tsc --noEmit

# ✅ package.json에 type-check 스크립트 정의 (근본 해결)
# "scripts": { "type-check": "tsc --noEmit" }
# 이후: npm run type-check

# ✅ 특정 tsconfig를 명시하는 경우
npx -p typescript tsc --noEmit --project frontend/tsconfig.json
```

---

## 5. File I/O Guard — 프로필 보안 정책에 의해 차단된 Cmdlet

### 증상

```
[Security] Add-Content 사용이 금지되었습니다. [System.IO.File]::AppendAllText를 사용하십시오.
```

### 원인

PowerShell `$PROFILE`에 `Add-Content`, `Set-Content`, `Out-File`에 대한 **보안 훅(Hook)**이 설정되어 있습니다.
이 cmdlet들은 호출 즉시 `RuntimeException`을 throw하고 작업이 중단됩니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시 (프로필 보안에 의해 차단됨)
Add-Content -Path 'docs\memory.md' -Value "`n새 로그 항목"
Set-Content -Path 'docs\memory.md' -Value $content
$output | Out-File -FilePath 'docs\memory.md'

# ✅ 파일 끝에 내용 추가 (Add-Content 대체)
[System.IO.File]::AppendAllText(
    'c:\develop\project\docs\memory.md',
    "`n새 로그 항목",
    [System.Text.Encoding]::UTF8
)

# ✅ 파일 전체 덮어쓰기 (Set-Content / Out-File 대체)
[System.IO.File]::WriteAllText(
    'c:\develop\project\docs\memory.md',
    $content,
    [System.Text.Encoding]::UTF8
)
```

> **주의**: 경로는 반드시 **절대 경로** 문자열로 전달해야 합니다. `$PSScriptRoot` 또는 `Join-Path`로 조합한 뒤 변수로 전달하세요.

```powershell
# ✅ 경로 조합 후 변수 사용 (권장 패턴)
$memoryPath = Join-Path 'c:\develop\project' 'docs\memory.md'
[System.IO.File]::AppendAllText($memoryPath, "`n로그 내용", [System.Text.Encoding]::UTF8)
```

---

## 6. CMD vs PowerShell Guard — `dir /s /b` 및 슬래시 기반 옵션 금지

### 증상

```powershell
dir /s /b src\lib\api.ts
# Get-ChildItem : 'src\lib\api.ts' 인수를 허용하는 위치 매개 변수를 찾을 수 없습니다.
# CategoryInfo : InvalidArgument: (:) [Get-ChildItem], ParameterBindingException
# FullyQualifiedErrorId : PositionalParameterNotFound,Microsoft.PowerShell.Commands.GetChildItemCommand
```

### 원인

PowerShell에서 `dir`, `ls`는 **CMD**나 **Bash**의 명령어가 아닌 `Get-ChildItem`의 **별칭(Alias)**입니다.

- **CMD 스타일**의 `/s`, `/b`, `/ad` 등 **슬래시(/) 기반 스위치**를 전혀 인식하지 못합니다.
- PowerShell은 하이픈(`-`) 기반의 명명된 매개변수(`-Recurse`, `-Filter`)를 사용해야 합니다.
- 인식할 수 없는 옵션이 들어오면 이를 위치 매개변수(Positional Parameter)로 오해하여 오류를 발생시킵니다.

### 올바른 명령

```powershell
# ❌ 잘못된 예시 (CMD/DOS 스타일)
dir /s /b src\lib\api.ts
ls -R | grep api.ts (PowerShell에서는 작동 방식이 다름)

# ✅ PowerShell 표준: 파일 검색 및 전체 경로 출력
(Get-ChildItem -Path "src" -Filter "api.ts" -Recurse).FullName

# ✅ PowerShell 표준: 디렉토리만 리스팅 (dir /ad 대체)
Get-ChildItem -Directory

# ✅ PowerShell 표준: 숨김 파일 포함 (dir /ah 대체)
Get-ChildItem -Force

# ✅ 최우선 권장: 전용 도구 활용
# Antigravity 환경에서는 find_by_name 또는 grep_search 도구를 사용하면 PowerShell 구문 오류를 완벽히 피할 수 있습니다.
```

---

## 7. Metric Guard — 물리적 라인 수 자가 검증

### 증상

"300라인 안 넘어요"라고 말했는데 실제로는 넘어서 룰 위반이 발생하는 경우.

### 원인

에이전트의 내부 토큰 계산과 물리적 파일의 Newline(`\n`) 계산 방식 차이로 인한 오차.

### 올바른 명령

```powershell
# ✅ 특정 파일의 라인 수 확인 (표준)
(Get-Content -LiteralPath 'docs\memory.md').Count

# ✅ 특정 파일이 300라인을 넘었는지 즉시 판별
$count = (Get-Content -LiteralPath 'src\lib\api.ts').Count; if ($count -gt 300) { Write-Host "REFAC REQUIRED: $count lines" }
```

---

## 요약 대조표

| #   | 오류 유형              | 핵심 원인                    | 즉각 해결책                         |
| --- | ---------------------- | ---------------------------- | ----------------------------------- |
| 1   | **파일에 `cd`**        | `cd`는 폴더 전용             | `Get-Content -LiteralPath`          |
| 2   | **파이프라인 바인딩**  | 타입/바인딩 불일치           | `Get-Content (Join-Path ...)`       |
| 3   | **`next lint` 인자**   | CLI가 인자를 경로로 오해     | `cd target; npm run lint`           |
| 4   | **`npx` 차단**         | 로컬 패키지 미설치           | `npx -p typescript tsc`             |
| 5   | **`Add-Content` 차단** | 프로필 보안 정책             | `[System.IO.File]::AppendAllText()` |
| 6   | **`dir /s /b`**        | PowerShell에서 CMD 옵션 사용 | `Get-ChildItem -Recurse`            |
| 7   | **라인 수 오판**       | 수동 계산 오류               | `(Get-Content <file>).Count`        |

---

## 프로젝트 레벨 예방 설정

새 프로젝트에서 위 오류를 **구조적으로 예방**하려면 아래 설정을 심어두세요.

### `package.json` (서브패키지 기준)

```json
{
  "scripts": {
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check"
  }
}
```

### `.npmrc` (루트)

```ini
# 버전 고정 및 로컬 우선 실행
save-exact=true
prefer-offline=true
```

---

> **참조 문서**: [AI_GUIDELINES.md](../AI_GUIDELINES.md) 섹션 2 (TPG Protocol) / [.antigravityrules](../.antigravityrules) 섹션 3
