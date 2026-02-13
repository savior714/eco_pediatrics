'use client';

import React, { useState } from 'react';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Card } from '@/components/Card';
import { Utensils, FileText, CalendarCheck } from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DocumentRequestModal } from '@/components/DocumentRequestModal';

export default function Dashboard({ params }: { params: { token: string } }) {
    const { token } = params;
    const { vitals, isConnected, admissionId, patientName, checkInAt, roomNumber, meals, refetchDashboard } = useVitals(token);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    const mealLabel: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };
    const currentMeal = meals.length > 0 ? meals[0] : null;
    const currentMealLabel = currentMeal ? (mealLabel[currentMeal.request_type] ?? currentMeal.request_type) : null;

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-50 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-md mx-auto">
            {/* Header - 모바일 안전 영역 */}
            <header className="bg-white text-slate-800 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 rounded-b-3xl shadow-sm relative z-10">
                <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-bold mb-0.5 text-slate-900 truncate">
                            {patientName || 'Loading...'}
                            <span className="text-base font-medium text-slate-500 ml-1">환자</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-medium" suppressHydrationWarning>
                            {roomNumber ? `${roomNumber}` : '...'} | {checkInAt ? `${Math.floor((new Date().getTime() - new Date(checkInAt).getTime()) / (1000 * 60 * 60 * 24)) + 1}일차` : '...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-full shrink-0" title={isConnected ? "실시간 연결됨" : "연결 끊김"}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-xs text-slate-500 font-medium">{isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                </div>
            </header>

            <main className="px-4 -mt-4 relative z-20 flex flex-col gap-5">
                {/* Vitals Graph (Hero) */}
                <div className="pt-2">
                    <TemperatureGraph data={vitals} checkInAt={checkInAt} />
                </div>

                {/* 현재 신청 식단 + 변경 (터치 영역 44px 이상) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center shrink-0">
                                <Utensils size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 font-medium">현재 신청된 식단</p>
                                <p className="font-bold text-slate-800 text-base truncate">
                                    {currentMealLabel ?? '신청 내역 없음'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMealModalOpen(true)}
                            className="shrink-0 min-h-[44px] min-w-[44px] px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl text-sm transition-colors active:scale-[0.98] touch-manipulation"
                        >
                            변경
                        </button>
                    </div>
                </div>

                {/* 서류 신청 - 터치 친화적 큰 버튼 */}
                <button
                    onClick={() => setIsDocModalOpen(true)}
                    className="min-h-[56px] w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-row items-center justify-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-all active:scale-[0.99] touch-manipulation group"
                >
                    <div className="w-11 h-11 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center shrink-0 group-active:bg-blue-500 group-active:text-white transition-colors">
                        <FileText size={22} />
                    </div>
                    <span className="font-bold text-slate-700">서류 신청</span>
                </button>

                {/* 앞으로의 검사 일정 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                            <CalendarCheck size={18} />
                        </span>
                        앞으로의 검사 일정
                    </h3>
                    <div className="space-y-2">
                        <ExamScheduleItem date="05.14 (수)" time="오전 9:00" name="혈액 검사" note="공복" />
                        <ExamScheduleItem date="05.15 (목)" time="오후 2:00" name="흉부 X-ray" note="" />
                        <ExamScheduleItem date="05.16 (금)" time="오전 10:30" name="소변 검사" note="" />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">* 일정은 변동될 수 있으며, 담당 코너에서 안내해 드립니다.</p>
                </div>

                {/* IV Status */}
                <IVStatusCard
                    photoUrl=""
                    infusionRate={60}
                    lastChecked="오후 2:00"
                />
                <p className="text-center text-xs text-slate-400 -mt-3 mb-1">
                    * 라인 확보 및 수액 속도 확인 완료
                </p>

                {/* 병원 공지사항 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-teal-500 rounded-full" />
                        병원 공지사항
                    </h3>
                    <div className="space-y-2">
                        <NoticeItem text="어린이날 맞이 1층 로비 선물 증정 안내" date="05.04" />
                        <NoticeItem text="병동 정기 소독 안내 (금일 오후 3시)" date="05.02" />
                    </div>
                </div>
            </main>

            <MealRequestModal
                isOpen={isMealModalOpen}
                onClose={() => setIsMealModalOpen(false)}
                admissionId={admissionId}
                onSuccess={() => { refetchDashboard(); setIsMealModalOpen(false); }}
            />

            <DocumentRequestModal
                isOpen={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                admissionId={admissionId}
            />
        </div >
    );
}

function NoticeItem({ text, date }: { text: string; date: string }) {
    return (
        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors min-h-[44px]">
            <p className="text-sm text-slate-700 font-medium line-clamp-2">{text}</p>
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">{date}</span>
        </div>
    );
}

function ExamScheduleItem({ date, time, name, note }: { date: string; time: string; name: string; note: string }) {
    return (
        <div className="flex gap-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100 min-h-[44px]">
            <div className="shrink-0 text-center min-w-[4rem]">
                <p className="text-xs font-bold text-violet-600">{date}</p>
                <p className="text-[10px] text-slate-500">{time}</p>
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 text-sm">{name}</p>
                {note ? <p className="text-xs text-slate-500 mt-0.5">{note}</p> : null}
            </div>
        </div>
    );
}
