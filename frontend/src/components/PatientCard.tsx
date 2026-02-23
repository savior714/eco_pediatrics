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

function arePropsEqual(prev: PatientCardProps, next: PatientCardProps) {
    if (prev.name !== next.name) return false;
    if (prev.roomNumber !== next.roomNumber) return false;
    if (prev.temperature !== next.temperature) return false;
    if (prev.infusionRate !== next.infusionRate) return false;
    if (prev.status !== next.status) return false;
    if (prev.dob !== next.dob) return false;
    if (prev.gender !== next.gender) return false;
    if (prev.onCardClick !== next.onCardClick) return false;
    if (prev.onQrClick !== next.onQrClick) return false;

    // Bed comparison: Check if relevant fields changed
    const prevBed = prev.bed;
    const nextBed = next.bed;

    // If one is undefined and other is not, re-render
    if (!prevBed !== !nextBed) return false;

    // If both undefined, equal (if other props match)
    if (!prevBed && !nextBed) return true;

    // If both defined, check relevant fields
    if (prevBed && nextBed) {
         if (prevBed.attending_physician !== nextBed.attending_physician) return false;
         if (prevBed.token !== nextBed.token) return false;
         if (prevBed.id !== nextBed.id) return false;
    }

    return true;
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
}, arePropsEqual);
