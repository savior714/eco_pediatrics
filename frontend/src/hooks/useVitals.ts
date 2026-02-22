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
    fetchDashboardData: (opts?: { force?: boolean }) => Promise<void>; // force: bypass 500ms debounce
    addOptimisticVital: (temp: number, recordedAt: string) => { tempId: string; rollback: () => void };
    addOptimisticExam: (examData: { name: string; date: string; timeOfDay: string }) => { tempId: string; rollback: () => void };
    deleteOptimisticExam: (examId: number) => { rollback: () => void };
    updateOptimisticMeal: (mealId: number, pediatric: string, guardian: string) => { rollback: () => void };
}

interface DashboardResponse {
    admission: { id: string; patient_name_masked: string; display_name: string; room_number: string; check_in_at: string; dob?: string; gender?: string };
    vitals: VitalDataResponse[];
    meals: MealRequest[];
    document_requests: DocumentRequest[];
    iv_records: IVRecord[];
    exam_schedules: ExamScheduleItem[];
}

export function useVitals(token: string | null | undefined, enabled: boolean = true, onDischarge?: () => void): UseVitalsReturn {
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
    // [Optimization] Prevent double-fetch on mount
    const lastFetchRef = useRef<number>(0);
    // 404/403 시 이후 모든 fetch 차단 (폴링/재호출로 인한 무한 404 방지)
    const tokenInvalidatedRef = useRef(false);

    const fetchDashboardData = useCallback(async (opts?: { force?: boolean }) => {
        if (!token) return;
        if (tokenInvalidatedRef.current) return;

        const now = Date.now();
        if (!opts?.force && now - lastFetchRef.current < 500) return;
        lastFetchRef.current = now;

        const currentRequestId = ++requestRef.current;
        setIsRefreshing(true);
        // [Fix] force 시 cache-busting param으로 api.ts 100ms dedup 우회. 완료 버튼 클릭 후 리프레시가 실제 요청 수행되도록 함.
        const cacheBust = opts?.force ? `?_t=${Date.now()}` : '';
        try {
            const data = await api.get<DashboardResponse>(`/api/v1/dashboard/${token}${cacheBust}`, {
                headers: {
                    'X-Admission-Token': token
                }
            });

            // Sequence Guard: Ignore if a newer request was started (unless force: manual refresh wins)
            if (currentRequestId !== requestRef.current) {
                if (!opts?.force) {
                    console.warn(`[useVitals] Outdated request ignored: ${currentRequestId}`);
                    return;
                }
            }

            // [Fix] Empty body from api.ts dedup (100ms) or network: do not overwrite state; log for debugging
            if (data && Object.keys(data).length > 0) {
                // Admission Info
                if (data.admission) {
                    setAdmissionId(data.admission.id);
                    setPatientName(data.admission.display_name || data.admission.patient_name_masked || '환자');
                    setRoomNumber(data.admission.room_number);
                    setCheckInAt(data.admission.check_in_at);
                    setDob(data.admission.dob || null);
                    setGender(data.admission.gender || null);
                }

                if (data.vitals && Array.isArray(data.vitals)) {
                    const formattedVitals = data.vitals.map((v: VitalDataResponse) => ({
                        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: v.temperature,
                        has_medication: v.has_medication,
                        medication_type: v.medication_type,
                        recorded_at: v.recorded_at
                    }));
                    setVitals(formattedVitals);
                }

                if (data.meals != null) setMeals(data.meals);
                if (data.document_requests !== undefined) setDocumentRequests(data.document_requests || []);
                if (data.iv_records != null) setIvRecords(data.iv_records);
                if (data.exam_schedules != null) setExamSchedules(data.exam_schedules);
            } else {
                console.error('[useVitals] Received empty data from API');
            }
        } catch (err: any) {
            if (currentRequestId !== requestRef.current && !opts?.force) return;

            const errorMessage = String(err?.message || '');
            if (errorMessage.includes('403') || errorMessage.includes('404')) {
                tokenInvalidatedRef.current = true;
                console.warn('Invalid token detected. Stopping further dashboard fetches.');
                if (onDischarge) {
                    onDischarge();
                } else {
                    alert('이미 종료되었거나 유효하지 않은 페이지입니다. 병원으로 문의해 주세요.');
                    if (typeof window !== 'undefined') {
                        window.close();
                        setTimeout(() => { window.location.href = '/403'; }, 500);
                    }
                }
                return;
            }
            console.error('Dashboard Fetch Error:', err);
        } finally {
            if (currentRequestId === requestRef.current) {
                setIsRefreshing(false);
            }
        }
    }, [token, onDischarge]);

    useEffect(() => {
        tokenInvalidatedRef.current = false;
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
                        // Reconciliation: Check for matching optimistic item (within 2s)
                        const optimisticIndex = prev.findIndex(existing =>
                            existing.isOptimistic &&
                            Math.abs(new Date(existing.recorded_at).getTime() - new Date(v.recorded_at).getTime()) < 2000
                        );

                        if (optimisticIndex !== -1) {
                            const nextVitals = [...prev];
                            nextVitals[optimisticIndex] = { ...formattedV, isOptimistic: false };
                            return nextVitals;
                        }

                        if (prev.some(existing => existing.recorded_at === v.recorded_at)) return prev;
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
                case 'DOC_REQUEST_UPDATED':
                    debouncedRefetch();
                    break;
                case 'NEW_EXAM_SCHEDULE': {
                    const newExam = message.data;
                    setExamSchedules(prev => {
                        // Reconciliation: Match by name and date
                        const optimisticIndex = prev.findIndex(ex =>
                            ex.isOptimistic &&
                            ex.name === newExam.name &&
                            ex.scheduled_at.split('T')[0] === newExam.scheduled_at.split('T')[0]
                        );

                        if (optimisticIndex !== -1) {
                            const next = [...prev];
                            next[optimisticIndex] = { ...newExam, isOptimistic: false };
                            return next.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
                        }

                        return [...prev, newExam].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
                    });
                    break;
                }
                case 'DELETE_EXAM_SCHEDULE':
                    setExamSchedules(prev => prev.filter(ex => ex.id !== (message.data as any).id));
                    // debouncedRefetch 제거: optimistic 삭제로 로컬 상태 이미 동기화됨
                    // refetch 시 DB 반영 전 데이터가 로드되어 삭제 항목이 복원되는 버그 방지
                    break;
                case 'ADMISSION_TRANSFERRED':
                    debouncedRefetch();
                    break;
                case 'ADMISSION_DISCHARGED':
                    if (onDischarge) {
                        onDischarge();
                    } else {
                        // 기본 동작: 퇴원 안내 후 안전하게 페이지 이탈
                        alert('환자가 퇴원 처리되었습니다.');
                        if (typeof window !== 'undefined') {
                            window.close();
                            // window.close()가 작동하지 않을 경우(일반 브라우저 탭 등)에만 403 페이지로 이동
                            setTimeout(() => {
                                window.location.href = '/403';
                            }, 500);
                        }
                    }
                    break;
                case 'NEW_MEAL_REQUEST':
                    if (admissionIdRef.current && message.data.admission_id === admissionIdRef.current) {
                        // When a new meal request (or update) arrives, we just refresh to be safe or update inline
                        // For simplicity and consistency with current implementation:
                        debouncedRefetch();
                    }
                    break;
                case 'MEAL_UPDATED': // If the backend ever sends this
                    if (admissionIdRef.current && (message.data as any).admission_id === admissionIdRef.current) {
                        setMeals(prev => prev.map(m => m.id === (message.data as any).id ? { ...(message.data as any), isOptimistic: false } : m));
                    }
                    break;
                case 'REFRESH_DASHBOARD':
                    debouncedRefetch();
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
        const tempId = `temp-vital-${Date.now()}`;
        const newVital: VitalData = {
            tempId,
            temperature: temp,
            recorded_at: recordedAt,
            time: new Date(recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            has_medication: false,
            isOptimistic: true
        };
        setVitals(prev => [newVital, ...prev]);
        return { tempId, rollback: () => setVitals(prev => prev.filter(v => v.tempId !== tempId)) };
    }, []);

    const addOptimisticExam = useCallback((examData: { name: string; date: string; timeOfDay: string }) => {
        const tempId = `temp-exam-${Date.now()}`;
        const newExam: ExamScheduleItem = {
            id: -1, // Temporary id
            tempId,
            admission_id: admissionIdRef.current || '',
            name: examData.name,
            scheduled_at: `${examData.date}T${examData.timeOfDay === 'am' ? '09:00:00' : '14:00:00'}`,
            isOptimistic: true
        };

        setExamSchedules(prev => [...prev, newExam].sort((a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));

        return { tempId, rollback: () => setExamSchedules(prev => prev.filter(ex => ex.tempId !== tempId)) };
    }, []);

    const deleteOptimisticExam = useCallback((examId: number) => {
        let deletedItem: ExamScheduleItem | undefined;
        setExamSchedules(prev => {
            deletedItem = prev.find(ex => ex.id === examId);
            return prev.filter(ex => ex.id !== examId);
        });
        return {
            rollback: () => {
                if (deletedItem) {
                    setExamSchedules(prev => [...prev, deletedItem!].sort((a, b) =>
                        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                    ));
                }
            }
        };
    }, []);

    const updateOptimisticMeal = useCallback((mealId: number, pediatric: string, guardian: string) => {
        let originalMeal: MealRequest | undefined;
        setMeals(prev => prev.map(m => {
            if (m.id === mealId) {
                originalMeal = { ...m };
                return { ...m, pediatric_meal_type: pediatric, guardian_meal_type: guardian, isOptimistic: true };
            }
            return m;
        }));
        return {
            rollback: () => {
                if (originalMeal) {
                    setMeals(prev => prev.map(m => m.id === mealId ? originalMeal! : m));
                }
            }
        };
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
        addOptimisticVital,
        addOptimisticExam,
        deleteOptimisticExam,
        updateOptimisticMeal
    };
}
