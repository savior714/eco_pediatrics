/**
 * tauriWindowManager.ts
 * Tauri 창 생명주기 및 IPC 이벤트를 중앙 관리하는 유틸 모듈.
 * QrCodeModal 등 여러 곳에서 창 관리 로직을 중복 작성하지 않도록 추상화.
 */

export interface WindowOptions {
    title?: string;
    width?: number;
    height?: number;
    resizable?: boolean;
}

export const WindowManager = {
    /**
     * 주어진 label의 창이 없으면 새로 생성, 있으면 show + setFocus.
     * 반환값: 새로 생성되었으면 true, 기존 창을 포커스했으면 false.
     */
    async getOrCreate(
        label: string,
        url: string,
        options: WindowOptions = {}
    ): Promise<boolean> {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const existing = await WebviewWindow.getByLabel(label);
        if (existing) {
            await existing.show();
            await existing.setFocus();
            return false;
        }
        const webview = new WebviewWindow(label, { url, ...options });
        webview.once('tauri://error', (e) => {
            console.error(`[WindowManager] ${label} 창 생성 오류:`, JSON.stringify(e));
        });
        return true;
    },

    /**
     * 특정 이벤트를 모든 Tauri 창에 브로드캐스트.
     * 수신 측에서 listen()으로 구독.
     */
    async sendEvent(event: string, payload: unknown): Promise<void> {
        const { emit } = await import('@tauri-apps/api/event');
        await emit(event, payload);
    },

    /**
     * 특정 label 창을 앞으로 가져옴.
     */
    async focusWindow(label: string): Promise<void> {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const win = await WebviewWindow.getByLabel(label);
        if (win) {
            await win.show();
            await win.setFocus();
        }
    },
};
