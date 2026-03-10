import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket, WsConnectionStatus } from './useWebSocket';
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
    connectionStatus: WsConnectionStatus;
    removeNotification: (id: string, type?: string, admissionId?: string) => void;
    fetchAdmissions: (force?: boolean) => void;
}

/** 빈 슬롯 상태 초기값 생성 */
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

/** AdmissionSummary 배열 → Bed 배열로 변환 */
function admissionsToBeds(admissions: AdmissionSummary[]): Bed[] {
    return ROOM_NUMBERS.map((room, i) => {
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
                gender: adm.gender,
                attending_physician: adm.attending_physician ?? undefined
            } as Bed;
        }
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
}

export const STATION_QUERY_KEY = ['station', 'admissions'] as const;

export function useStation(): UseStationReturn {
    const queryClient = useQueryClient();

    // [React Query] 입원 목록 서버 상태 캐시
    const { data: queriedBeds, refetch } = useQuery({
        queryKey: STATION_QUERY_KEY,
        queryFn: async () => {
            const admissions = await api.get<AdmissionSummary[]>(`/api/v1/admissions?_t=${Date.now()}`);
            if (!Array.isArray(admissions)) return emptySlotsInitial();
            return admissionsToBeds(admissions);
        },
        placeholderData: emptySlotsInitial(),
    });

    // beds는 queryClient.setQueryData()로 WS 이벤트가 직접 패치하므로
    // 외부 컴포넌트가 setBeds를 직접 호출할 수 있도록 래퍼 제공
    const beds: Bed[] = queriedBeds ?? emptySlotsInitial();

    const setBeds: React.Dispatch<React.SetStateAction<Bed[]>> = useCallback(
        (updater) => {
            queryClient.setQueryData<Bed[]>(STATION_QUERY_KEY, (prev) => {
                const current = prev ?? emptySlotsInitial();
                return typeof updater === 'function' ? updater(current) : updater;
            });
        },
        [queryClient]
    );

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [lastUploadedIv, setLastUploadedIv] = useState<LastUploadedIv | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

    /** WebSocket 재연결 후 서버 상태 재동기화 (invalidate → 재fetch) */
    const fetchAdmissions = useCallback((force = false) => {
        void refetch();
    }, [refetch]);

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

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data) as WsMessage;

            switch (message.type) {
                case 'NEW_MEAL_REQUEST':
                    if (message.data.request_type === 'STATION_UPDATE') break;

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

                    const mealDateRaw = message.data.meal_date;
                    const mealTimeRaw = message.data.meal_time;
                    const mealTimeMap: Record<string, string> = { BREAKFAST: '아침', LUNCH: '점심', DINNER: '저녁' };
                    const timeLabel = mealTimeMap[mealTimeRaw] || mealTimeRaw;

                    let dateLabel = '';
                    if (mealDateRaw) {
                        const parts = mealDateRaw.split('-');
                        if (parts.length === 3) {
                            dateLabel = `${parts[1]}/${parts[2]}`;
                        } else {
                            dateLabel = mealDateRaw;
                        }
                    }

                    const newMealId = `meal_${message.data.id}`;
                    const newMealNotification: Notification = {
                        id: newMealId,
                        room: message.data.room,
                        time: '방금',
                        content: message.data.content || `[${dateLabel} ${timeLabel}] 식단 신청 (${mealTypeDesc})`,
                        type: 'meal' as const,
                        admissionId: message.data.admission_id
                    };

                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === newMealId);
                        if (exists) {
                            return prev.map(n => n.id === newMealId ? newMealNotification : n);
                        }
                        return [newMealNotification, ...prev];
                    });

                    // setQueryData로 beds 직접 패치 (네트워크 요청 없음)
                    queryClient.setQueryData<Bed[]>(STATION_QUERY_KEY, prev =>
                        (prev ?? emptySlotsInitial()).map(bed => {
                            if (String(bed.room) === String(message.data.room)) {
                                return {
                                    ...bed,
                                    latest_meal: {
                                        id: message.data.id,
                                        admission_id: message.data.admission_id,
                                        request_type: message.data.request_type,
                                        pediatric_meal_type: bed.latest_meal?.pediatric_meal_type,
                                        guardian_meal_type: bed.latest_meal?.guardian_meal_type,
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
                        })
                    );
                    break;

                case 'NEW_DOC_REQUEST':
                    const items = message.data.request_items.map((it: string) => DOC_MAP[it] || it);
                    const newDocId = `doc_${message.data.id}`;
                    const newDocNotification: Notification = {
                        id: newDocId,
                        room: message.data.room,
                        time: '방금',
                        content: message.data.content || `서류 신청 (${items.join(', ')})`,
                        type: 'doc' as const,
                        admissionId: message.data.admission_id
                    };
                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === newDocId);
                        if (exists) {
                            return prev.map(n => n.id === newDocId ? newDocNotification : n);
                        }
                        return [newDocNotification, ...prev];
                    });
                    break;

                case 'DOC_REQUEST_UPDATED':
                    setNotifications(prev => prev.filter(n => n.id !== `doc_${message.data.id}`));
                    break;

                case 'IV_PHOTO_UPLOADED':
                    setLastUploadedIv({
                        admissionId: message.data.admission_id,
                        url: message.data.photo_url
                    });
                    break;

                case 'NEW_IV':
                    queryClient.setQueryData<Bed[]>(STATION_QUERY_KEY, prev =>
                        (prev ?? emptySlotsInitial()).map(bed =>
                            String(bed.room) === String(message.data.room)
                                ? { ...bed, drops: message.data.infusion_rate }
                                : bed
                        )
                    );
                    break;

                case 'NEW_VITAL':
                    queryClient.setQueryData<Bed[]>(STATION_QUERY_KEY, prev =>
                        (prev ?? emptySlotsInitial()).map(bed => {
                            if (bed.id === message.data.admission_id) {
                                const isFever = message.data.temperature >= 38.0;
                                return {
                                    ...bed,
                                    temp: message.data.temperature,
                                    last_vital_at: message.data.recorded_at,
                                    had_fever_in_6h: bed.had_fever_in_6h || isFever,
                                    status: (isFever || bed.had_fever_in_6h) ? 'fever' : 'normal'
                                };
                            }
                            return bed;
                        })
                    );
                    break;

                case 'NEW_EXAM_SCHEDULE':
                case 'DELETE_EXAM_SCHEDULE':
                    setLastUpdated(Date.now());
                    break;

                case 'ADMISSION_TRANSFERRED':
                case 'ADMISSION_DISCHARGED':
                    // 구조 변경이 생기는 경우 → 서버에서 재fetch
                    void queryClient.invalidateQueries({ queryKey: STATION_QUERY_KEY });
                    break;

                case 'REFRESH_DASHBOARD':
                    void queryClient.invalidateQueries({ queryKey: STATION_QUERY_KEY });
                    break;
            }
        } catch (e) {
            console.error('WS Parse Error', e);
        }
    }, [queryClient]);

    const wsToken = process.env.NEXT_PUBLIC_STATION_WS_TOKEN || 'STATION';

    const { isConnected, connectionStatus } = useWebSocket({
        url: `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${wsToken}`,
        enabled: true,
        onOpen: () => {
            // WS 재연결 시 서버 상태 재동기화
            void queryClient.invalidateQueries({ queryKey: STATION_QUERY_KEY });
            void fetchPendingRequests();
        },
        onMessage: handleMessage
    });

    // 초기 pending requests 로드
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
        beds,
        setBeds,
        notifications,
        setNotifications,
        lastUploadedIv,
        lastUpdated,
        isConnected,
        connectionStatus,
        removeNotification,
        fetchAdmissions
    };
}
