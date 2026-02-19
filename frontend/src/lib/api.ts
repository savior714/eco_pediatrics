/// <reference path="../types/tauri-plugins.d.ts" />
// Export constant for use elsewhere if needed, but prefer using api instance
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Detect Tauri environment (Tauri v2 compatible)
const isTauri = typeof window !== 'undefined' &&
    ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

// Caching Tauri functions to avoid redundant dynamic imports
let cachedTauriFetch: any = null;
let cachedTauriLog: any = null;

// 중복 요청 방지를 위한 단순 캐시 (100ms 내 동일 URL 무시)
const pendingRequests = new Map<string, number>();

const getTauriFetch = async () => {
    if (!isTauri) return window.fetch;
    if (cachedTauriFetch) return cachedTauriFetch;

    try {
        const { fetch } = await import('@tauri-apps/plugin-http');
        cachedTauriFetch = fetch;
        return fetch;
    } catch (e) {
        console.error('Failed to load Tauri fetch:', e);
        return window.fetch;
    }
};

const tauriLog = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
    if (!isTauri) return;

    try {
        if (!cachedTauriLog) {
            const { info, warn, error, debug } = await import('@tauri-apps/plugin-log');
            cachedTauriLog = { info, warn, error, debug };
        }
        // WebView2 상태 확인 및 가드: 윈도우가 닫히는 중이면 실행 중단
        if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;
        cachedTauriLog[level](`[Frontend] ${message}`);
    } catch (e) {
        /* 0x8007139F 방지를 위해 에러 캡슐화 */
    }
};

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        // 중복 요청 디바운싱 (특히 GET 요청에 대해)
        const requestKey = `${options?.method || 'GET'}:${url}`;
        const now = Date.now();
        if ((options?.method || 'GET') === 'GET' && pendingRequests.has(requestKey)) {
            if (now - (pendingRequests.get(requestKey) || 0) < 100) {
                return {} as T; // 100ms 이내 중복 요청은 무시
            }
        }
        pendingRequests.set(requestKey, now);

        // Use Tauri Native Fetch if available (Bypasses CORS/CSP)
        const fetchFn = await getTauriFetch();
        const fetchType = fetchFn === window.fetch ? 'Browser Fetch' : 'Tauri Native Fetch';

        await tauriLog('info', `Requesting [${fetchType}]: ${options?.method || 'GET'} ${url}`);

        try {
            const res = await fetchFn(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error');
                const errorMsg = `API Error ${res.status}: ${errorText}`;
                console.error(errorMsg);
                await tauriLog('error', `API Failure: ${options?.method || 'GET'} ${url} -> ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Return empty object for 204 No Content, otherwise JSON
            if (res.status === 204) return {} as T;

            // Check if response has content
            const text = await res.text();
            return text ? JSON.parse(text) : ({} as T);
        } catch (err: any) {
            const detail = err instanceof Error ? err.message : JSON.stringify(err);
            await tauriLog('error', `Fetch Fatal: ${options?.method || 'GET'} ${url} -> ${detail}`);
            const isConnectionError = /sending request|ECONNREFUSED|Failed to fetch|NetworkError/i.test(detail);
            if (isConnectionError) {
                console.error(
                    'Fetch Fatal Detail: 백엔드에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.\n' +
                    `  URL: ${url}\n` +
                    '  예: backend 폴더에서 uv run uvicorn main:app --port 8000 --host 0.0.0.0\n' +
                    '  (Windows 포트 이슈 시 8080 사용 및 NEXT_PUBLIC_API_URL=http://localhost:8080 설정)',
                    err
                );
            } else {
                console.error('Fetch Fatal Detail:', err);
            }
            throw err;
        }
    }

    get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    patch<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }
}

export const api = new ApiClient(API_BASE);
