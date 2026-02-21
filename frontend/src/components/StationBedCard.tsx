import React, { useCallback } from 'react';
import { PatientCard } from './PatientCard';
import { Bed } from '@/types/domain';

interface StationBedCardProps {
    bed: Bed;
    actions: any;
}

export const StationBedCard = React.memo(function StationBedCard({ bed, actions }: StationBedCardProps) {
    const handleCardClick = useCallback(() => {
        actions.setSelectedRoom(bed.room);
    }, [actions, bed.room]);

    const handleQrClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (bed.token) {
            actions.setQrBed(bed);
        } else {
            alert('토큰 없음');
        }
    }, [actions, bed]);

    return (
        <PatientCard
            name={bed.name}
            roomNumber={bed.room}
            temperature={bed.temp !== null ? bed.temp?.toFixed(1) : '-'}
            infusionRate={bed.drops ?? '-'}
            status={bed.status}
            dob={bed.dob}
            gender={bed.gender}
            onCardClick={handleCardClick}
            onQrClick={handleQrClick}
        />
    );
});
