import { useState, useCallback, useEffect } from 'react';
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
    isConnected: boolean;
    isRefreshing: boolean;
    refetchDashboard: () => Promise<void>;
    fetchDashboardData: () => Promise<void>; // Alias
}

interface DashboardResponse {
    admission: { id: string; patient_name_masked: string; display_name: string; room_number: string; check_in_at: string };
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

    const [isConnected, setIsConnected] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        if (!token) return;
        setIsRefreshing(true);
        try {
            const data = await api.get<DashboardResponse>(`/api/v1/dashboard/${token}`);
            if (data) {
                // Admission Info
                if (data.admission) {
                    setAdmissionId(data.admission.id);
                    // Contract: Use display_name by default, fall back to masked name
                    setPatientName(data.admission.display_name || data.admission.patient_name_masked || '환자');
                    setRoomNumber(data.admission.room_number);
                    setCheckInAt(data.admission.check_in_at);
                }

                // Vitals
                if (data.vitals && Array.isArray(data.vitals)) {
                    const formattedVitals = data.vitals.map((v: VitalDataResponse) => ({
                        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: v.temperature,
                        has_medication: v.has_medication,
                        medication_type: v.medication_type,
                        recorded_at: v.recorded_at
                    })).reverse();
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
            console.error(err);
        } finally {
            setIsRefreshing(false);
        }
    }, [token]);

    // WebSocket Connection
    useEffect(() => {
        if (!token || !enabled) return;

        const API_URL = api.getBaseUrl();
        const WS_URL = API_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${WS_URL}/ws/${token}`);

        ws.onopen = () => {
            console.log(`Connected to Dashboard WS for ${token}`);
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('Disconnected from Dashboard WS');
            setIsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WsMessage;
                // Simple strategy: Refetch on any relevant update
                // Optimization: Partial updates could be done here
                switch (message.type) {
                    case 'NEW_VITAL':
                    case 'NEW_IV':
                    case 'IV_PHOTO_UPLOADED':
                    case 'NEW_DOC_REQUEST':
                        fetchDashboardData();
                        break;
                    case 'NEW_MEAL_REQUEST':
                        // Filter by admission_id if available to prevent cross-patient refetch
                        if (admissionId && (message.data as any).admission_id && (message.data as any).admission_id !== admissionId) {
                            break;
                        }
                        fetchDashboardData();
                        break;
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        return () => ws.close();
    }, [token, enabled, fetchDashboardData, admissionId]);

    // Initial Fetch
    useEffect(() => {
        if (token && enabled) {
            fetchDashboardData();
        }
    }, [token, enabled, fetchDashboardData]);

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
        isConnected,
        isRefreshing,
        refetchDashboard: fetchDashboardData,
        fetchDashboardData // Alias
    };
}
