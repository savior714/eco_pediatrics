import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { WsMessage, VitalData, IVRecord, MealRequest, ExamScheduleItem, VitalDataResponse } from '@/types/domain';
import { dashboardQueryKey, formatVitals, type DashboardResponse } from './useDashboardData';

interface UseVitalsWsHandlerParams {
    queryClient: QueryClient;
    token: string | null | undefined;
    admissionIdRef: MutableRefObject<string | null>;
    debouncedRefetch: () => void;
    onDischarge?: () => void;
}

export function useVitalsWsHandler({
    queryClient,
    token,
    admissionIdRef,
    debouncedRefetch,
    onDischarge,
}: UseVitalsWsHandlerParams): (event: MessageEvent) => void {
    return useCallback((event: MessageEvent) => {
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
                        return {
                            ...prev,
                            exam_schedules: next.sort((a, b) =>
                                new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                            )
                        };
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
                case 'MEAL_UPDATED': {
                    const handleMealUpdate = (rawData: unknown) => {
                        if (!admissionIdRef.current) return;
                        const data = { ...(rawData as MealRequest), isOptimistic: false };
                        if (data.admission_id !== admissionIdRef.current) return;
                        queryClient.setQueryData<DashboardResponse>(key, prev => {
                            if (!prev) return prev;
                            const idx = (prev.meals ?? []).findIndex(m => m.id === data.id);
                            const nextMeals = idx !== -1
                                ? prev.meals.map(m => m.id === data.id ? data : m)
                                : [...(prev.meals ?? []), data];
                            return { ...prev, meals: nextMeals };
                        });
                    };
                    handleMealUpdate(message.data);
                    break;
                }
                case 'REFRESH_DASHBOARD':
                    debouncedRefetch();
                    break;
            }
        } catch (e) {
            console.error('WS Parse Error', e);
        }
    }, [queryClient, token, admissionIdRef, debouncedRefetch, onDischarge]);
}
