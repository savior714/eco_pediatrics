'use client';

import React, { useState, useEffect } from 'react';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Card } from '@/components/Card';
import { Utensils, FileText, CalendarCheck, Bell, Smartphone, Monitor } from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DocumentRequestModal } from '@/components/DocumentRequestModal';

export default function Dashboard({ params }: { params: { token: string } }) {
    const { token } = params;
    const { vitals, isConnected, admissionId, patientName, checkInAt, roomNumber, meals, examSchedules, refetchDashboard } = useVitals(token);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    const STORAGE_KEY = 'dashboardViewMode';
    type ViewMode = 'mobile' | 'desktop';
    const [viewMode, setViewMode] = useState<ViewMode>('mobile');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const v = localStorage.getItem(STORAGE_KEY);
            setViewMode(v === 'desktop' ? 'desktop' : 'mobile');
        }
    }, []);
    const setViewModeAndStore = (mode: ViewMode) => {
        setViewMode(mode);
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    };

    const mealLabel: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };
    const currentMeal = meals.length > 0 ? meals[0] : null;
    const currentMealLabel = currentMeal ? (mealLabel[currentMeal.request_type] ?? currentMeal.request_type) : null;
    const isDesktop = viewMode === 'desktop';

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-100 w-full">
            <div
                className={`mx-auto min-h-[100dvh] min-h-screen ${isDesktop ? 'max-w-5xl' : 'max-w-md'}`}
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
            {/* Header */}
            <header
                className="bg-white text-slate-800 rounded-b-2xl shadow-sm border-b border-slate-200/80 relative z-10"
                style={{
                    marginLeft: 'max(1rem, env(safe-area-inset-left))',
                    marginRight: 'max(1rem, env(safe-area-inset-right))',
                    paddingTop: 'max(1rem, env(safe-area-inset-top))',
                    paddingBottom: '1rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                }}
            >
                <div className="flex justify-between items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-slate-900 truncate">
                            {patientName || 'Loading...'}
                            <span className="text-sm font-medium text-slate-500 ml-1">환자</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-medium mt-0.5" suppressHydrationWarning>
                            {roomNumber ? `${roomNumber}` : '...'} · {checkInAt ? `${Math.floor((new Date().getTime() - new Date(checkInAt).getTime()) / (1000 * 60 * 60 * 24)) + 1}일차` : '...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="보기 모드">
                            <button
                                type="button"
                                onClick={() => setViewModeAndStore('mobile')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${!isDesktop ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="모바일 보기"
                            >
                                <Smartphone size={14} />
                                모바일
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewModeAndStore('desktop')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isDesktop ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="PC 보기"
                            >
                                <Monitor size={14} />
                                PC
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-full" title={isConnected ? '실시간 연결됨' : '연결 끊김'}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span className="text-xs text-slate-600 font-medium">{isConnected ? 'Live' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main
                className={`relative z-20 px-4 pt-5 ${isDesktop ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}`}
                style={{
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                }}
            >
                {/* 체온 차트 - 모바일: 맨 위, PC: 왼쪽 */}
                <section className={isDesktop ? 'md:col-span-1' : ''}>
                    <TemperatureGraph data={vitals} checkInAt={checkInAt} />
                </section>

                <div className={isDesktop ? 'flex flex-col gap-6 md:col-span-1' : 'contents'}>
                {/* 현재 신청 식단 + 변경 */}
                <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                <Utensils size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 font-medium">현재 신청된 식단</p>
                                <p className="font-bold text-slate-800 text-base truncate mt-0.5">
                                    {currentMealLabel ?? '신청 내역 없음'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMealModalOpen(true)}
                            className="shrink-0 min-h-[44px] min-w-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors active:scale-[0.98] touch-manipulation"
                        >
                            변경
                        </button>
                    </div>
                </section>

                {/* 서류 신청 */}
                <section>
                    <button
                        onClick={() => setIsDocModalOpen(true)}
                        className="min-h-[56px] w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-row items-center justify-center gap-3 hover:bg-slate-50 active:bg-slate-100 transition-colors active:scale-[0.99] touch-manipulation group"
                    >
                        <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0 group-active:bg-sky-600 group-active:text-white transition-colors">
                            <FileText size={20} />
                        </div>
                        <span className="font-semibold text-slate-700">서류 신청</span>
                    </button>
                </section>

                {/* 앞으로의 검사 일정 */}
                <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2.5">
                        <span className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                            <CalendarCheck size={18} />
                        </span>
                        앞으로의 검사 일정
                    </h3>
                    <div className="space-y-2">
                        {examSchedules.length === 0 ? (
                            <p className="text-slate-400 text-sm py-2">등록된 검사 일정이 없습니다.</p>
                        ) : (
                            examSchedules.map((ex: { id: number; scheduled_at: string; name: string; note?: string }) => (
                                <ExamScheduleItem
                                    key={ex.id}
                                    date={formatExamDate(ex.scheduled_at)}
                                    time={formatExamTime(ex.scheduled_at)}
                                    name={ex.name}
                                    note={ex.note || ''}
                                />
                            ))
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">* 일정은 변동될 수 있으며, 담당 코너에서 안내해 드립니다.</p>
                </section>

                {/* 수액 안전 모니터링 */}
                <section>
                    <IVStatusCard photoUrl="" infusionRate={60} lastChecked="오후 2:00" />
                    <p className="text-center text-xs text-slate-400 mt-2">라인 확보 및 수액 속도 확인 완료</p>
                </section>

                {/* 병원 공지사항 */}
                <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2.5">
                        <span className="w-9 h-9 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                            <Bell size={18} />
                        </span>
                        병원 공지사항
                    </h3>
                    <div className="space-y-2">
                        <NoticeItem text="어린이날 맞이 1층 로비 선물 증정 안내" date="05.04" />
                        <NoticeItem text="병동 정기 소독 안내 (금일 오후 3시)" date="05.02" />
                    </div>
                </section>
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
            </div>
        </div>
    );
}

function formatExamDate(iso: string): string {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${m.toString().padStart(2, '0')}.${day.toString().padStart(2, '0')} (${week})`;
}
function formatExamTime(iso: string): string {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h < 12) return `오전 ${h === 0 ? 12 : h}${m ? `:${m.toString().padStart(2, '0')}` : ':00'}`;
    return `오후 ${h === 12 ? 12 : h - 12}${m ? `:${m.toString().padStart(2, '0')}` : ':00'}`;
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
