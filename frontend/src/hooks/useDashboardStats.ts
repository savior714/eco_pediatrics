import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVitals } from './useVitals';
import { DOC_MAP } from '@/constants/mappings';

const STORAGE_KEY = 'dashboardViewMode';
type ViewMode = 'mobile' | 'desktop';

const MEAL_LABEL_MAP: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };

export function useDashboardStats() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlToken = searchParams.get('token');

    // IPC 이벤트(update-preview-patient)로 수신된 토큰이 있으면 URL 파라미터보다 우선 적용.
    // Tauri 미리보기 창에서 환자를 교체할 때 창 재생성 없이 데이터만 갱신하기 위한 패턴.
    const [ipcToken, setIpcToken] = useState<string | null>(null);
    const token = ipcToken ?? urlToken;

    useEffect(() => {
        const isTauri = typeof window !== 'undefined' &&
            '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>);
        if (!isTauri) return;

        let unlisten: (() => void) | null = null;
        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<{ token: string }>('update-preview-patient', (event) => {
                setIpcToken(event.payload.token);
            }).then((fn) => { unlisten = fn; });
        });

        return () => { unlisten?.(); };
    }, []);

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

    const nonCanceledDocItems = vitalsData.documentRequests
        .filter(req => req.status !== 'CANCELED')
        .flatMap(req => req.request_items);

    const requestedDocItems = nonCanceledDocItems;

    const currentDocLabels = Array.from(new Set(nonCanceledDocItems))
        .map((id: string) => DOC_MAP[id] || id);

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
