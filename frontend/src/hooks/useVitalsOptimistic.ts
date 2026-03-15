import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { VitalDataResponse, MealRequest, ExamScheduleItem } from '@/types/domain';
import { dashboardQueryKey, type DashboardResponse } from './useDashboardData';

interface UseVitalsOptimisticParams {
    queryClient: QueryClient;
    token: string | null | undefined;
    admissionIdRef: MutableRefObject<string | null>;
}

export function useVitalsOptimistic({ queryClient, token, admissionIdRef }: UseVitalsOptimisticParams) {
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
    }, [queryClient, token, admissionIdRef]);

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

    return { addOptimisticVital, addOptimisticExam, deleteOptimisticExam, updateOptimisticMeal };
}
