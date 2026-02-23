# 문서·워크플로우 변경 이력

## 2025-02-23

### repomix 출력 통합 — 한 파일만 사용

- **변경 요약**: repomix는 **`docs/repomix-output.md` 한 파일만** 생성·사용하도록 통일. 백엔드/프론트 분리 옵션 제거.
- **사용 방식**: 같은 파일을 붙여넣고 **백엔드(Step 1)** 먼저 물어본 뒤, 같은 파일 다시 붙여넣고 **프론트(Step 2)** 따로 물어보는 흐름만 유지.

**수정·반영된 파일**

| 대상 | 내용 |
|------|------|
| `scripts/Invoke-Repomix.ps1` | 출력을 `docs/repomix-output.md` 한 개만 생성 (이미 반영됨) |
| `docs/prompts/WORKFLOW_30MIN_PROMPTS.md` | 경로/생성/용도를 repomix-output.md 한 파일만 쓰도록 수정. Phase 0·기능별 더 줄이기·백/프론트 분리 설명 제거. Phase 1은 같은 파일 붙여넣고 Step 1 → Step 2 순서로 문구 정리 |
| `docs/WORKFLOW_30MIN_AI_CODING.md` | 전제·섹션 0·Phase 1을 통합 한 파일 기준으로 수정. 두/세 파일 생성 문구 제거, 표·정리에서 repomix-output.md만 유지 |
| `.gitignore` | `docs/repomix-backend.md`, `docs/repomix-frontend.md` 항목 제거 (미생성 파일) |

**참고**: `docs/repomix-output.md`는 `.gitignore`에 포함되어 있어 로컬에서만 생성·사용되며 커밋되지 않음.
