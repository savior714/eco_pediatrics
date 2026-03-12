import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Notification, LastUploadedIv } from '@/types/domain';

export interface UseStationDashboardReturn {
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    lastUploadedIv: LastUploadedIv | null;
    setLastUploadedIv: React.Dispatch<React.SetStateAction<LastUploadedIv | null>>;
    lastUpdated: number;
    setLastUpdated: React.Dispatch<React.SetStateAction<number>>;
    fetchPendingRequests: () => Promise<void>;
    removeNotification: (id: string, type?: string, admissionId?: string) => Promise<void>;
}

export function useStationDashboard(): UseStationDashboardReturn {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lastUploadedIv, setLastUploadedIv] = useState<LastUploadedIv | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

    const fetchPendingRequests = useCallback(async () => {
        try {
            const pending = await api.get<Notification[]>('/api/v1/station/pending-requests');
            if (Array.isArray(pending)) {
                setNotifications(pending.map(n => ({
                    ...n,
                    time: new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                })));
            }
        } catch (e) {
            console.error('Failed to fetch pending requests', e);
        }
    }, []);

    const initialFetchDoneRef = useRef(false);
    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        void fetchPendingRequests();
    }, [fetchPendingRequests]);

    const removeNotification = useCallback(async (id: string, type?: string, _admissionId?: string) => {
        const match = id.match(/^(meal|doc)_(\d+)$/);
        if (!match) {
            setNotifications(prev => prev.filter(n => n.id !== id));
            return;
        }
        const [, parsedType, rawId] = match;
        const endpoint = (type || parsedType) === 'doc' ? 'documents' : 'meals';
        try {
            await api.patch(`/api/v1/${endpoint}/requests/${rawId}?status=COMPLETED`, {});
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (e) {
            console.error('Status Update Failed', e);
            alert('완료 처리에 실패했습니다. 다시 시도해 주세요.');
        }
    }, []);

    return {
        notifications,
        setNotifications,
        lastUploadedIv,
        setLastUploadedIv,
        lastUpdated,
        setLastUpdated,
        fetchPendingRequests,
        removeNotification
    };
}
