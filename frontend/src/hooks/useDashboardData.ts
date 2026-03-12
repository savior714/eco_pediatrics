import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { VitalData, VitalDataResponse } from '@/types/domain';
import type { IVRecord, MealRequest, DocumentRequest, ExamScheduleItem } from '@/types/domain';

/** 대시보드 API 응답 스키마 */
export interface DashboardResponse {
    admission: {
        id: string;
        patient_name_masked: string;
        display_name: string;
        room_number: string;
        check_in_at: string;
        dob?: string;
        gender?: string;
    };
    vitals: VitalDataResponse[];
    meals: MealRequest[];
    document_requests: DocumentRequest[];
    iv_records: IVRecord[];
    exam_schedules: ExamScheduleItem[];
}

/** React Query queryKey 생성 헬퍼 */
export const dashboardQueryKey = (token: string) => ['dashboard', token] as const;

export function formatVitals(raw: VitalDataResponse[]): VitalData[] {
    return raw.map(v => ({
        time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: v.temperature,
        has_medication: v.has_medication,
        medication_type: v.medication_type,
        recorded_at: v.recorded_at
    }));
}

export interface UseDashboardDataReturn {
    data: DashboardResponse | undefined;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
    queryClient: ReturnType<typeof useQueryClient>;
    tokenInvalidatedRef: React.MutableRefObject<boolean>;
}

/**
 * 대시보드 GET + 토큰 무효화/에러 처리만 담당.
 * WS·낙관적 업데이트는 useVitals에서 queryClient로 처리.
 */
export function useDashboardData(
    token: string | null | undefined,
    enabled: boolean,
    onDischarge?: () => void
): UseDashboardDataReturn {
    const queryClient = useQueryClient();
    const tokenInvalidatedRef = useRef(false);

    const { data, isFetching, refetch } = useQuery({
        queryKey: token ? dashboardQueryKey(token) : ['dashboard', '__disabled__'],
        enabled: !!token && enabled && !tokenInvalidatedRef.current,
        staleTime: 30_000,
        queryFn: async () => {
            if (!token) throw new Error('token required');
            const res = await api.get<DashboardResponse>(`/api/v1/dashboard/${token}`, {
                headers: { 'X-Admission-Token': token }
            });
            if (!res || Object.keys(res).length === 0) {
                throw new Error('empty response');
            }
            return res;
        },
        retry: (failureCount, error) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('403') || msg.includes('404') || msg.includes('Invalid or inactive')) {
                return false;
            }
            return failureCount < 1;
        },
    });

    const { error: queryError } = useQuery({
        queryKey: token ? dashboardQueryKey(token) : ['dashboard', '__disabled__'],
        enabled: false,
    });

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

    useEffect(() => {
        tokenInvalidatedRef.current = false;
    }, [token]);

    return { data, isFetching, refetch, queryClient, tokenInvalidatedRef };
}
