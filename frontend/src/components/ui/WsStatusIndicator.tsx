'use client';

import { WsConnectionStatus } from '@/hooks/useWebSocket';

interface WsStatusIndicatorProps {
    status: WsConnectionStatus;
}

const STATUS_CONFIG: Record<WsConnectionStatus, { dot: string; label: string; text: string }> = {
    OPEN:       { dot: 'bg-teal-400 animate-pulse', label: 'LIVE', text: 'text-teal-600' },
    CONNECTING: { dot: 'bg-amber-400 animate-ping',  label: '연결 중', text: 'text-amber-500' },
    CLOSED:     { dot: 'bg-red-400',                  label: '오프라인', text: 'text-red-500' },
};

export function WsStatusIndicator({ status }: WsStatusIndicatorProps) {
    const config = STATUS_CONFIG[status];
    return (
        <div className="flex items-center gap-1.5" title={`WebSocket ${status}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${config.dot}`} />
            <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
        </div>
    );
}
