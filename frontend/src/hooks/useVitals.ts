import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from './useWebSocket';
import type { VitalData, MealRequest, DocumentRequest, IVRecord, ExamScheduleItem } from '@/types/domain';
import { useDashboardData, dashboardQueryKey, formatVitals } from './useDashboardData';
import { useVitalsWsHandler } from './useVitalsWsHandler';
import { useVitalsOptimistic } from './useVitalsOptimistic';

export { dashboardQueryKey } from './useDashboardData';

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
    fetchDashboardData: (opts?: { force?: boolean }) => Promise<void>;
    addOptimisticVital: (temp: number, recordedAt: string) => { tempId: string; rollback: () => void };
    addOptimisticExam: (examData: { name: string; date: string; timeOfDay: string }) => { tempId: string; rollback: () => void };
    deleteOptimisticExam: (examId: number) => { rollback: () => void };
    updateOptimisticMeal: (mealId: number, pediatric: string, guardian: string) => { rollback: () => void };
}

export function useVitals(token: string | null | undefined, enabled: boolean = true, onDischarge?: () => void): UseVitalsReturn {
    const queryClient = useQueryClient();
    const { data: dashboardData, isFetching, refetch, tokenInvalidatedRef } = useDashboardData(token, enabled, onDischarge);

    // dashboardData에서 개별 상태 추출 (React Query 캐시가 SSOT)
    const vitals: VitalData[] = dashboardData?.vitals ? formatVitals(dashboardData.vitals) : [];
    const checkInAt: string | null = dashboardData?.admission?.check_in_at ?? null;
    const meals: MealRequest[] = dashboardData?.meals ?? [];
    const documentRequests: DocumentRequest[] = dashboardData?.document_requests ?? [];
    const ivRecords: IVRecord[] = dashboardData?.iv_records ?? [];
    const examSchedules: ExamScheduleItem[] = (dashboardData?.exam_schedules ?? []).sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
    const admissionId: string | null = dashboardData?.admission?.id ?? null;
    const patientName: string | null = dashboardData?.admission
        ? (dashboardData.admission.display_name || dashboardData.admission.patient_name_masked || '환자')
        : null;
    const roomNumber: string | null = dashboardData?.admission?.room_number ?? null;
    const dob: string | null = dashboardData?.admission?.dob ?? null;
    const gender: string | null = dashboardData?.admission?.gender ?? null;

    // admissionId ref (WS 핸들러 내에서 클로저 없이 최신값 접근)
    const admissionIdRef = useRef<string | null>(null);
    useEffect(() => { admissionIdRef.current = admissionId; }, [admissionId]);

    // debounce 타이머
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const debouncedRefetch = useCallback(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (token && !tokenInvalidatedRef.current) {
                void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(token) });
            }
        }, 300);
    }, [queryClient, token, tokenInvalidatedRef]);

    const fetchDashboardData = useCallback(async (opts?: { force?: boolean }) => {
        if (!token || tokenInvalidatedRef.current) return;
        if (opts?.force) {
            await refetch();
        } else {
            void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(token) });
        }
    }, [token, refetch, queryClient, tokenInvalidatedRef]);

    const handleMessage = useVitalsWsHandler({
        queryClient,
        token,
        admissionIdRef,
        debouncedRefetch,
        onDischarge,
    });

    const initialLoadDoneRef = useRef(false);
    useEffect(() => {
        if (dashboardData) initialLoadDoneRef.current = true;
    }, [dashboardData]);

    const { isConnected } = useWebSocket({
        url: token ? `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${token}` : '',
        enabled: !!token && enabled,
        onOpen: () => {
            if (initialLoadDoneRef.current && token) {
                void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(token) });
            }
        },
        onMessage: handleMessage
    });

    const { addOptimisticVital, addOptimisticExam, deleteOptimisticExam, updateOptimisticMeal } =
        useVitalsOptimistic({ queryClient, token, admissionIdRef });

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
        isRefreshing: isFetching,
        refetchDashboard: fetchDashboardData,
        fetchDashboardData,
        addOptimisticVital,
        addOptimisticExam,
        deleteOptimisticExam,
        updateOptimisticMeal
    };
}
