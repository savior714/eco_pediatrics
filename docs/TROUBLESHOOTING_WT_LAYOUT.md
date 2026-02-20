# Windows Terminal Layout Race Condition (2026-02-19)

### Issue
`run_dev.bat` 실행 시, 의도한 레이아웃(상단 에러 모니터, 하단 개발 환경)이 아닌 엉뚱한 형태로 창이 분할되거나 터미널이 즉시 종료되는 현상 발생.

### Root Cause
1. **Race Condition**: `wt` 명령어가 비동기로 실행되면서 창이 생성되는 속도보다 `-p` (Pane Index)를 찾는 속도가 더 빠르거나 늦어 인덱싱이 빗나감. (특히 1.23 Preview 버전)
2. **Focus Shift**: 새 창이 생성되면 포커스가 자동으로 이동하는데, 이 시점이 불확실하여 후속 분할 명령이 엉뚱한 창을 대상으로 실행됨.
3. **Batch Parsing**: `;` 문자가 Batch 파일 내에서 쉘 구분자로 잘못 해석되어 명령어가 끊김.

### Solution: Deterministic Layout Strategy
인덱스 번호(`-p 0`)에 의존하는 논리적 타겟팅을 버리고, **물리적 커서 위치**를 기반으로 한 강제 이동 전략을 채택.

1. **Escape Characters**: `^;`를 사용하여 `wt` 내부 명령어를 온전하게 전달.
2. **Top-Down Construction**: 상단(모니터)을 먼저 만들고 하단 영역을 확보.
3. **Physical Force Move**: **`move-focus down`** 명령어를 명시적으로 사용하여 커서를 무조건 하단으로 내림.
4. **Split**: 하단에 도착한 커서 위치에서 수직 분할(`-V`) 수행.

```batch
wt -M -d . --title "ErrorMonitor" pwsh -NoExit -Command "..." ^; ^
split-pane -H -d . --title "Backend" --size 0.8 pwsh -NoExit -Command "..." ^; ^
move-focus down ^; ^
split-pane -V -d . --title "Frontend" pwsh -NoExit -Command "..."
```

### Result
5회 연속 테스트 결과 100% 동일한 레이아웃 보장 확인.

---

## 현재 구현 (scripts\launch_wt_dev.ps1)

위 이슈를 피하기 위해 **인자 배열** + **move-focus** 조합으로 고정되어 있습니다.

- **세미콜론 파싱**: `;`를 **wt 인자 배열의 한 요소**로 전달하여 PowerShell이 `;`를 명령 구분자로 해석하지 않음.
- **실행 방식**: `Start-Process "wt" -ArgumentList $wtArgs`. (런처는 같은 콘솔에서 PowerShell 실행 후 `exit`로만 종료.)
- **레이아웃 (결정론적)**: `nt` → `split-pane -H --size 0.8` (Backend) → **`move-focus down`** → `split-pane -V --size 0.5` (Frontend). `move-focus down`으로 포커스를 하단으로 고정한 뒤 수직 분할해, 상단이 2분할로 나오는 역전 현상을 방지. (`-p 1`은 환경에 따라 미동작하여 사용하지 않음.)
- Backend: `cmd /k` + `call .venv\Scripts\activate.bat`. Frontend: `cmd /k` + `npm run tauri dev` (에러 시에도 패널 유지).

상세 메뉴·CLI·설정은 `docs\DEV_ENVIRONMENT.md` §3, 전체 트러블슈팅은 `docs\TROUBLESHOOTING.md` 참고.
