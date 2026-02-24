import React, { memo } from 'react';
import { Card } from './Card';
import { Thermometer, Droplet, QrCode } from 'lucide-react';
import { formatPatientDemographics } from '@/utils/dateUtils';
import { Bed } from '@/types/domain';

interface PatientCardProps {
    name: string;
    roomNumber: string;
    temperature: string | number;
    infusionRate: number | string | null;
    status: 'normal' | 'fever' | 'warning';
    dob?: string;
    gender?: string;
    bed?: Bed;
    onCardClick?: (room: string) => void;
    onQrClick?: (e: React.MouseEvent, bed: Bed) => void;
}

export const PatientCard = memo(function PatientCard({ name, roomNumber, temperature, infusionRate, status, dob, gender, bed, onCardClick, onQrClick }: PatientCardProps) {
    const statusStyles = {
        fever: 'border-status-danger border-2 bg-red-100 shadow-sm shadow-red-200',
        warning: 'border-status-warning border-2 bg-orange-50',
        normal: 'border-status-success border-2 bg-white',
    };

    return (
        <Card
            className={`relative transition-all duration-300 ${statusStyles[status]} ${onCardClick ? 'cursor-pointer' : ''} !p-3 pb-2 pt-4`}
            onClick={onCardClick ? () => onCardClick(roomNumber) : undefined}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className={`text-lg font-bold ${status === 'fever' ? 'text-red-700' : 'text-slate-800'}`}>{roomNumber}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <p className={`${status === 'fever' ? 'text-red-900/70' : 'text-slate-600'} text-[11px] font-bold`}>{name}</p>
                        <span className="text-[10px] text-slate-300">|</span>
                        <span className={`text-[10px] font-bold ${gender === 'M' ? 'text-blue-500' : gender === 'F' ? 'text-rose-500' : 'text-slate-500'}`}>
                            {formatPatientDemographics(dob, gender)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {bed?.attending_physician ? (
                        <div
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100 shadow-sm pointer-events-none"
                            title={bed.attending_physician}
                        >
                            {bed.attending_physician.charAt(0)}
                        </div>
                    ) : (
                        <div
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-400 font-bold text-sm border border-slate-200 shadow-sm pointer-events-none cursor-help"
                            title="담당의 미지정"
                        >
                            -
                        </div>
                    )}
                    {onQrClick && bed && (
                        <button
                            onClick={(e) => onQrClick(e, bed)}
                            className="p-1.5 bg-white/50 hover:bg-white rounded-lg text-slate-400 hover:text-teal-600 transition-colors"
                            title="보호자용 QR 코드 보기"
                        >
                            <QrCode size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                <div className="bg-slate-100/50 p-1.5 rounded-lg flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5 font-medium">
                        <Thermometer size={12} className="text-status-danger" /> 체온
                    </div>
                    <div className="text-base font-bold text-slate-800">
                        {temperature}°
                    </div>
                </div>
                <div className="bg-slate-100/50 p-1.5 rounded-lg flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5 font-medium">
                        <Droplet size={12} className="text-primary" /> 수액
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-base font-bold text-slate-800">{infusionRate ?? '-'}</span>
                        <span className="text-[10px] text-slate-400">cc/hr</span>
                    </div>
                </div>
            </div>
        </Card >
    );
}, (prev, next) => {
    // Custom comparator to prevent re-renders when 'bed' object reference changes
    // but relevant data remains the same (e.g. after API polling).

    const prevKeys = Object.keys(prev) as (keyof PatientCardProps)[];
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    // 1. Check all props for shallow equality except 'bed'
    for (const key of prevKeys) {
        if (key === 'bed') continue;
        if (prev[key] !== next[key]) return false;
    }

    // 2. Bed object comparison
    if (prev.bed === next.bed) return true;
    if (!prev.bed || !next.bed) return false;

    // Deep compare relevant fields
    // Only 'attending_physician' is visually rendered.
    // 'id' and 'token' are used in callbacks (e.g. QR code).
    // Other fields in 'bed' (like notes, history) do not affect this component's rendering.
    return (
        prev.bed.id === next.bed.id &&
        prev.bed.token === next.bed.token &&
        prev.bed.attending_physician === next.bed.attending_physician
    );
});
