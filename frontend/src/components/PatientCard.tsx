import React, { memo } from 'react';
import { Card } from './Card';
import { Thermometer, Droplet, QrCode } from 'lucide-react';
import { formatPatientDemographics } from '@/utils/dateUtils';
import { Bed } from '@/types/domain';

interface PatientCardProps {
    bed: Bed;
    onCardClick?: (room: string) => void;
    onQrClick?: (bed: Bed) => void;
}

export const PatientCard = memo(function PatientCard({ bed, onCardClick, onQrClick }: PatientCardProps) {
    const { name, room: roomNumber, temp, drops: infusionRate, status, dob, gender } = bed;

    const formattedTemp = temp !== null ? temp.toFixed(1) : '-';
    const formattedDrops = infusionRate ?? '-';

    const statusStyles = {
        fever: 'border-status-danger border-2 bg-red-100 shadow-sm shadow-red-200',
        warning: 'border-status-warning border-2 bg-orange-50',
        normal: 'border-status-success border-2 bg-white',
    };

    return (
        <Card
            className={`relative transition-all duration-300 ${statusStyles[status]} ${onCardClick ? 'cursor-pointer' : ''} !p-3 pb-2 pt-4`}
            onClick={() => onCardClick?.(roomNumber)}
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
                {onQrClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onQrClick(bed);
                        }}
                        className="p-1.5 bg-white/50 hover:bg-white rounded-lg text-slate-400 hover:text-teal-600 transition-colors"
                        title="보호자용 QR 코드 보기"
                    >
                        <QrCode size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                <div className="bg-slate-100/50 p-1.5 rounded-lg flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5 font-medium">
                        <Thermometer size={12} className="text-status-danger" /> 체온
                    </div>
                    <div className="text-base font-bold text-slate-800">
                        {formattedTemp}°
                    </div>
                </div>
                <div className="bg-slate-100/50 p-1.5 rounded-lg flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-0.5 font-medium">
                        <Droplet size={12} className="text-primary" /> 수액
                    </div>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-base font-bold text-slate-800">{formattedDrops}</span>
                        <span className="text-[10px] text-slate-400">cc/hr</span>
                    </div>
                </div>
            </div>
        </Card >
    );
});
