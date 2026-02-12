import React from 'react';
import { Card } from './Card';
import { Thermometer, Droplet, Printer } from 'lucide-react';

interface PatientCardProps {
    name: string;
    roomNumber: string;
    temperature: number;
    infusionRate: number;
    status: 'normal' | 'fever' | 'warning';
    onPrintQR: () => void;
}

export function PatientCard({ name, roomNumber, temperature, infusionRate, status, onPrintQR }: PatientCardProps) {
    const statusStyles = {
        fever: 'border-status-danger border-2 bg-red-100 shadow-sm shadow-red-200', // Darker background for visibility
        warning: 'border-status-warning border-2 bg-orange-50',
        normal: 'border-status-success border-2 bg-white',
    };

    return (
        <Card className={`relative transition-all duration-300 ${statusStyles[status]}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className={`text-xl font-bold ${status === 'fever' ? 'text-red-700' : 'text-slate-800'}`}>{roomNumber}</h4>
                    <p className={`${status === 'fever' ? 'text-red-900/70' : 'text-slate-600'} font-medium`}>{name}</p>
                </div>
                <button
                    onClick={onPrintQR}
                    className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-700 transition"
                >
                    <Printer size={18} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-slate-100/50 p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-500 text-xs mb-1 font-medium">
                        <Thermometer size={14} className="text-status-danger" /> 체온
                    </div>
                    <div className="text-lg font-bold text-slate-800">
                        {temperature}°
                    </div>
                </div>
                <div className="bg-slate-100/50 p-3 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-500 text-xs mb-1 font-medium">
                        <Droplet size={14} className="text-primary" /> 수액
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-lg font-bold text-slate-800">{infusionRate}</span>
                        <span className="text-xs text-slate-400 ml-1">cc/hr</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
