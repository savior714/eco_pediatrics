'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useStation } from '@/hooks/useStation';

type StationDataValue = ReturnType<typeof useStation>;

const StationDataContext = createContext<StationDataValue | null>(null);

interface StationDataProviderProps {
    children: ReactNode;
}

/**
 * useStation()을 트리 내 단 한 번만 호출하고, 그 결과를 컨텍스트로 공급한다.
 * WebSocket 이중 연결 방지를 위해 Station 페이지는 이 Provider 하위에서만 스테이션 데이터를 사용한다.
 */
export function StationDataProvider({ children }: StationDataProviderProps) {
    const value = useStation();
    return (
        <StationDataContext.Provider value={value}>
            {children}
        </StationDataContext.Provider>
    );
}

export function useStationData(): StationDataValue {
    const ctx = useContext(StationDataContext);
    if (!ctx) {
        throw new Error('useStationData must be used within <StationDataProvider>');
    }
    return ctx;
}
