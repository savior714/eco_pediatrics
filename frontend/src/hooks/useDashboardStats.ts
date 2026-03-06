import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVitals } from './useVitals';
import { DOC_MAP } from '@/constants/mappings';

const STORAGE_KEY = 'dashboardViewMode';
type ViewMode = 'mobile' | 'desktop';

const MEAL_LABEL_MAP: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };

export function useDashboardStats() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const onDischarge = useCallback(() => {
        alert("퇴원 처리되었거나 유효하지 않은 접근입니다.");
        if (typeof window !== 'undefined') {
            window.close();
            setTimeout(() => { router.push('/403'); }, 500);
        }
    }, [router]);

    const vitalsData = useVitals(token, true, onDischarge);

    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('mobile');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const v = localStorage.getItem(STORAGE_KEY);
            setViewMode(v === 'desktop' ? 'desktop' : 'mobile');
        }
    }, []);

    const setViewModeAndStore = useCallback((mode: ViewMode) => {
        setViewMode(mode);
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { }
    }, []);

    const latestIv = useMemo(() => {
        return vitalsData.ivRecords.length > 0 ? vitalsData.ivRecords[0] : null;
    }, [vitalsData.ivRecords]);

    const currentMealLabel = useMemo(() => {
        const currentMeal = vitalsData.meals.length > 0 ? vitalsData.meals[0] : null;
        return currentMeal
            ? (currentMeal.request_type === 'STATION_UPDATE'
                ? (currentMeal.pediatric_meal_type || '일반식')
                : (MEAL_LABEL_MAP[currentMeal.request_type] ?? currentMeal.request_type))
            : null;
    }, [vitalsData.meals]);

    // Aggregated list of all doc items currently in system
    const requestedDocItems = useMemo(() => {
        return vitalsData.documentRequests
            .filter(req => req.status !== 'CANCELED')
            .flatMap(req => req.request_items);
    }, [vitalsData.documentRequests]);

    // Remove duplicates and map to labels (한글, DOC_MAP 단일 소스)
    const currentDocLabels = useMemo(() => {
        return Array.from(new Set(requestedDocItems))
            .map((id: string) => DOC_MAP[id] || id);
    }, [requestedDocItems]);

    const modalState = useMemo(() => ({
        isMealModalOpen,
        isDocModalOpen
    }), [isMealModalOpen, isDocModalOpen]);

    const actions = useMemo(() => ({
        setIsMealModalOpen,
        setIsDocModalOpen,
        setViewModeAndStore,
        refetch: vitalsData.refetchDashboard
    }), [setViewModeAndStore, vitalsData.refetchDashboard]);

    return {
        token,
        vitalsData,
        latestIv,
        currentMealLabel,
        currentDocLabels,
        requestedDocItems,
        viewMode,
        modalState,
        actions
    };
}
