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
    fetchAdmissions: (force?: boolean) => void;
}

export function useStation(): UseStationReturn {
    const [beds, setBeds] = useState<Bed[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lastUploadedIv, setLastUploadedIv] = useState<LastUploadedIv | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

    // [Optimization] Prevent double-fetch on mount (useEffect + WS onOpen)
    const lastFetchRef = useRef<number>(0);
    const requestRef = useRef(0);
    const initialLoadDoneRef = useRef(false);

    const fetchPendingRequests = useCallback(async () => {
        const currentRequestId = ++requestRef.current;
        try {
            const pending = await api.get<Notification[]>('/api/v1/station/pending-requests');
            if (currentRequestId !== requestRef.current) {
                console.warn(`[fetchPendingRequests] 오래된 응답 무시됨. reqId: ${currentRequestId}`);
                return;
            }
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

    const fetchAdmissions = useCallback((force = false) => {
        const now = Date.now();
        // Throttle: skip if within 500ms (except initial load with force=true).
        // ID is assigned only after throttle pass so the response is not discarded by sequence guard.
        if (!force && now - lastFetchRef.current < 500) return;
        lastFetchRef.current = now;

        const currentRequestId = ++requestRef.current;
        api.get<AdmissionSummary[]>('/api/v1/admissions')
            .then(admissions => {
                if (currentRequestId !== requestRef.current) {
                    console.warn(`[fetchAdmissions] 오래된 응답 무시됨. reqId: ${currentRequestId}`);
                    return;
                }
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
                initialLoadDoneRef.current = true;
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

        fetchAdmissions(true);
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

                    let mealTypeDesc = "";
                    if (requestedPediatric) {
                        mealTypeDesc = requestedPediatric;
                    }
                    if (requestedGuardian && requestedGuardian !== '선택 안함') {
                        mealTypeDesc += (mealTypeDesc ? " / " : "") + requestedGuardian;
                    }
                    if (!mealTypeDesc) {
                        mealTypeDesc = (MEAL_MAP[message.data.request_type] || message.data.request_type);
                    }

                    const mealDateRaw = message.data.meal_date; // '2026-02-19'
                    const mealTimeRaw = message.data.meal_time; // 'BREAKFAST'
                    const mealTimeMap: Record<string, string> = { BREAKFAST: '아침', LUNCH: '점심', DINNER: '저녁' };
                    const timeLabel = mealTimeMap[mealTimeRaw] || mealTimeRaw;

                    let dateLabel = '';
                    if (mealDateRaw) {
                        // [SSOT Fix] Parse string directly to avoid timezone shifts (e.g. 2026-02-20 -> 02/20)
                        const parts = mealDateRaw.split('-');
                        if (parts.length === 3) {
                            dateLabel = `${parts[1]}/${parts[2]}`;
                        } else {
                            dateLabel = mealDateRaw;
                        }
                    }

                    const newMealId = `meal_${message.data.id}`;
                    const newMealNotification = {
                        id: newMealId,
                        room: message.data.room,
                        time: '방금',
                        content: message.data.content || `[${dateLabel} ${timeLabel}] 식단 신청 (${mealTypeDesc})`,
                        type: 'meal',
                        admissionId: message.data.admission_id
                    };

                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === newMealId);
                        if (exists) {
                            return prev.map(n => n.id === newMealId ? newMealNotification : n);
                        }
                        return [newMealNotification as any, ...prev];
                    });

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
                    const newDocId = `doc_${message.data.id}`;
                    const newDocNotification = {
                        id: newDocId,
                        room: message.data.room,
                        time: '방금',
                        content: message.data.content || `서류 신청 (${items.join(', ')})`,
                        type: 'doc',
                        admissionId: message.data.admission_id
                    };

                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === newDocId);
                        if (exists) {
                            return prev.map(n => n.id === newDocId ? newDocNotification : n);
                        }
                        return [newDocNotification as any, ...prev];
                    });
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
                case 'REFRESH_DASHBOARD':
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
            if (initialLoadDoneRef.current) fetchAdmissions();
            fetchPendingRequests();
        }, // Resync on reconnect; skip first connect to avoid race with effect (api 100ms dedup + sequence guard)
        onMessage: handleMessage
    });

    const removeNotification = useCallback(async (id: string, type?: string, _admissionId?: string) => {
        // id 접두사에서 type과 rawId 추출 (예: 'doc_34' → parsedType='doc', rawId='34')
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
