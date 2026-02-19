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

                    const mealDateRaw = message.data.meal_date; // '2026-02-19'
                    const mealTimeRaw = message.data.meal_time; // 'BREAKFAST'
                    const mealTimeMap: Record<string, string> = { BREAKFAST: '아침', LUNCH: '점심', DINNER: '저녁' };
                    const timeLabel = mealTimeMap[mealTimeRaw] || mealTimeRaw;

                    let dateLabel = '';
                    if (mealDateRaw) {
                        try {
                            const d = new Date(mealDateRaw);
                            dateLabel = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                        } catch (e) {
                            dateLabel = mealDateRaw;
                        }
                    }

                    setNotifications(prev => [{
                        id: `meal_${message.data.id}`, // 접두사 추가 → 백엔드와 포맷 통일
                        room: message.data.room,
                        time: '방금',
                        content: `[${dateLabel} ${timeLabel}] 식단 신청 (${mealTypeDesc})`,
                        type: 'meal',
                        admissionId: message.data.admission_id // Store for removal patch
                    } as any, ...prev]);

                    // 2. Patch Bed State (Immediate UI Update)
                    setBeds(prev => prev.map(bed => {
                        if (String(bed.room) === String(message.data.room)) {
                            return {
                                ...bed,
                                latest_meal: {
                                    id: message.data.id,
                                    admission_id: message.data.admission_id,
                                    request_type: message.data.request_type,
                                    // Preserve current values to avoid premature UI change
                                    pediatric_meal_type: bed.latest_meal?.pediatric_meal_type,
                                    guardian_meal_type: bed.latest_meal?.guardian_meal_type,
                                    // Store requested values
                                    requested_pediatric_meal_type: message.data.requested_pediatric_meal_type || message.data.pediatric_meal_type,
                                    requested_guardian_meal_type: message.data.requested_guardian_meal_type || message.data.guardian_meal_type,
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
                        id: `doc_${message.data.id}`, // 접두사 추가
                        room: message.data.room,
                        time: '방금',
                        content: `서류 신청 (${items.join(', ')})`,
                        type: 'doc',
                        admissionId: message.data.admission_id
                    } as any, ...prev]);
                    break;
                case 'DOC_REQUEST_UPDATED':
                    // Remove notification when a document request is updated (e.g., to COMPLETED) by any station
                    setNotifications(prev => prev.filter(n => n.id !== `doc_${message.data.id}`));
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

        // id 접두사에서 type과 rawId 추출 (예: 'meal_34' → type='meal', rawId='34')
        const match = id.match(/^(meal|doc)_(\d+)$/);
        if (admissionId && match) {
            try {
                const [, parsedType, rawId] = match;
                const endpoint = (type || parsedType) === 'doc' ? 'documents' : 'meals';
                await api.patch(`/api/v1/${endpoint}/requests/${rawId}?status=COMPLETED`, {});
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
