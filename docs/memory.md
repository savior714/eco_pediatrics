# Memory (Append-Only)

## Executive Summary
본 문서는 `Antigravity IDE Agent`의 연속성 보존을 위한 실시간 메모리 로그입니다.
- **TS 타입 오류 수정 (2026-03-10)**: `DocumentStatus`에 `CANCELED` 추가, `LucideIcon` props 타입 완화, `TemperatureGraph activeDot` 캐스팅.
- **Tauri IPC 아키텍처 전환 (2026-03-10)**: QR 미리보기 창 Re-instance → IPC emit/listen 패턴. `WindowManager` 유틸(`src/utils/tauriWindowManager.ts`) 분리. `capabilities/default.json`에 `core:event:default` 추가.
- **Phase 2 상태관리 안정화 (2026-03-10)**: React Query 도입, WS Exponential Backoff, StationContext 격리.
- **Phase 1 타입 안전성 (2026-03-10)**: TS any 제거, pendingMutations, ErrorBoundary, toaster 전환.
- **Windows Terminal 안정화 (2026-03-06)**: PSScriptRoot Self-Location 패턴, PowerShell 7→5.1 폴백.
- **인프라 (2026-03-03)**: eco.bat ANSI 인코딩, DNS IPv6 최적화, Tauri 창 싱글톤 패턴.

---

## Logs

### [2026-03-10] - TS 타입 오류 전수 수정
[Context] tsc --noEmit 실행 결과 기존 파일에서 7개 타입 오류 발견.
[Action]
- **domain.ts**: `DocumentStatus = 'PENDING' | 'FULFILLED' | 'CANCELED'` — 백엔드가 실제 사용하는 CANCELED 값 누락 수정.
- **IVLabelPreviewModal.tsx**: `MedSectionProps.icon` 타입을 `ComponentType<{size?: number}>` → `ComponentType<{size?: number | string}>` 완화. Lucide v3의 LucideProps.size가 `string | number`임을 반영.
- **TemperatureGraph.tsx**: `activeDot` 파라미터를 `(props: unknown)` + 내부 `as ChartDotProps` 캐스팅으로 교체. Recharts v2 오버로드 서명 요구 대응.
[Status] 완료. tsc --noEmit 오류 0개 확인.

### [2026-03-10] - Phase 3: Tauri IPC 아키텍처 전환 완료
[Context] QR 미리보기 창 Re-instance(close → 200ms delay → new WebviewWindow) 패턴의 UX 지연 및 Race Condition 개선.
[Action]
- **src/utils/tauriWindowManager.ts**: getOrCreate / sendEvent / focusWindow 3개 메서드로 창 관리 추상화.
- **QrCodeModal.tsx**: 창 존재 시 emit('update-preview-patient', {token}) + focusWindow(). 창 없을 시만 getOrCreate(). close/setTimeout(200ms) 로직 완전 제거.
- **useDashboardStats.ts**: listen('update-preview-patient') 구독. ipcToken state로 받아 urlToken보다 우선 적용(ipcToken ?? urlToken). cleanup 시 unlisten() 호출.
- **capabilities/default.json**: core:event:allow-emit/allow-listen → core:event:default(4개 일괄 포함)로 교체. allow-unlisten 누락 방지.
[Status] 완료
[Technical Note] Tauri emit()은 전역 브로드캐스트. emitTo()는 특정 창 타겟 가능하나 미리보기 창 1개뿐이므로 emit()으로 충분. CRITICAL_LOGIC.md 2.8절에 IPC 표준 명문화 완료.
- 현재 docs/memory.md 줄 수: 47/200
