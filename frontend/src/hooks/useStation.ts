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

/**
 * 빈 칸(빈 슬롯) 상태를 ROOM_NUMBERS 기준으로 한 번만 생성.
 * useState 초기값으로 사용해, useEffect 내 파괴적 리셋 없이 선언 시점에 그리드 골격을 확정.
 */
const emptySlotsInitial = (): Bed[] =>
    ROOM_NUMBERS.map((room, i) => ({
        id: '',
        room,
        name: `환자${i + 1}`,
        temp: null,
        drops: null,
        status: 'normal' as const,
        token: ''
    }));

export function useStation(): UseStationReturn {
    const [beds, setBeds] = useState<Bed[]>(emptySlotsInitial);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lastUploadedIv, setLastUploadedIv] = useState<LastUploadedIv | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

    /** 스로틀: 500ms 내 중복 fetch 방지 (force=true 시에는 스킵). */
    const lastFetchRef = useRef<number>(0);
    /** 시퀀스 가드: 오래된 요청의 응답이 최신 요청을 덮어쓰지 않도록 requestId 비교. force=true일 때는 우회하여 반드시 반영. */
    const requestRef = useRef(0);
    /** WS onOpen 등에서 "이미 초기 로드가 끝났으면" 재연결 시에만 fetch 하기 위한 플래그. */
    const initialLoadDoneRef = useRef(false);
    /** Strict Mode 이중 호출 방어: 마운트 시 fetchAdmissions(true)가 정확히 1회만 실행되도록 보장. */
    const initialFetchDoneRef = useRef(false);

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

    /**
     * 입원 목록(스테이션 그리드)을 API에서 가져와 beds 상태를 갱신.
     *
     * Race Condition 방어 로직:
     * 1. requestRef: 동시에 여러 요청이 나갈 때, "가장 마지막 요청의 응답"만 반영하고 이전 응답은 버린다(시퀀스 가드).
     * 2. force=true(초기 로드): 초기 로드 시에는 첫 번째 정상 응답을 반드시 반영해야 하므로, 시퀀스 가드를 우회한다.
     *    (Strict Mode에서 effect가 두 번 돌면 요청도 두 번 나가고, 두 번째 요청의 ID가 requestRef를 덮어써
     *     첫 번째 응답이 "오래된 응답"으로 버려져 그리드가 비는 버그를 방지)
     * 3. force=true일 때 URL에 ?_t=Date.now()를 붙여 브라우저/프록시 캐시를 무효화하고, 빈 배열이 캐싱되어
     *    그리드가 비는 현상을 원천 차단한다.
     *
     * @param force - true면 스로틀 무시, 캐시 버스팅 적용, 응답 수신 시 시퀀스 가드 우회(반드시 setBeds 반영)
     */
    const fetchAdmissions = useCallback((force = false) => {
        const now = Date.now();
        if (!force && now - lastFetchRef.current < 500) return;
        lastFetchRef.current = now;

        const currentRequestId = ++requestRef.current;
        const url = force ? `/api/v1/admissions?_t=${Date.now()}` : '/api/v1/admissions';
        api.get<AdmissionSummary[]>(url)
            .then(admissions => {
                if (currentRequestId !== requestRef.current && !force) {
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

    /**
     * 초기 로드: 마운트 시 입원 목록을 1회만 가져온다.
     *
     * - initialFetchDoneRef: React Strict Mode에서 useEffect가 두 번 실행되더라도, fetchAdmissions(true)는
     *   한 번만 호출되도록 보장. 두 번째 effect 실행 시 바로 return하여 중복 요청 및 "첫 응답이 시퀀스 가드에
     *   걸려 버려지는" 문제를 방지.
     * - 파괴적 리셋 제거: 과거에는 여기서 setBeds(ROOM_NUMBERS.map(...))로 빈 슬롯을 덮어써, API 응답이
     *   도착하기 전/후로 그리드를 강제 초기화해 데이터가 사라지는 버그가 있었음. 초기 상태는 useState(emptySlotsInitial)로만 설정하고, effect 내에서는 리셋하지 않음.
     */
    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
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
