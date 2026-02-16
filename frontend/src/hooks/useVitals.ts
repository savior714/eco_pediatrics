import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { api } from '@/lib/api';
import { VitalData, Bed, WsMessage, IVRecord, MealRequest, DocumentRequest, ExamScheduleItem, VitalDataResponse } from '@/types/domain';

interface UseVitalsReturn {
    vitals: VitalData[];
    checkInAt: string | null;
    meals: MealRequest[];
    documentRequests: DocumentRequest[];
    ivRecords: IVRecord[];
    examSchedules: ExamScheduleItem[];
    admissionId: string | null;
    patientName: string | null;
    roomNumber: string | null;
    dob: string | null;
    gender: string | null;
    isConnected: boolean;
    isRefreshing: boolean;
    refetchDashboard: () => Promise<void>;
    fetchDashboardData: () => Promise<void>; // Alias
    addOptimisticVital: (temp: number, recordedAt: string) => void;
}

interface DashboardResponse {
    admission: { id: string; patient_name_masked: string; display_name: string; room_number: string; check_in_at: string; dob?: string; gender?: string };
    vitals: VitalDataResponse[];
    meals: MealRequest[];
    document_requests: DocumentRequest[];
    iv_records: IVRecord[];
    exam_schedules: ExamScheduleItem[];
}

export function useVitals(token: string | null | undefined, enabled: boolean = true): UseVitalsReturn {
    const [vitals, setVitals] = useState<VitalData[]>([]);
    const [checkInAt, setCheckInAt] = useState<string | null>(null);
    const [meals, setMeals] = useState<MealRequest[]>([]);
    const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
    const [ivRecords, setIvRecords] = useState<IVRecord[]>([]);
    const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>([]);

    const [admissionId, setAdmissionId] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string | null>(null);
    const [roomNumber, setRoomNumber] = useState<string | null>(null);
    const [dob, setDob] = useState<string | null>(null);
    const [gender, setGender] = useState<string | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const requestRef = useRef(0);

    const fetchDashboardData = useCallback(async () => {
        if (!token) return;

        const currentRequestId = ++requestRef.current;
        setIsRefreshing(true);
        try {
            const data = await api.get<DashboardResponse>(`/api/v1/dashboard/${token}`, {
                headers: {
                    'X-Admission-Token': token
                }
            });

            // Sequence Guard: Ignore if a newer request was started
            if (currentRequestId !== requestRef.current) return;

            if (data) {
                // Admission Info
                if (data.admission) {
                    setAdmissionId(data.admission.id);
                    // Contract: Use display_name by default, fall back to masked name
                    setPatientName(data.admission.display_name || data.admission.patient_name_masked || '환자');
                    setRoomNumber(data.admission.room_number);
                    setCheckInAt(data.admission.check_in_at);
                    setDob(data.admission.dob || null);
                    setGender(data.admission.gender || null);
                }

                // Vitals
                if (data.vitals && Array.isArray(data.vitals)) {
                    const formattedVitals = data.vitals.map((v: VitalDataResponse) => ({
                        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: v.temperature,
                        has_medication: v.has_medication,
                        medication_type: v.medication_type,
                        recorded_at: v.recorded_at
                    }));
                    setVitals(formattedVitals);
                } else {
                    setVitals([]);
                }

                setMeals(data.meals || []);
                setDocumentRequests(data.document_requests || []);
                setIvRecords(data.iv_records || []);
                setExamSchedules(data.exam_schedules || []);
            }
        } catch (err) {
            if (currentRequestId === requestRef.current) {
                console.error(err);
            }
        } finally {
            if (currentRequestId === requestRef.current) {
                setIsRefreshing(false);
            }
        }
    }, [token]);

    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const debouncedRefetch = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            fetchDashboardData();
        }, 300); // 300ms debounce
    }, [fetchDashboardData]);

    const admissionIdRef = useRef<string | null>(null);

    // Update ref when state changes
    useEffect(() => {
        admissionIdRef.current = admissionId;
    }, [admissionId]);

    // WebSocket Implementation using shared hook
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data) as WsMessage;
            switch (message.type) {
                case 'NEW_VITAL': {
                    const v = message.data;
                    const formattedV = {
                        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: v.temperature,
                        has_medication: v.has_medication,
                        medication_type: v.medication_type,
                        recorded_at: v.recorded_at
                    };
                    setVitals(prev => {
                        const exists = prev.some(existing => existing.recorded_at === v.recorded_at);
                        if (exists) return prev;
                        return [formattedV, ...prev];
                    });
                    break;
                }
                case 'NEW_IV':
                    setIvRecords(prev => [message.data as any, ...prev]);
                    break;
                case 'IV_PHOTO_UPLOADED':
                    debouncedRefetch();
                    break;
                case 'NEW_DOC_REQUEST':
                    setDocumentRequests(prev => [message.data as any, ...prev]);
                    break;
                case 'NEW_EXAM_SCHEDULE':
                    setExamSchedules(prev => [...prev, message.data as any].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
                    // Removed debouncedRefetch() - local state is already synced
                    break;
                case 'DELETE_EXAM_SCHEDULE':
                    setExamSchedules(prev => prev.filter(ex => ex.id !== (message.data as any).id));
                    // Removed debouncedRefetch() - local state is already synced
                    break;
                case 'ADMISSION_TRANSFERRED':
                    debouncedRefetch();
                    break;
                case 'ADMISSION_DISCHARGED':
                    alert('환자가 퇴원되었습니다.');
                    window.location.reload();
                    break;
                case 'NEW_MEAL_REQUEST':
                    if (admissionIdRef.current && message.data.admission_id === admissionIdRef.current) {
                        debouncedRefetch();
                    }
                    break;
            }
        } catch (e) {
            console.error('WS Parse Error', e);
        }
    }, [debouncedRefetch, setVitals, setIvRecords, setDocumentRequests, setExamSchedules]);

    const { isConnected } = useWebSocket({
        url: token ? `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${token}` : '',
        enabled: !!token && enabled,
        onOpen: fetchDashboardData,
        onMessage: handleMessage
    });

    // Initial Fetch (Source of Truth)
    useEffect(() => {
        if (token && enabled) {
            fetchDashboardData();
        }
    }, [token, enabled, fetchDashboardData]);

    const addOptimisticVital = useCallback((temp: number, recordedAt: string) => {
        const newVital: VitalData = {
            temperature: temp,
            recorded_at: recordedAt,
            time: new Date(recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            has_medication: false // defaulting to false as per VitalModal
        };
        setVitals(prev => [newVital, ...prev]);
    }, []);

    return {
        vitals,
        checkInAt,
        meals,
        documentRequests,
        ivRecords,
        examSchedules,
        admissionId,
        patientName,
        roomNumber,
        dob,
        gender,
        isConnected,
        isRefreshing,
        refetchDashboard: fetchDashboardData,
        fetchDashboardData, // Alias
        addOptimisticVital
    };
}
