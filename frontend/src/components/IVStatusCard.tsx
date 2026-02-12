import React from 'react';
import { Card } from './Card';
import { Droplet, Camera, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface IVStatusCardProps {
    photoUrl?: string;
    infusionRate?: number;
    lastChecked?: string;
}

export function IVStatusCard({ photoUrl, infusionRate, lastChecked }: IVStatusCardProps) {
    return (
        <Card className="flex flex-col gap-4 bg-blue-50 border-blue-100 shadow-sm">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <Droplet className="text-blue-500" size={18} />
                    </div>
                    수액 안전 모니터링
                </h3>
                {lastChecked && (
                    <span className="flex items-center gap-1 text-xs bg-white text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 font-semibold shadow-sm">
                        <CheckCircle2 size={12} />
                        간호사 확인 완료
                    </span>
                )}
            </div>

            <div className="w-full aspect-video bg-white rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center relative overflow-hidden group">
                {photoUrl ? (
                    <img src={photoUrl} alt="IV Controller" className="object-cover w-full h-full opacity-90" />
                ) : (
                    <div className="text-center p-4">
                        <Camera className="text-blue-200 mx-auto mb-2" size={32} />
                        <p className="text-blue-300 text-sm font-medium">수액 조절기 사진 확인</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <span className="text-slate-500 text-sm font-medium">현재 주입 속도</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-800">{infusionRate || 0}</span>
                    <span className="text-slate-500 font-medium">cc/hr</span>
                </div>
            </div>
        </Card>
    );
}
