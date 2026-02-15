'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Card } from '@/components/Card';
import { Utensils, FileText, CalendarCheck, Bell, Smartphone, Monitor } from 'lucide-react';
import { useVitals } from '@/hooks/useVitals';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DocumentRequestModal } from '@/components/DocumentRequestModal';
import { calculateHospitalDay, getNextThreeMealSlots, formatPatientDemographics } from '@/utils/dateUtils';

export default function Dashboard({ params }: { params: { token: string } }) {
    const { token } = params;
    const { vitals, isConnected, admissionId, patientName, checkInAt, roomNumber, dob, gender, meals, examSchedules, ivRecords, documentRequests, refetchDashboard } = useVitals(token);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    const latestIv = ivRecords.length > 0 ? ivRecords[0] : null;

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
        try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { }
    };

    const mealLabel: Record<string, string> = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };
    const currentMeal = meals.length > 0 ? meals[0] : null;
    const currentMealLabel = currentMeal
        ? (currentMeal.request_type === 'STATION_UPDATE'
            ? (currentMeal.pediatric_meal_type || '일반식')
            : (mealLabel[currentMeal.request_type] ?? currentMeal.request_type))
        : null;
    const docLabel: Record<string, string> = { RECEIPT: '진료비 계산서(영수증)', DETAIL: '진료비 세부내역서', CERT: '입퇴원확인서', DIAGNOSIS: '진단서', INITIAL: '초진기록지' };
    const latestDocRequest = documentRequests.length > 0 ? documentRequests[0] : null;
    const currentDocLabels = latestDocRequest?.request_items?.map((id: string) => docLabel[id] || id) ?? [];
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
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom), 1rem)',
                        paddingLeft: '1.25rem',
                        paddingRight: '1rem',
                    }}
                >
                    <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-2 md:gap-3">
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight shrink-0">
                                    {patientName || 'Loading...'}
                                </h1>
                                <p className="text-slate-500 text-sm md:text-base font-bold flex items-center gap-2 whitespace-nowrap" suppressHydrationWarning>
                                    <span className="text-slate-400">{roomNumber ? `${roomNumber}호` : '...'}</span>
                                    {dob && (
                                        <>
                                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-slate-200 rounded-full shrink-0" />
                                            <span className={`font-extrabold ${gender === 'M' ? 'text-blue-500' : gender === 'F' ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {formatPatientDemographics(dob, gender)}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative h-14 w-60">
                                <Image
                                    src="/eco_logo.png"
                                    alt="Eco Pediatrics"
                                    fill
                                    className="object-contain object-right"
                                />
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
                    {/* Left Column (Desktop) */}
                    <div className="flex flex-col gap-6">
                        {/* 체온 차트 - 모바일: 맨 위, PC: 왼쪽 */}
                        <section>
                            <TemperatureGraph data={vitals} checkInAt={checkInAt} />
                        </section>

                        {/* 수액 안전 모니터링 */}
                        <section>
                            <IVStatusCard
                                photoUrl={latestIv?.photo_url || ""}
                                infusionRate={latestIv?.infusion_rate || 0}
                                lastChecked={latestIv ? new Date(latestIv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                            />
                        </section>
                    </div>

                    {/* Right Column (Desktop) */}
                    <div className="flex flex-col gap-6">

                        {/* 아침, 점심, 저녁 식단 쪼개기 */}
                        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                                    <span className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Utensils size={18} />
                                    </span>
                                    오늘의 식단
                                </h3>
                                <button
                                    onClick={() => setIsMealModalOpen(true)}
                                    className="shrink-0 h-9 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors active:scale-[0.98] touch-manipulation"
                                >
                                    식단 변경
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {getNextThreeMealSlots().map((slot) => {
                                    const meal = meals.find(m => m.meal_date === slot.date && m.meal_time === slot.meal_time);
                                    const labelText = meal
                                        ? (meal.pediatric_meal_type || '일반식')
                                        : '신청전';

                                    return (
                                        <div key={slot.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                            <span className="text-[10px] text-slate-400 block mb-1 font-bold">{slot.label}</span>
                                            <span className="text-xs font-bold text-slate-600 truncate block">
                                                {labelText}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
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
                            <p className="text-xs text-slate-400 mt-3">* 일정은 약간의 변동이 있을 수 있으며, 궁금점은 스테이션에 문의 바랍니다.</p>
                        </section>


                        {/* 서류 신청 */}
                        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                                    <span className="w-9 h-9 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </span>
                                    퇴원 전 서류 신청
                                </h3>
                                <button
                                    onClick={() => setIsDocModalOpen(true)}
                                    className="h-9 px-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl text-sm transition-colors active:scale-[0.98] touch-manipulation"
                                >
                                    추가 신청
                                </button>
                            </div>
                            {currentDocLabels.length > 0 ? (
                                <ul className="space-y-1.5 mb-3">
                                    {currentDocLabels.map((label: string) => (
                                        <li key={label} className="flex items-center gap-2 text-sm text-slate-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                            {label}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-400 mb-3">신청된 서류가 없습니다.</p>
                            )}
                            <p className="text-xs text-slate-400">미리 신청하시면 퇴원 수속이 빨라집니다.</p>
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
                    token={token}
                    onSuccess={() => { refetchDashboard(); }}
                />

                {/* Footer View Mode Toggle */}
                <footer className="py-6 flex justify-center pb-8 mt-4">
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="보기 모드">
                        <button
                            type="button"
                            onClick={() => setViewModeAndStore('mobile')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${!isDesktop ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <Smartphone size={16} />
                            모바일
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewModeAndStore('desktop')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDesktop ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <Monitor size={16} />
                            PC
                        </button>
                    </div>
                </footer>
            </div >
        </div >
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
