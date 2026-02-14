import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface CommonMealPlan {
    date: string; // YYYY-MM-DD
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snack?: string;
}

export function useMeals() {
    const [plans, setPlans] = useState<CommonMealPlan[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPlans = useCallback(async (startDate: string, endDate: string) => {
        setLoading(true);
        try {
            const data = await api.get<CommonMealPlan[]>(`/api/v1/meals/plans?start_date=${startDate}&end_date=${endDate}`);
            setPlans(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const savePlans = useCallback(async (newPlans: CommonMealPlan[]) => {
        setLoading(true);
        try {
            await api.post('/api/v1/meals/plans', newPlans);
            // Optimistic update or refetch could happen here
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        plans,
        setPlans,
        fetchPlans,
        savePlans,
        loading
    };
}
