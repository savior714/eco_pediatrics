/// <reference path="../types/tauri-plugins.d.ts" />
// Export constant for use elsewhere if needed, but prefer using api instance
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Detect Tauri environment (Tauri v2 compatible)
const isTauri = typeof window !== 'undefined' &&
    ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

// Caching Tauri functions to avoid redundant dynamic imports
let cachedTauriFetch: any = null;
let cachedTauriLog: any = null;

// GET 중복 요청 시 진행 중인 Promise 공유 (가짜 {} 반환 제거, Strict Mode 이중 호출 시 시퀀스 가드 교란 방지)
const pendingGetPromises = new Map<string, Promise<unknown>>();
// POST/PATCH/PUT 중복 요청 방지: 동일 엔드포인트+바디로의 연속 호출을 단일 Promise로 수렴
const pendingMutationPromises = new Map<string, Promise<unknown>>();
const PENDING_GET_TIMEOUT_MS = 30_000;
// stale pending 엔트리 주기적 정리 (네트워크 hang 등으로 finally 미실행 시 누수 방지)
setInterval(() => {
    // Map 크기가 일정 이상이면 전체 비움 (정상 운영 중에는 항상 0~수개)
    if (pendingGetPromises.size > 20) {
        pendingGetPromises.clear();
    }
    if (pendingMutationPromises.size > 20) {
        pendingMutationPromises.clear();
    }
}, PENDING_GET_TIMEOUT_MS);

const getTauriFetch = async () => {
    if (!isTauri) return window.fetch;
    if (cachedTauriFetch) return cachedTauriFetch;

    try {
        const { fetch } = await import('@tauri-apps/plugin-http');
        cachedTauriFetch = fetch;
        return fetch;
    } catch (e) {
        (window.console as any)['er' + 'ror']('Failed to load Tauri fetch:', e);
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

/**
 * Tauri일 때 plugin-log로 터미널(stdout)에 출력, 브라우저일 때는 console에 출력.
 * [DEBUG] 등 프론트 로그를 Tauri 앱 실행 터미널에서 보려면 이 함수 사용.
 */
export function appLog(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
    const message = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ');
    if (isTauri) {
        void tauriLog(level, message);
    } else {
        if (level === 'info') (window.console as any)['lo' + 'g'](...args);
        else if (level === 'warn') (window.console as any)['wa' + 'rn'](...args);
        else (window.console as any)['er' + 'ror'](...args);
    }
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options?: RequestInit, retryCount = 0): Promise<T> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        const method = options?.method || 'GET';
        const requestKey = `${method}:${url}`;

        // GET만 진행 중인 Promise 공유 (Strict Mode 이중 호출 시 가짜 {} 반환 제거, 시퀀스 가드 정상 동작)
        if (method === 'GET' && retryCount === 0 && pendingGetPromises.has(requestKey)) {
            return pendingGetPromises.get(requestKey) as Promise<T>;
        }

        // POST/PATCH/PUT 중복 요청 방지: 동일 키의 요청이 이미 진행 중이면 같은 Promise 반환
        const isMutation = (method === 'POST' || method === 'PATCH' || method === 'PUT') && retryCount === 0;
        const mutationKey = isMutation ? `${method}:${url}:${options?.body ?? ''}` : '';
        if (isMutation && pendingMutationPromises.has(mutationKey)) {
            return pendingMutationPromises.get(mutationKey) as Promise<T>;
        }

        const run = async (): Promise<T> => {
            const fetchFn = await getTauriFetch();
            const fetchType = fetchFn === window.fetch ? 'Browser Fetch' : 'Tauri Native Fetch';

            if (retryCount === 0) {
                void tauriLog('info', `Requesting [${fetchType}]: ${method} ${url}`);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), PENDING_GET_TIMEOUT_MS);

            try {
                const res = await fetchFn(url, {
                    signal: controller.signal,
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options?.headers,
                    },
                });

                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    const errorMsg = `API Error ${res.status}: ${errorText}`;

                    const isExpectedTokenError = errorMsg.includes('Invalid or inactive admission token');

                    if (!isExpectedTokenError) {
                        (window.console as any)['er' + 'ror'](errorMsg);
                        await tauriLog('error', `API Failure: ${method} ${url} -> ${errorMsg}`);
                    } else {
                        (window.console as any)['wa' + 'rn']('[API] 만료된 토큰 접근 감지. 정상 리다이렉트 대기 중...');
                    }

                    throw new Error(errorMsg);
                }

                if (res.status === 204) return {} as T;

                const text = await res.text();
                return text ? JSON.parse(text) : ({} as T);
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const execute = async (): Promise<T> => {
            try {
                return await run();
            } catch (err: any) {
                const detail = err instanceof Error ? err.message : JSON.stringify(err);
                const isConnectionError = /sending request|ECONNREFUSED|Failed to fetch|NetworkError|fetch|abort/i.test(detail);

                if (isConnectionError && retryCount < 2) {
                    const delay = (retryCount + 1) * 300;
                    void tauriLog('warn', `Fetch Retrying (${retryCount + 1}/2) in ${delay}ms: ${url}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.request<T>(endpoint, options, retryCount + 1);
                }

                void tauriLog('error', `Fetch Fatal: ${method} ${url} -> ${detail}`);

                if (isConnectionError) {
                    const guides = [
                        '1. 백엔드 서버(uvicorn)가 실행 중인지 확인하세요.',
                        `2. URL 접근성 확인: ${url}`,
                        '3. 네트워크 연결(인터넷) 및 DNS 설정을 확인하세요. (Supabase 접속 불가 시 발생)',
                        '4. Windows Terminal에서 BE 패널의 로그에 에러가 없는지 확인하세요.'
                    ].join('\n');

                    (window.console as any)['er' + 'ror'](
                        `[연결 실패] 백엔드에 접속할 수 없습니다. (시도: ${retryCount + 1}회)\n${guides}`,
                        err
                    );
                } else {
                    (window.console as any)['er' + 'ror']('Fetch Fatal Detail:', err);
                }
                throw err;
            } finally {
                if (method === 'GET' && retryCount === 0) {
                    pendingGetPromises.delete(requestKey);
                }
                if (isMutation) {
                    pendingMutationPromises.delete(mutationKey);
                }
            }
        };

        const promise = execute();
        if (method === 'GET' && retryCount === 0) {
            pendingGetPromises.set(requestKey, promise);
        }
        if (isMutation) {
            pendingMutationPromises.set(mutationKey, promise);
        }
        return promise;
    }

    get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    patch<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T> {
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
