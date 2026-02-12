'use client';

import React from 'react';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Card } from '@/components/Card';
import { Utensils, FileText, Wifi, WifiOff } from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';

export default function Dashboard({ params }: { params: { token: string } }) {
    const { token } = params;
    const { vitals, isConnected } = useVitals(token);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white text-slate-800 p-6 rounded-b-3xl shadow-sm relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1 text-slate-900">이*원 <span className="text-lg font-medium text-slate-500">환자</span></h1>
                        <p className="text-slate-500 font-medium">201호 | 입원 3일차</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full" title={isConnected ? "실시간 연결됨" : "연결 끊김"}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
                        <span className="text-xs text-slate-500 font-medium">{isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-4 relative z-20 flex flex-col gap-6">
                {/* Vitals Graph (Hero) */}
                <div className="pt-2">
                    <TemperatureGraph data={vitals} />
                </div>

                {/* Actions (Meals & Docs) - Moved up as per spec */}
                <section className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-3 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all hover:bg-orange-50 group">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 group-hover:bg-orange-200 transition-colors">
                            <Utensils size={20} />
                        </div>
                        <span className="font-bold text-slate-700">식단 신청</span>
                    </button>
                    <button className="flex items-center justify-center gap-3 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all hover:bg-blue-50 group">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 group-hover:bg-blue-200 transition-colors">
                            <FileText size={20} />
                        </div>
                        <span className="font-bold text-slate-700">서류 신청</span>
                    </button>
                </section>

                {/* IV Status - Updated Text */}
                <IVStatusCard
                    photoUrl="" // Placeholder
                    dropsPerMin={20}
                    lastChecked="오후 2:00"
                />
                <p className="text-center text-xs text-slate-400 -mt-4 mb-2">
                    * 라인 확보 및 수액 속도 확인 완료
                </p>

                {/* Notices (New) */}
                <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">📢</span> 병동 공지사항
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded">회진</span>
                            <div className="text-sm">
                                <p className="font-medium text-slate-700">오전 회진 시간 안내</p>
                                <p className="text-slate-500 text-xs mt-0.5">교수님 회진은 09:30 ~ 10:30 사이 예정입니다.</p>
                            </div>
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
