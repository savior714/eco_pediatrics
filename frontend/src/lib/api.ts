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

    private async request<T>(endpoint: string, options?: RequestInit, retryCount = 0): Promise<T> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        // 중복 요청 디바운싱 (특히 GET 요청에 대해)
        const requestKey = `${options?.method || 'GET'}:${url}`;
        const now = Date.now();
        if ((options?.method || 'GET') === 'GET' && pendingRequests.has(requestKey)) {
            if (now - (pendingRequests.get(requestKey) || 0) < 100) {
                // 100ms 이내 중복 요청은 무시하고 이전 성공 데이터가 있다면 좋겠지만, 
                // 없으면 빈 객체 반환 (에러 유발 방지)
                return {} as T;
            }
        }
        pendingRequests.set(requestKey, now);

        // Use Tauri Native Fetch if available (Bypasses CORS/CSP)
        const fetchFn = await getTauriFetch();
        const fetchType = fetchFn === window.fetch ? 'Browser Fetch' : 'Tauri Native Fetch';

        if (retryCount === 0) {
            // [Architect Note] Non-blocking logging to prevent IPC race conditions during shutdown
            void tauriLog('info', `Requesting [${fetchType}]: ${options?.method || 'GET'} ${url}`);
        }

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

                // 404, 403 등 명확한 에러는 재시도하지 않음
                console.error(errorMsg);
                await tauriLog('error', `API Failure: ${options?.method || 'GET'} ${url} -> ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Return empty object for 204 No Content, otherwise JSON
            if (res.status === 204) return {} as T;

            const text = await res.text();
            return text ? JSON.parse(text) : ({} as T);
        } catch (err: any) {
            const detail = err instanceof Error ? err.message : JSON.stringify(err);
            const isConnectionError = /sending request|ECONNREFUSED|Failed to fetch|NetworkError|fetch/i.test(detail);

            // 연결 에러이고 재시도 횟수가 남았다면 (최대 2회)
            if (isConnectionError && retryCount < 2) {
                const delay = (retryCount + 1) * 300; // 300ms, 600ms
                void tauriLog('warn', `Fetch Retrying (${retryCount + 1}/2) in ${delay}ms: ${url}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.request<T>(endpoint, options, retryCount + 1);
            }

            void tauriLog('error', `Fetch Fatal: ${options?.method || 'GET'} ${url} -> ${detail}`);

            if (isConnectionError) {
                const guides = [
                    '1. 백엔드 서버(uvicorn)가 실행 중인지 확인하세요.',
                    `2. URL 접근성 확인: ${url}`,
                    '3. 네트워크 연결 및 방화벽 설정을 확인하세요.',
                    '4. Windows Terminal에서 BE 패널의 로그에 에러가 없는지 확인하세요.'
                ].join('\n');

                console.error(
                    `[연결 실패] 백엔드에 접속할 수 없습니다. (시도: ${retryCount + 1}회)\n${guides}`,
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
