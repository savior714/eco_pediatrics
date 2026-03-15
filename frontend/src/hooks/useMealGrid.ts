'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Bed, MealRequest } from '@/types/domain';
import { formatDate } from '@/components/mealGridUtils';

export type MealMatrix = Record<string, Record<string, MealRequest>>;

interface UseMealGridParams {
    activeDate: Date;
    patients: Bed[];
}

interface UseMealGridReturn {
    matrix: MealMatrix;
    loading: boolean;
    fetchMatrix: () => Promise<void>;
    handleUpdate: (bed: Bed, mealTime: string, field: keyof MealRequest, value: string) => Promise<void>;
}

export function useMealGrid({ activeDate, patients }: UseMealGridParams): UseMealGridReturn {
    const [matrix, setMatrix] = useState<MealMatrix>({});
    const [loading, setLoading] = useState(false);
    const requestRef = useRef(0);

    const fetchMatrix = useCallback(async () => {
        const currentRequestId = ++requestRef.current;
        setLoading(true);
        try {
            const dateStr = formatDate(activeDate);
            const res = await api.get(`/api/v1/meals/matrix?target_date=${dateStr}`);

            if (currentRequestId !== requestRef.current) {
                console.warn(`[fetchMatrix] 오래된 응답 무시됨. reqId: ${currentRequestId}`);
                return;
            }
            if (!Array.isArray(res)) return;

            const map: MealMatrix = {};
            patients.forEach(p => { if (p.id) map[p.id] = {}; });
            res.forEach((req: MealRequest) => {
                if (req.admission_id && req.meal_time) {
                    if (!map[req.admission_id]) map[req.admission_id] = {};
                    map[req.admission_id][req.meal_time] = req;
                }
            });
            setMatrix(map);
        } catch (e) {
            console.error('Fetch Matrix Error', e);
        } finally {
            setLoading(false);
        }
    }, [activeDate, patients]);

    const handleUpdate = useCallback(async (
        bed: Bed,
        mealTime: string,
        field: keyof MealRequest,
        value: string
    ) => {
        if (!bed.id) return;

        const currentReq = matrix[bed.id]?.[mealTime] || {};

        setMatrix(prev => ({
            ...prev,
            [bed.id]: {
                ...prev[bed.id],
                [mealTime]: { ...currentReq, [field]: value } as MealRequest
            }
        }));

        try {
            const payload = {
                admission_id: bed.id,
                request_type: 'STATION_UPDATE',
                meal_date: formatDate(activeDate),
                meal_time: mealTime,
                pediatric_meal_type: field === 'pediatric_meal_type' ? value : (currentReq.pediatric_meal_type || '선택 안함'),
                guardian_meal_type: field === 'guardian_meal_type' ? value : (currentReq.guardian_meal_type || '선택 안함'),
                room_note: field === 'room_note' ? value : (currentReq.room_note || '')
            };
            await api.post('/api/v1/meals/requests', payload);
        } catch (e) {
            console.error('Update Failed', e);
            alert('저장 실패');
            await fetchMatrix();
        }
    }, [matrix, activeDate, fetchMatrix]);

    return { matrix, loading, fetchMatrix, handleUpdate };
}
