import { useRef, useEffect, useCallback, useState } from 'react';

const isDev = process.env.NODE_ENV === 'development';

const log = (msg: string) => {
    if (isDev) (window.console as Console)['log'](`[WS] ${msg}`);
};

const logWarn = (msg: string) => {
    if (isDev) (window.console as Console)['warn'](`[WS] ${msg}`);
};

// Exponential Backoff 딜레이 배열 (ms): 1s → 2s → 4s → 8s → 16s → 30s (최대)
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000] as const;

export type WsConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSED';

interface UseWebSocketOptions {
    url: string;
    enabled?: boolean;
    onMessage: (event: MessageEvent) => void;
    onOpen?: () => void;
    onClose?: () => void;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    connectionStatus: WsConnectionStatus;
}

export function useWebSocket({ url, enabled = true, onMessage, onOpen, onClose }: UseWebSocketOptions): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const attemptRef = useRef(0);
    const closedByUsRef = useRef(false); // cleanup에서 의도적으로 닫은 경우 재연결·로그 완화
    const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>('CLOSED');

    // Stable refs: 콜백 참조가 변경되어도 WS 재연결이 발생하지 않도록 ref로 감쌈
    const onMessageRef = useRef(onMessage);
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);

    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
    useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const connect = useCallback(() => {
        if (!enabled || !url) return;

        closedByUsRef.current = false;

        // 기존 연결 정리
        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.close();
        }

        setConnectionStatus('CONNECTING');
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (closedByUsRef.current) return; // 이미 cleanup으로 닫힌 뒤면 무시
            log(`Connected to WS: ${url}`);
            setConnectionStatus('OPEN');
            attemptRef.current = 0;
            onOpenRef.current?.();
        };

        ws.onclose = (event: CloseEvent) => {
            wsRef.current = null;
            setConnectionStatus('CLOSED');
            onCloseRef.current?.();

            if (closedByUsRef.current) {
                // cleanup에서 닫은 경우. 브라우저 "closed before connection is established" 는 정상 동작.
                return;
            }
            log(`Disconnected from WS: ${url} (Code: ${event.code})`);

            if (event.code === 4003 || event.code === 1000) {
                logWarn('WebSocket connection terminated by policy. Stopping reconnection.');
                return;
            }

            const delay = BACKOFF_DELAYS[Math.min(attemptRef.current, BACKOFF_DELAYS.length - 1)];
            attemptRef.current++;
            log(`Reconnecting in ${delay}ms (attempt #${attemptRef.current})...`);
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        };

        ws.onmessage = (event) => onMessageRef.current(event);
        ws.onerror = () => {
            if (closedByUsRef.current) return;
            log(`WS error on: ${url}`);
        };
    }, [url, enabled]);

    useEffect(() => {
        connect();

        return () => {
            closedByUsRef.current = true;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = undefined;
            }
            if (wsRef.current) {
                wsRef.current.onopen = null;
                wsRef.current.onmessage = null;
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [url, enabled]);

    // Page Visibility Change: 포그라운드 복귀 시 CLOSED 상태면 재연결
    useEffect(() => {
        if (!enabled || !url) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const wsState = wsRef.current?.readyState;
                if (wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING || wsRef.current === null) {
                    log('Page became visible, reconnecting WebSocket...');
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    attemptRef.current = 0; // 포그라운드 복귀 시 즉시 재연결 (backoff 리셋)
                    connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [url, enabled, connect]);

    return {
        isConnected: connectionStatus === 'OPEN',
        connectionStatus,
    };
}
