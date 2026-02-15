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

    const connect = useCallback(() => {
        if (!enabled || !url) return;

        // Cleanup existing connection if any (though usually handled by cleanup function)
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Connected to WS: ${url}`);
            setIsConnected(true);
            retryDelay.current = 1000; // Reset backoff
            onOpen?.();
        };

        ws.onclose = () => {
            console.log(`Disconnected from WS: ${url}`);
            setIsConnected(false);
            onClose?.();

            // Exponential Backoff
            const delay = retryDelay.current;
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
            retryDelay.current = Math.min(delay * 1.5, 30000); // Max 30s
        };

        ws.onmessage = onMessage;

    }, [url, enabled, onMessage, onOpen, onClose]);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                // Prevent reconnect on unmount
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
