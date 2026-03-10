'use client';

import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { Bed } from '@/types/domain';

interface StationContextValue {
    // 선택된 병실 (PatientDetailModal 트리거)
    selectedRoom: string | null;
    setSelectedRoom: (room: string | null) => void;

    // 선택된 환자 침대 (selectedRoom 기반 파생값)
    selectedBed: Bed | null;

    // QR 코드 모달 대상
    qrBed: Bed | null;
    setQrBed: (bed: Bed | null) => void;

    // 입원 처리 대상 병실
    admitRoom: string | null;
    setAdmitRoom: (room: string | null) => void;

    // beds 접근 (selectedBed 파생을 위해)
    _setBeds: (beds: Bed[]) => void;
}

const StationContext = createContext<StationContextValue | null>(null);

interface StationProviderProps {
    children: ReactNode;
    beds: Bed[];
}

export function StationProvider({ children, beds }: StationProviderProps) {
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [qrBed, setQrBed] = useState<Bed | null>(null);
    const [admitRoom, setAdmitRoom] = useState<string | null>(null);

    const selectedBed = useMemo(
        () => (selectedRoom ? beds.find(b => String(b.room) === selectedRoom) ?? null : null),
        [beds, selectedRoom]
    );

    const value: StationContextValue = {
        selectedRoom,
        setSelectedRoom,
        selectedBed,
        qrBed,
        setQrBed,
        admitRoom,
        setAdmitRoom,
        _setBeds: () => {}, // beds는 부모(useStation)가 관리, 여기서는 파생값만 사용
    };

    return (
        <StationContext.Provider value={value}>
            {children}
        </StationContext.Provider>
    );
}

export function useStationContext(): StationContextValue {
    const ctx = useContext(StationContext);
    if (!ctx) {
        throw new Error('useStationContext must be used within <StationProvider>');
    }
    return ctx;
}
