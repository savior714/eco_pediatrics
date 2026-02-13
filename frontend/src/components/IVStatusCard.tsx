import React from 'react';
import { Card } from './Card';
import { Droplet, Camera, CheckCircle2 } from 'lucide-react';

interface IVStatusCardProps {
    photoUrl?: string;
    infusionRate?: number;
    lastChecked?: string;
}

export function IVStatusCard({ photoUrl, infusionRate, lastChecked }: IVStatusCardProps) {
    return (
        <Card className="flex flex-col gap-4 bg-sky-50/80 border-sky-200/80">
            <div className="flex justify-between items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                    <span className="w-9 h-9 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                        <Droplet size={18} />
                    </span>
                    수액 안전 모니터링
                </h3>
                {lastChecked && (
                    <span className="flex items-center gap-1.5 text-xs bg-white text-sky-600 px-3 py-1.5 rounded-full border border-sky-200 font-medium shrink-0">
                        <CheckCircle2 size={12} />
                        간호사 확인 완료
                    </span>
                )}
            </div>

            <div className="w-full aspect-video bg-white rounded-xl border-2 border-dashed border-sky-200 flex flex-col items-center justify-center relative overflow-hidden min-h-[120px]">
                {photoUrl ? (
                    <img src={photoUrl} alt="IV Controller" className="object-cover w-full h-full opacity-90" />
                ) : (
                    <div className="text-center p-4">
                        <Camera className="text-sky-200 mx-auto mb-2" size={32} />
                        <p className="text-sky-400 text-sm font-medium">수액 조절기 사진 확인</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-sky-200/80">
                <span className="text-slate-500 text-sm font-medium">현재 주입 속도</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-800">{infusionRate || 0}</span>
                    <span className="text-slate-500 font-medium">cc/hr</span>
                </div>
            </div>
        </Card>
    );
}
