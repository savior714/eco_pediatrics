import { useRef, useEffect, useCallback, useState } from 'react';

interface UseWebSocketOptions {
    url: string;
    enabled?: boolean;
    onMessage: (event: MessageEvent) => void;
    onOpen?: () => void;
    onClose?: () => void;
}

export function useWebSocket({ url, enabled = true, onMessage, onOpen, onClose }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const retryDelay = useRef(1000);
    const [isConnected, setIsConnected] = useState(false);

    // Stable refs: 콜백 참조가 변경되어도 WS 재연결이 발생하지 않도록 ref로 감쌈
    const onMessageRef = useRef(onMessage);
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);

    // 매 렌더마다 최신 콜백으로 ref 업데이트 (WS 재연결 없이)
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
    useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const connect = useCallback(() => {
        if (!enabled || !url) return;

        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Connected to WS: ${url}`);
            setIsConnected(true);
            retryDelay.current = 1000;
            onOpenRef.current?.();
        };

        ws.onclose = () => {
            console.log(`Disconnected from WS: ${url}`);
            setIsConnected(false);
            onCloseRef.current?.();

            const delay = retryDelay.current;
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
            retryDelay.current = Math.min(delay * 1.5, 30000);
        };

        ws.onmessage = (event) => onMessageRef.current(event);

        // url과 enabled만 의존성으로 설정 → 콜백 변경 시 WS 재연결 방지
    }, [url, enabled]);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    return { isConnected };
}
