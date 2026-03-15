import React from 'react';
import { Card } from './Card';
import { Droplet, Camera, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 수액 안전 모니터링 카드 Props */
interface IVStatusCardProps {
    /** 수액 조절기 사진 URL */
    photoUrl?: string;
    /** 현재 주입 속도 (cc/hr) */
    infusionRate?: number;
    /** 간호사 마지막 확인 시각 */
    lastChecked?: string;
    className?: string;
}

/**
 * 수액 조절기 사진, 주입 속도, 간호사 확인 여부를 표시하는 카드 컴포넌트.
 */
export function IVStatusCard({ photoUrl, infusionRate, lastChecked, className }: IVStatusCardProps) {
    return (
        <Card className={cn("flex flex-col gap-4 bg-white border-slate-200/80 shadow-sm", className)}>
            <div className="flex justify-between items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                    <span className="w-9 h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/50">
                        <Droplet size={18} />
                    </span>
                    수액 안전 모니터링
                </h3>
                {lastChecked && (
                    <span className="flex items-center gap-1.5 text-[10px] bg-blue-50/50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100 font-bold shrink-0">
                        <CheckCircle2 size={10} />
                        간호사 확인 완료
                    </span>
                )}
            </div>

            <div className="w-full aspect-video bg-slate-50/50 rounded-xl border-[1.5px] border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden min-h-[140px]">
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="IV Controller" className="object-cover w-full h-full" />
                ) : (
                    <div className="text-center p-4">
                        <Camera className="text-slate-300 mx-auto mb-2" size={32} />
                        <p className="text-slate-400 text-sm font-bold">수액 조절기 사진 확인</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-slate-50/30 p-4 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-sm font-bold">현재 주입 속도</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800 tabular-nums">{infusionRate ?? '-'}</span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-tight">cc/hr</span>
                </div>
            </div>
        </Card>
    );
}
