import React from 'react';
import { Card } from './Card';
import { Thermometer, Droplet, QrCode } from 'lucide-react';

interface PatientCardProps {
    name: string;
    roomNumber: string;
    temperature: string | number;
    infusionRate: number | string | null;
    status: 'normal' | 'fever' | 'warning';
    onCardClick?: () => void;
    onQrClick?: (e: React.MouseEvent) => void;
}

export function PatientCard({ name, roomNumber, temperature, infusionRate, status, onCardClick, onQrClick }: PatientCardProps) {
    const statusStyles = {
        fever: 'border-status-danger border-2 bg-red-100 shadow-sm shadow-red-200',
        warning: 'border-status-warning border-2 bg-orange-50',
        normal: 'border-status-success border-2 bg-white',
    };

    return (
        <Card
            className={`relative transition-all duration-300 ${statusStyles[status]} ${onCardClick ? 'cursor-pointer' : ''} !p-2`}
            onClick={onCardClick}
        >
            <div className="flex justify-between items-start mb-1">
                <div>
                    <h4 className={`text-lg font-bold ${status === 'fever' ? 'text-red-700' : 'text-slate-800'}`}>{roomNumber}</h4>
                    <p className={`${status === 'fever' ? 'text-red-900/70' : 'text-slate-600'} text-xs font-medium`}>{name}</p>
                </div>
                {onQrClick && (
                    <button
                        onClick={onQrClick}
                        className="p-1.5 bg-white/50 hover:bg-white rounded-lg text-slate-400 hover:text-teal-600 transition-colors"
                        title="보호자용 QR 코드 보기"
                    >
                        <QrCode size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-1">
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
}
