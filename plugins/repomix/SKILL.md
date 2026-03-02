---
name: repomix
description: "프로젝트 맞춤형 코드베이스 통합 덤프 생성 가이드 및 30분 초고속 워크플로우를 지원합니다."
---

# repomix 스킬 (Self-Bootstrapping Guide)

이 스킬은 프로젝트의 핵심 맥락(Code + SSoT)을 하나의 파일로 응축하여 AI에게 최적의 '두뇌'를 제공합니다. 이 문서 하나만으로 프로젝트 성격에 맞는 덤프 스크립트를 즉시 구성할 수 있습니다.

## 📋 1. 준비 단계 (Setup)

어떤 프로젝트에서든 `npx`를 사용할 수 있는 환경(Node.js)만 있다면 즉시 가동 가능합니다.

1. **출력 위치**: 보통 `docs/repomix-output.md` 경로를 SSOT로 사용합니다.
2. **스크립트 생성**: 아래 **[2. 프로젝트별 맞춤형 스크립트 템플릿]**을 복사하여 `scripts/Invoke-Repomix.ps1` 파일을 만드십시오.

## 🛠️ 2. 프로젝트별 맞춤형 스크립트 템플릿

프로젝트의 아키텍처에 따라 `$IncludePatterns`를 수정하여 최적의 컨텍스트를 구성하십시오.

```powershell
# [Invoke-Repomix.ps1]
$ErrorActionPreference = "Continue"
Write-Host "[*] 컨텍스트 덤프 생성 시작..." -ForegroundColor Cyan

# 💡 프로젝트 성격에 따라 수정하십시오
# 1. 일반적인 Python/JS 프로젝트: "src/**, docs/*.md, README.md"
# 2. Tauri/Full-stack 프로젝트: "src/**, frontend/src/**, docs/*.md, package.json"
$IncludePatterns = "src/**,docs/*.md,mission.md,context.md,checklist.md,README.md"

# 🚫 제외할 노이즈 (가비지 데이터)
$ExcludePatterns = "**/.venv/**,**/node_modules/**,**/dist/**,**/build/**,**/*.lock,*.log,data/**,logs/**,sources/**"

# Repomix 실행 (Latest Markdown Style)
npx repomix@latest --style markdown --include $IncludePatterns -i $ExcludePatterns -o docs/repomix-output.md

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] 덤프 완료: docs/repomix-output.md" -ForegroundColor Green
}
```

## 🔍 3. 패턴 커스터마이징 가이드 (Architecture-Specific)

스킬을 적용할 프로젝트의 폴더 구조에 따라 다음 기준을 적용하십시오.

- **White-list (Include)**: AI가 반드시 알아야 할 **인프라, 비즈니스 로직, 데이터 모델, SSoT 문서**를 포함합니다.
- **Black-list (Exclude)**: 텍스트가 아닌 파일(Image, Font), 라이브러리 소스(node_modules), 거대 바이너리 데이터(DB 파일)를 제외하여 토큰 효율을 극대화합니다.
- **Style**: 반드시 `--style markdown` 옵션을 사용하여 AI가 `<file path="...">` 태그를 통해 각 파일의 경계를 명확히 인식하게 하십시오.

## 💡 4. 30분 AI 워크플로우 (Core Usage)

생성된 `docs/repomix-output.md`는 AI와의 대화에서 다음과 같은 주기를 가집니다.

1. **계획(Planning)**: 웹 LLM(Gemini 2.0 Pro 등)에 덤프 전체를 붙여넣고 "Step 1(백엔드), Step 2(프론트) 작업 지시서를 작성해 줘"라고 요청합니다.
2. **실행(Implementation)**: 추출된 지시서를 IDE 에이전트(Cursor 등)에 전달하여 정밀하게 코딩합니다.
3. **완료(Finalize)**: 코딩이 끝나면 다시 이 스킬을 가동하여 덤프를 갱신, 다음 작업의 정확한 기초 컨텍스트로 사용합니다.

---
> **Senior Architect's Tip**: 이 `SKILL.md` 자체가 `repomix` 설정의 정석이므로, 새로운 프로젝트를 시작할 때 이 파일을 먼저 읽어 프로젝트의 '컨텍스트 덤프 규칙'을 정의하십시오.