/// <reference path="../types/tauri-plugins.d.ts" />
// Export constant for use elsewhere if needed, but prefer using api instance
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Detect Tauri environment (Tauri v2 compatible)
const isTauri = typeof window !== 'undefined' &&
    ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

// Lazy-load Tauri plugins to avoid issues in browser/node environments
const getTauriFetch = async () => {
    if (!isTauri) return window.fetch;
    const { fetch } = await import('@tauri-apps/plugin-http');
    return fetch;
};

const tauriLog = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
    if (isTauri) {
        try {
            const { info, warn, error, debug } = await import('@tauri-apps/plugin-log');
            const logMap = { info, warn, error, debug };
            logMap[level](`[Frontend] ${message}`);
        } catch (e) {
            console.error('Failed to log to Tauri:', e);
        }
    }
};

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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
            console.error('Fetch Fatal Detail:', err);
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
