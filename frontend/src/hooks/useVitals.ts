import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api, appLog } from '@/lib/api';
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
    fetchDashboardData: (opts?: { force?: boolean }) => Promise<void>;
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

/** React Query queryKey 생성 헬퍼 */
export const dashboardQueryKey = (token: string) => ['dashboard', token] as const;

function formatVitals(raw: VitalDataResponse[]): VitalData[] {
    return raw.map(v => ({
        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: v.temperature,
        has_medication: v.has_medication,
        medication_type: v.medication_type,
        recorded_at: v.recorded_at
    }));
}

export function useVitals(token: string | null | undefined, enabled: boolean = true, onDischarge?: () => void): UseVitalsReturn {
    const queryClient = useQueryClient();

    // 404/403 시 이후 모든 fetch 차단
    const tokenInvalidatedRef = useRef(false);

    // [React Query] 대시보드 서버 상태 캐시
    const { data: dashboardData, isFetching, refetch } = useQuery({
        queryKey: token ? dashboardQueryKey(token) : ['dashboard', '__disabled__'],
        enabled: !!token && enabled && !tokenInvalidatedRef.current,
        staleTime: 30_000,
        queryFn: async () => {
            if (!token) throw new Error('token required');
            const data = await api.get<DashboardResponse>(`/api/v1/dashboard/${token}`, {
                headers: { 'X-Admission-Token': token }
            });
            if (!data || Object.keys(data).length === 0) {
                throw new Error('empty response');
            }
            return data;
        },
        retry: (failureCount, error) => {
            const msg = error instanceof Error ? error.message : String(error);
            // 토큰 만료/권한 에러는 재시도 하지 않음
            if (msg.includes('403') || msg.includes('404') || msg.includes('Invalid or inactive')) {
                return false;
            }
            return failureCount < 1;
        },
    });

    // React Query 에러 처리 (토큰 만료 등)
    const { error: queryError } = useQuery({
        queryKey: token ? dashboardQueryKey(token) : ['dashboard', '__disabled__'],
        enabled: false, // 위 useQuery와 공유, 여기선 에러만 읽음
    });

    // 토큰 만료 에러 처리
    useEffect(() => {
        if (!queryError) return;
        const msg = queryError instanceof Error ? queryError.message : String(queryError);
        if (msg.includes('403') || msg.includes('404') || msg.includes('Invalid or inactive')) {
            tokenInvalidatedRef.current = true;
            if (onDischarge) {
                onDischarge();
            } else {
                alert('이미 종료되었거나 유효하지 않은 페이지입니다. 병원으로 문의해 주세요.');
                if (typeof window !== 'undefined') {
                    window.close();
                    setTimeout(() => { window.location.href = '/403'; }, 500);
                }
            }
        }
    }, [queryError, onDischarge]);

    // token 변경 시 ref 초기화
    useEffect(() => {
        tokenInvalidatedRef.current = false;
    }, [token]);

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

    // admissionId ref (WS 핸들러 내에서 클로저 없이 접근)
    const admissionIdRef = useRef<string | null>(null);
    useEffect(() => { admissionIdRef.current = admissionId; }, [admissionId]);

    // 마운트 여부 추적 (언마운트 후 상태 업데이트 방지)
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

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
    }, [queryClient, token]);

    // force fetch: cache-busting param으로 React Query staleTime 우회
    const fetchDashboardData = useCallback(async (opts?: { force?: boolean }) => {
        if (!token || tokenInvalidatedRef.current) return;
        if (opts?.force) {
            // staleTime 무시하고 즉시 재fetch
            await refetch();
        } else {
            void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(token) });
        }
    }, [token, refetch, queryClient]);

    // WS 메시지 핸들러: setQueryData로 캐시 직접 패치 (네트워크 요청 없음)
    const handleMessage = useCallback((event: MessageEvent) => {
        if (!token) return;
        try {
            const message = JSON.parse(event.data) as WsMessage;
            const key = dashboardQueryKey(token);

            switch (message.type) {
                case 'NEW_VITAL': {
                    const v = message.data;
                    const formattedV: VitalData = {
                        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        temperature: v.temperature,
                        has_medication: v.has_medication,
                        medication_type: v.medication_type,
                        recorded_at: v.recorded_at
                    };
                    queryClient.setQueryData<DashboardResponse>(key, prev => {
                        if (!prev) return prev;
                        const prevVitals = formatVitals(prev.vitals ?? []);

                        // Optimistic reconciliation: 2초 내 일치하는 임시 항목 교체
                        const optimisticIndex = prevVitals.findIndex(existing =>
                            existing.isOptimistic &&
                            Math.abs(new Date(existing.recorded_at).getTime() - new Date(v.recorded_at).getTime()) < 2000
                        );

                        let nextVitalsFormatted: VitalData[];
                        if (optimisticIndex !== -1) {
                            nextVitalsFormatted = [...prevVitals];
                            nextVitalsFormatted[optimisticIndex] = { ...formattedV, isOptimistic: false };
                        } else if (prevVitals.some(e => e.recorded_at === v.recorded_at)) {
                            nextVitalsFormatted = prevVitals;
                        } else {
                            nextVitalsFormatted = [formattedV, ...prevVitals];
                        }

                        // VitalData → VitalDataResponse 역변환 (캐시 타입 유지)
                        return {
                            ...prev,
                            vitals: nextVitalsFormatted.map(vd => ({
                                recorded_at: vd.recorded_at,
                                temperature: vd.temperature,
                                has_medication: vd.has_medication ?? false,
                                medication_type: vd.medication_type,
                                isOptimistic: vd.isOptimistic,
                                tempId: vd.tempId,
                            } as VitalDataResponse))
                        };
                    });
                    break;
                }
                case 'NEW_IV':
                    queryClient.setQueryData<DashboardResponse>(key, prev =>
                        prev ? { ...prev, iv_records: [message.data as IVRecord, ...(prev.iv_records ?? [])] } : prev
                    );
                    break;
                case 'IV_PHOTO_UPLOADED':
                    debouncedRefetch();
                    break;
                case 'NEW_DOC_REQUEST':
                case 'DOC_REQUEST_UPDATED':
                    debouncedRefetch();
                    break;
                case 'NEW_EXAM_SCHEDULE': {
                    const newExam = message.data as ExamScheduleItem;
                    queryClient.setQueryData<DashboardResponse>(key, prev => {
                        if (!prev) return prev;
                        const prevExams = prev.exam_schedules ?? [];
                        const optimisticIndex = prevExams.findIndex(ex =>
                            ex.isOptimistic &&
                            ex.name === newExam.name &&
                            ex.scheduled_at.split('T')[0] === newExam.scheduled_at.split('T')[0]
                        );
                        let next: ExamScheduleItem[];
                        if (optimisticIndex !== -1) {
                            next = [...prevExams];
                            next[optimisticIndex] = { ...newExam, isOptimistic: false };
                        } else {
                            next = [...prevExams, newExam];
                        }
                        return { ...prev, exam_schedules: next.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) };
                    });
                    break;
                }
                case 'DELETE_EXAM_SCHEDULE':
                    queryClient.setQueryData<DashboardResponse>(key, prev =>
                        prev
                            ? { ...prev, exam_schedules: (prev.exam_schedules ?? []).filter(ex => ex.id !== (message.data as unknown as ExamScheduleItem).id) }
                            : prev
                    );
                    break;
                case 'ADMISSION_TRANSFERRED':
                    debouncedRefetch();
                    break;
                case 'ADMISSION_DISCHARGED':
                    if (onDischarge) {
                        onDischarge();
                    } else {
                        alert('환자가 퇴원 처리되었습니다.');
                        if (typeof window !== 'undefined') {
                            window.close();
                            setTimeout(() => { window.location.href = '/403'; }, 500);
                        }
                    }
                    break;
                case 'NEW_MEAL_REQUEST':
                    if (admissionIdRef.current && message.data.admission_id === admissionIdRef.current) {
                        const data = { ...(message.data as unknown as MealRequest), isOptimistic: false };
                        queryClient.setQueryData<DashboardResponse>(key, prev => {
                            if (!prev) return prev;
                            const idx = (prev.meals ?? []).findIndex(m => m.id === data.id);
                            const nextMeals = idx !== -1
                                ? prev.meals.map(m => m.id === data.id ? data : m)
                                : [...(prev.meals ?? []), data];
                            return { ...prev, meals: nextMeals };
                        });
                    }
                    break;
                case 'MEAL_UPDATED':
                    if (admissionIdRef.current && (message.data as unknown as MealRequest).admission_id === admissionIdRef.current) {
                        const data = { ...(message.data as unknown as MealRequest), isOptimistic: false };
                        queryClient.setQueryData<DashboardResponse>(key, prev => {
                            if (!prev) return prev;
                            const idx = (prev.meals ?? []).findIndex(m => m.id === data.id);
                            const nextMeals = idx !== -1
                                ? prev.meals.map(m => m.id === data.id ? data : m)
                                : [...(prev.meals ?? []), data];
                            return { ...prev, meals: nextMeals };
                        });
                    }
                    break;
                case 'REFRESH_DASHBOARD':
                    debouncedRefetch();
                    break;
            }
        } catch (e) {
            console.error('WS Parse Error', e);
        }
    }, [queryClient, token, debouncedRefetch, onDischarge]);

    const initialLoadDoneRef = useRef(false);
    useEffect(() => {
        if (dashboardData) initialLoadDoneRef.current = true;
    }, [dashboardData]);

    const { isConnected } = useWebSocket({
        url: token ? `${api.getBaseUrl().replace(/^http/, 'ws')}/ws/${token}` : '',
        enabled: !!token && enabled,
        onOpen: () => {
            // WS 재연결 후 최신 데이터 동기화 (초기 로드 이후에만)
            if (initialLoadDoneRef.current && token) {
                void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(token) });
            }
        },
        onMessage: handleMessage
    });

    // --- Optimistic Update 헬퍼 (queryClient.setQueryData 기반) ---

    const addOptimisticVital = useCallback((temp: number, recordedAt: string) => {
        if (!token) return { tempId: '', rollback: () => {} };
        const tempId = `temp-vital-${Date.now()}`;
        const key = dashboardQueryKey(token);
        const optimisticVital: VitalDataResponse = {
            recorded_at: recordedAt,
            temperature: temp,
            has_medication: false,
            medication_type: undefined,
            isOptimistic: true,
            tempId,
        };
        queryClient.setQueryData<DashboardResponse>(key, prev =>
            prev ? { ...prev, vitals: [optimisticVital, ...(prev.vitals ?? [])] } : prev
        );
        return {
            tempId,
            rollback: () => {
                queryClient.setQueryData<DashboardResponse>(key, prev =>
                    prev ? { ...prev, vitals: (prev.vitals ?? []).filter(v => v.tempId !== tempId) } : prev
                );
            }
        };
    }, [queryClient, token]);

    const addOptimisticExam = useCallback((examData: { name: string; date: string; timeOfDay: string }) => {
        if (!token) return { tempId: '', rollback: () => {} };
        const tempId = `temp-exam-${Date.now()}`;
        const key = dashboardQueryKey(token);
        const newExam: ExamScheduleItem = {
            id: -1,
            tempId,
            admission_id: admissionIdRef.current || '',
            name: examData.name,
            scheduled_at: `${examData.date}T${examData.timeOfDay === 'am' ? '09:00:00' : '14:00:00'}`,
            isOptimistic: true
        };
        queryClient.setQueryData<DashboardResponse>(key, prev =>
            prev
                ? {
                    ...prev,
                    exam_schedules: [...(prev.exam_schedules ?? []), newExam].sort(
                        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                    )
                }
                : prev
        );
        return {
            tempId,
            rollback: () => {
                queryClient.setQueryData<DashboardResponse>(key, prev =>
                    prev ? { ...prev, exam_schedules: (prev.exam_schedules ?? []).filter(ex => ex.tempId !== tempId) } : prev
                );
            }
        };
    }, [queryClient, token]);

    const deleteOptimisticExam = useCallback((examId: number) => {
        if (!token) return { rollback: () => {} };
        const key = dashboardQueryKey(token);
        let deletedItem: ExamScheduleItem | undefined;
        queryClient.setQueryData<DashboardResponse>(key, prev => {
            if (!prev) return prev;
            deletedItem = prev.exam_schedules?.find(ex => ex.id === examId);
            return { ...prev, exam_schedules: (prev.exam_schedules ?? []).filter(ex => ex.id !== examId) };
        });
        return {
            rollback: () => {
                if (deletedItem) {
                    queryClient.setQueryData<DashboardResponse>(key, prev =>
                        prev
                            ? {
                                ...prev,
                                exam_schedules: [...(prev.exam_schedules ?? []), deletedItem!].sort(
                                    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                                )
                            }
                            : prev
                    );
                }
            }
        };
    }, [queryClient, token]);

    const updateOptimisticMeal = useCallback((mealId: number, pediatric: string, guardian: string) => {
        if (!token) return { rollback: () => {} };
        const key = dashboardQueryKey(token);
        let originalMeal: MealRequest | undefined;
        queryClient.setQueryData<DashboardResponse>(key, prev => {
            if (!prev) return prev;
            const nextMeals = prev.meals?.map(m => {
                if (m.id === mealId) {
                    originalMeal = { ...m };
                    return { ...m, pediatric_meal_type: pediatric, guardian_meal_type: guardian, isOptimistic: true };
                }
                return m;
            }) ?? [];
            return { ...prev, meals: nextMeals };
        });
        return {
            rollback: () => {
                if (originalMeal) {
                    queryClient.setQueryData<DashboardResponse>(key, prev =>
                        prev
                            ? { ...prev, meals: prev.meals?.map(m => m.id === mealId ? originalMeal! : m) ?? [] }
                            : prev
                    );
                }
            }
        };
    }, [queryClient, token]);

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
