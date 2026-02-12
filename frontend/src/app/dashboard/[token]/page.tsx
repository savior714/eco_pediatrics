'use client';

import React, { useState } from 'react';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Card } from '@/components/Card';
import { Utensils, FileText, Wifi, WifiOff } from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DocumentRequestModal } from '@/components/DocumentRequestModal';

export default function Dashboard({ params }: { params: { token: string } }) {
    const { token } = params;
    const { vitals, isConnected, admissionId, patientName, checkInAt } = useVitals(token); // checkInAt 추가
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white text-slate-800 p-6 rounded-b-3xl shadow-sm relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-1 text-slate-900">
                            {patientName || 'Loading...'}
                            <span className="text-lg font-medium text-slate-500 ml-1">환자</span>
                        </h1>
                        <p className="text-slate-500 font-medium">201호 | {checkInAt ? `${Math.floor((new Date().getTime() - new Date(checkInAt).getTime()) / (1000 * 60 * 60 * 24)) + 1}일차` : '...'}</p>
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
                    <TemperatureGraph data={vitals} checkInAt={checkInAt} />
                </div>

                {/* Actions (Meals & Docs) - Moved up as per spec */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setIsMealModalOpen(true)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 group"
                    >
                        <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <Utensils size={24} />
                        </div>
                        <span className="font-bold text-slate-700">식단 신청</span>
                    </button>
                    <button
                        onClick={() => setIsDocModalOpen(true)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 group"
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <FileText size={24} />
                        </div>
                        <span className="font-bold text-slate-700">서류 신청</span>
                    </button>
                </div>

                {/* IV Status - Updated Text */}
                <IVStatusCard
                    photoUrl="" // Placeholder
                    infusionRate={60}
                    lastChecked="오후 2:00"
                />
                <p className="text-center text-xs text-slate-400 -mt-4 mb-2">
                    * 라인 확보 및 수액 속도 확인 완료
                </p>

                {/* Notices (New) */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-teal-500 rounded-full"></span>
                        병원 공지사항
                    </h3>
                    <div className="space-y-3">
                        <NoticeItem text="어린이날 맞이 1층 로비 선물 증정 안내" date="05.04" />
                        <NoticeItem text="병동 정기 소독 안내 (금일 오후 3시)" date="05.02" />
                    </div>
                </div>
            </main>

            <MealRequestModal
                isOpen={isMealModalOpen}
                onClose={() => setIsMealModalOpen(false)}
                admissionId={admissionId}
            />

            <DocumentRequestModal
                isOpen={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                admissionId={admissionId}
            />
        </div>
    );
}

function NoticeItem({ text, date }: { text: string; date: string }) {
    return (
        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <p className="text-sm text-slate-700 font-medium line-clamp-1">{text}</p>
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{date}</span>
        </div>
    );
}
