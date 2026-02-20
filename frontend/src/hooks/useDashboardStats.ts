import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVitals } from './useVitals';

const STORAGE_KEY = 'dashboardViewMode';
type ViewMode = 'mobile' | 'desktop';

const MEAL_LABEL_MAP: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };
const DOC_LABEL_MAP: Record<string, string> = {
    RECEIPT: '진료비 계산서(영수증)',
    DETAIL: '진료비 세부내역서',
    CERT: '입퇴원확인서',
    DIAGNOSIS: '진단서',
    INITIAL: '초진기록지'
};

export function useDashboardStats() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const vitalsData = useVitals(token, true, () => {
        alert("퇴원 처리되었거나 유효하지 않은 접근입니다.");
        if (typeof window !== 'undefined') {
            window.close();
            // Fallback for browsers that block window.close()
            setTimeout(() => {
                router.push('/403');
            }, 500);
        }
    });

    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('mobile');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const v = localStorage.getItem(STORAGE_KEY);
            setViewMode(v === 'desktop' ? 'desktop' : 'mobile');
        }
    }, []);

    const setViewModeAndStore = (mode: ViewMode) => {
        setViewMode(mode);
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { }
    };

    const latestIv = vitalsData.ivRecords.length > 0 ? vitalsData.ivRecords[0] : null;

    const currentMeal = vitalsData.meals.length > 0 ? vitalsData.meals[0] : null;
    const currentMealLabel = currentMeal
        ? (currentMeal.request_type === 'STATION_UPDATE'
            ? (currentMeal.pediatric_meal_type || '일반식')
            : (MEAL_LABEL_MAP[currentMeal.request_type] ?? currentMeal.request_type))
        : null;

    // Aggregated list of all doc items currently in system
    const allDocItems = vitalsData.documentRequests
        .filter(req => req.status !== 'CANCELED')
        .flatMap(req => req.request_items);

    // List of ALL non-canceled requested items to disable them in the modal
    const requestedDocItems = vitalsData.documentRequests
        .filter(req => req.status !== 'CANCELED')
        .flatMap(req => req.request_items);

    // Remove duplicates and map to labels
    const currentDocLabels = Array.from(new Set(allDocItems))
        .map((id: string) => DOC_LABEL_MAP[id] || id);

    return {
        token,
        vitalsData,
        latestIv,
        currentMealLabel,
        currentDocLabels,
        requestedDocItems,
        viewMode,
        modalState: {
            isMealModalOpen,
            isDocModalOpen
        },
        actions: {
            setIsMealModalOpen,
            setIsDocModalOpen,
            setViewModeAndStore,
            refetch: vitalsData.refetchDashboard
        }
    };
}
