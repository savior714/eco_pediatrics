import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { api } from '@/lib/api';
import { Bed, Notification, LastUploadedIv, AdmissionSummary, WsMessage, MealRequest } from '@/types/domain';
import { ROOM_NUMBERS, MEAL_MAP, DOC_MAP } from '@/constants/mappings';

interface UseStationReturn {
    beds: Bed[];
    setBeds: React.Dispatch<React.SetStateAction<Bed[]>>;
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    lastUploadedIv: LastUploadedIv | null;
    lastUpdated: number;
    isConnected: boolean;
    removeNotification: (id: string, type?: string, admissionId?: string) => void;
    fetchAdmissions: () => void;
}

export function useStation(): UseStationReturn {
    const [beds, setBeds] = useState<Bed[]>([]);
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

    const fetchAdmissions = useCallback(() => {
        api.get<AdmissionSummary[]>('/api/v1/admissions')
            .then(admissions => {
                if (!Array.isArray(admissions)) return;

                // Reconstruct state from scratch to prevent ghost data
                const newBeds = ROOM_NUMBERS.map((room, i) => {
                    const adm = admissions.find((a) => String(a.room_number).trim() === String(room).trim());
                    if (adm) {
                        return {
                            id: adm.id,
                            room: room,
                            name: adm.display_name,
                            token: adm.access_token,
                            drops: adm.latest_iv ? adm.latest_iv.infusion_rate : null,
                            temp: adm.latest_temp ?? null,
                            had_fever_in_6h: adm.had_fever_in_6h,
                            status: ((adm.latest_temp != null && adm.latest_temp >= 38.0) || adm.had_fever_in_6h) ? 'fever' : 'normal',
                            latest_meal: adm.latest_meal ?? undefined,
                            last_vital_at: adm.last_vital_at ?? undefined,
                            dob: adm.dob,
                            gender: adm.gender
                        } as Bed;
                    }
                    // Empty Slot
                    return {
                        id: '',
                        room: room,
                        name: `환자${i + 1}`,
                        temp: null,
                        drops: null,
                        status: 'normal' as const,
                        token: ''
                    } as Bed;
                });

                setBeds(newBeds);
            })
            .catch(console.error);
    }, []);

    // Initial Load
    useEffect(() => {
        // 1. Initialize empty beds
        setBeds(ROOM_NUMBERS.map((room, i) => ({
            id: '',
            room: room,
            name: `환자${i + 1}`,
            temp: null,
            drops: null,
            status: 'normal' as const,
            token: ''
        })));

        fetchAdmissions();
        fetchPendingRequests();
    }, [fetchAdmissions, fetchPendingRequests]);

    // WebSocket Implementation using shared hook
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data) as WsMessage;
            const id = Math.random().toString(36).substr(2, 9);

            switch (message.type) {
                case 'NEW_MEAL_REQUEST':
                    if (message.data.request_type === 'STATION_UPDATE') break;

                    // 1. Update Notification
                    const requestedPediatric = message.data.pediatric_meal_type;
                    const requestedGuardian = message.data.guardian_meal_type;

                    const mealTypeDesc = requestedPediatric
                        ? `${requestedPediatric}${requestedGuardian && requestedGuardian !== '선택 안함' ? ` / ${requestedGuardian}` : ''}`
                        : (MEAL_MAP[message.data.request_type] || message.data.request_type);

                    setNotifications(prev => [{
                        id: String(message.data.id), // Use actual DB ID
                        room: message.data.room,
                        time: '방금',
                        content: `식단 신청 (${mealTypeDesc})`,
                        type: 'meal',
                        admissionId: message.data.admission_id // Store for removal patch
                    } as any, ...prev]);

                    // 2. Patch Bed State (Immediate UI Update)
                    setBeds(prev => prev.map(bed => {
                        if (String(bed.room) === String(message.data.room)) {
                            return {
                                ...bed,
                                latest_meal: {
                                    id: message.data.id, // Use actual server/DB ID from message
                                    admission_id: message.data.admission_id,
                                    request_type: message.data.request_type,
                                    pediatric_meal_type: message.data.pediatric_meal_type,
                                    guardian_meal_type: message.data.guardian_meal_type,
                                    status: 'PENDING',
                                    created_at: new Date().toISOString(),
                                    meal_date: message.data.meal_date,
                                    meal_time: message.data.meal_time
                                } as MealRequest
                            };
                        }
                        return bed;
                    }));
                    break;

                case 'NEW_DOC_REQUEST':
                    const items = message.data.request_items.map(it => DOC_MAP[it] || it);
                    setNotifications(prev => [{
                        id: String(message.data.id),
                        room: message.data.room,
                        time: '방금',
                        content: `서류 신청 (${items.join(', ')})`,
                        type: 'doc',
                        admissionId: message.data.admission_id
                    } as any, ...prev]);
                    break;
                case 'DOC_REQUEST_UPDATED':
                    // Remove notification when a document request is updated (e.g., to COMPLETED) by any station
                    setNotifications(prev => prev.filter(n => n.id !== String(message.data.id)));
                    break;

                case 'IV_PHOTO_UPLOADED':
                    setLastUploadedIv({
                        admissionId: message.data.admission_id,
                        url: message.data.photo_url
                    });
                    break;

                case 'NEW_IV':
                    const newDrops = message.data.infusion_rate;
                    const room = message.data.room;
                    setBeds(prev => prev.map(bed => {
                        if (String(bed.room) === String(room)) {
                            return { ...bed, drops: newDrops };
                        }
                        return bed;
                    }));
                    break;

                case 'NEW_VITAL':
                    const v = message.data;
                    setBeds(prev => prev.map(bed => {
                        // Match by admission_id if available, otherwise fallback to room if provided (though NEW_VITAL might not always have room)
                        // Ideally match by admission_id.
                        // However, beds state has admission_id as 'id'.
                        if (bed.id === v.admission_id) {
                            const isFever = v.temperature >= 38.0;
                            return {
                                ...bed,
                                temp: v.temperature,
                                last_vital_at: v.recorded_at,
                                had_fever_in_6h: bed.had_fever_in_6h || isFever, // Keep true if already true, or set true if new fever
                                status: (isFever || bed.had_fever_in_6h) ? 'fever' : 'normal'
                            };
                        }
                        return bed;
                    }));
                    break;

                case 'NEW_EXAM_SCHEDULE':
                case 'DELETE_EXAM_SCHEDULE':
                    // Handled by setLastUpdated -> Modal refresh
                    break;
                case 'ADMISSION_TRANSFERRED':
                case 'ADMISSION_DISCHARGED':
                    // Re-fetch entire bed list to reflect room changes or discharge
                    fetchAdmissions();
                    break;
            }
        } catch (e) {
            console.error('WS Parse Error', e);
        }
    }, [setBeds, setNotifications, setLastUpdated, setLastUploadedIv, fetchAdmissions]);

    const wsToken = process.env.NEXT_PUBLIC_STATION_WS_TOKEN || 'STATION';

    const { isConnected } = useWebSocket({
        url: `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${wsToken}`,
        enabled: true,
        onOpen: () => {
            fetchAdmissions();
            fetchPendingRequests();
        }, // Resync on connect/reconnect
        onMessage: handleMessage
    });

    const removeNotification = useCallback(async (id: string, type?: string, admissionId?: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));

        // If it's a doc or meal request and it's a numeric DB ID, update status
        if (admissionId && !isNaN(Number(id))) {
            try {
                const endpoint = type === 'doc' ? 'documents' : 'meals';
                // Pass status as query param or body as per backend implementation
                // backend/routers/station.py update_document_request_status uses query param 'status'
                await api.patch(`/api/v1/${endpoint}/requests/${id}?status=COMPLETED`, {});
            } catch (e) {
                console.error('Status Update Failed', e);
            }
        }
    }, []);

    return {
        beds,
        setBeds,
        notifications,
        setNotifications,
        lastUploadedIv,
        lastUpdated,
        isConnected,
        removeNotification,
        fetchAdmissions
    };
}
