---
name: skill-generator
description: "현재 프로젝트의 아키텍처를 분석하여 재사용 가능한 고품질 스킬(SKILL.md)을 설계하고 생성합니다. 복잡한 워크플로우를 자동화하거나 코딩 표준을 규정할 때 사용하세요."
---

# Skill Generator (스킬 생성기)

이 스킬은 프로젝트의 복잡한 맥락을 파악하여, AI가 일관되게 수행해야 할 특정 작업이나 워크플로우를 '스킬' 형태로 정의하고 자동 생성하는 역할을 수행합니다.

## 📋 설계 원칙 (Design Principles)

어떤 프로젝트 환경에서든 최적화된 스킬을 생성하기 위해 다음 3대 원칙을 엄격히 준수합니다.

1.  **단순성 우선 (Simplicity First)**: 불필요한 추상화나 과도한 설명을 배제하고, 목적 달성을 위한 최적의 지침과 코드만 작성합니다.
2.  **외과적 정밀함 (Surgical Precision)**: 기존의 명명 규칙(Convention), 폴더 구조, 코딩 스타일을 유지하며 목표 달성에 필요한 부분만 건드립니다.
3.  **환경 적합성 (Environment Fitness)**: 사용자의 OS(Windows/macOS/Linux), 쉘(PowerShell/zsh), 런타임(Python 3.x, Node.js 등) 버전에 완벽히 호환되도록 설계합니다.

## 🛠️ 스킬 생성 워크플로우

사용자가 특정 기능을 위한 스킬 생성을 요청하면 다음 단계를 따릅니다.

### 1단계: 프로젝트 컨텍스트 분석
- `docs/repomix-output.md` 또는 `docs/CRITICAL_LOGIC.md`가 있다면 최우선적으로 읽어 프로젝트의 SSoT를 파악합니다.
- 전체적인 폴더 구조와 핵심 기술 스택(Framework, DB, Language)을 확인합니다.

### 2단계: 스킬 설계 및 계획 수립
- 생성할 스킬의 ID(snake-case)와 목적을 정의합니다.
- 복잡한 작업이라면 원자적(Atomic) 단계로 나뉜 이행 계획(Implementation Plan)을 세웁니다.

### 3단계: SKILL.md 및 지원 파일 생성
- `.agent/skills/[스킬-ID]/SKILL.md` 파일을 생성합니다.
- 필요하다면 해당 스킬을 보조할 스크립트(`scripts/`)나 예제(`examples.md`)를 함께 설계합니다.

## 📄 출력 규격 (Output Protocol)

스킬 생성 작업이 완료되면 반드시 아래의 YAML 형식을 사용하여 아키텍트 보고를 수행합니다.

```yaml
skill-id: "[snake-case-id]"
purpose: "[스킬의 목적에 대한 간결한 설명]"
implementation-plan:
  - step: "코드 분석 및 아키텍처 설계"
  - step: "SKILL.md 구현 및 환경 변수 최적화"
  - step: "검증 시나리오 및 사용자 가이드 작성"
code-snippets:
  - path: "[파일의 상대 경로, 예: .agent/skills/my-skill/SKILL.md]"
    content: |
      [작성된 전체 소스 코드]
```

## 💡 활용 팁
- **범용성 확보**: 특정 로컬 경로(예: `C:\User\...`) 대신 환경변수나 프로젝트 루트 상대 경로(`.`)를 사용하도록 지침을 짭니다.
- **SSoT 연동**: 생성된 스킬이 프로젝트의 핵심 문서(README, AGENTS.md)와 모순되지 않는지 최종 확인합니다.