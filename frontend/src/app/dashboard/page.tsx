'use client';

import React, { Suspense } from 'react';
import Image from 'next/image';
import { TemperatureGraph } from '@/components/TemperatureGraph';
import { IVStatusCard } from '@/components/IVStatusCard';
import { Utensils, FileText, CalendarCheck, Bell, Smartphone, Monitor, AlertCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { MealRequestModal } from '@/components/MealRequestModal';
import { DocumentRequestModal } from '@/components/DocumentRequestModal';
import { getNextThreeMealSlots, formatPatientDemographics } from '@/utils/dateUtils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { NoticeItem } from '@/components/dashboard/NoticeItem';
import { ExamScheduleItem } from '@/components/dashboard/ExamScheduleItem';

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

function DashboardContent() {
    const {
        token, vitalsData, latestIv, currentMealLabel, currentDocLabels,
        viewMode, modalState, actions
    } = useDashboardStats();

    const isDesktop = viewMode === 'desktop';

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
                <AlertCircle size={40} className="text-red-600 mb-4" />
                <h1 className="text-xl font-bold text-red-800">잘못된 접근입니다.</h1>
                <p className="text-red-600">유효한 토큰이 포함된 관리 페이지 주소로 접속해 주세요.</p>
            </div>
        );
    }

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
                                    {vitalsData.patientName || 'Loading...'}
                                </h1>
                                <p className="text-slate-500 text-sm md:text-base font-bold flex items-center gap-2 whitespace-nowrap" suppressHydrationWarning>
                                    <span className="text-slate-400">{vitalsData.roomNumber ? `${vitalsData.roomNumber}호` : '...'}</span>
                                    {vitalsData.dob && (
                                        <>
                                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-slate-200 rounded-full shrink-0" />
                                            <span className={`font-extrabold ${vitalsData.gender === 'M' ? 'text-blue-500' : vitalsData.gender === 'F' ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {formatPatientDemographics(vitalsData.dob, vitalsData.gender)}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href="https://ddocdoc.com/hospital/5ed4ab03c9cecac803996054"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative h-14 w-60 active:scale-95 transition-transform"
                            >
                                <Image
                                    src="/eco_logo.png"
                                    alt="Eco Pediatrics"
                                    fill
                                    className="object-contain object-right"
                                />
                            </a>
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
                    <div className="flex flex-col gap-6">
                        <TemperatureGraph
                            key={`chart-${vitalsData.vitals.length}`}
                            data={vitalsData.vitals}
                            checkInAt={vitalsData.checkInAt}
                            className="flex-1"
                        />

                        <IVStatusCard
                            photoUrl={latestIv?.photo_url ? (latestIv.photo_url.startsWith('/') ? `${API_BASE}${latestIv.photo_url}` : latestIv.photo_url) : ""}
                            infusionRate={latestIv?.infusion_rate || 0}
                            lastChecked={latestIv ? new Date(latestIv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                            className="bg-white"
                        />
                    </div>

                    <div className="flex flex-col gap-6">
                        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                                    <span className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Utensils size={18} />
                                    </span>
                                    오늘의 식단
                                </h3>
                                <button
                                    onClick={() => actions.setIsMealModalOpen(true)}
                                    className="shrink-0 h-9 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors active:scale-[0.98] touch-manipulation"
                                >
                                    식단 변경
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {getNextThreeMealSlots().map((slot) => {
                                    const meal = vitalsData.meals.find(m => m.meal_date === slot.date && m.meal_time === slot.meal_time);
                                    const pLabel = meal?.pediatric_meal_type || (meal ? '일반식' : '환아식 미신청');
                                    const gLabel = meal?.guardian_meal_type || (meal ? '신청 안함' : '보호자식 미신청');

                                    return (
                                        <div key={slot.label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-center min-h-[4.5rem]">
                                            <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">{slot.label}</span>
                                            <div className="text-[11px] font-bold text-slate-700 leading-tight space-y-0.5">
                                                <div className="truncate" title={pLabel}>{pLabel}</div>
                                                <div className="font-bold truncate" title={gLabel}>{gLabel}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2.5">
                                <span className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                                    <CalendarCheck size={18} />
                                </span>
                                예정된 검사 일정
                            </h3>
                            <div className="space-y-2">
                                {vitalsData.examSchedules.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-2">등록된 검사 일정이 없습니다.</p>
                                ) : (
                                    vitalsData.examSchedules.map((ex, index) => (
                                        <ExamScheduleItem
                                            key={`${ex.id}-${index}`}
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

                        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
                                    <span className="w-9 h-9 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                                        <FileText size={18} />
                                    </span>
                                    퇴원 전 서류 신청
                                </h3>
                                <button
                                    onClick={() => actions.setIsDocModalOpen(true)}
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
                    isOpen={modalState.isMealModalOpen}
                    onClose={() => actions.setIsMealModalOpen(false)}
                    admissionId={vitalsData.admissionId}
                    currentMeals={vitalsData.meals}
                    onSuccess={() => { actions.refetch(); actions.setIsMealModalOpen(false); }}
                />

                <DocumentRequestModal
                    isOpen={modalState.isDocModalOpen}
                    onClose={() => actions.setIsDocModalOpen(false)}
                    admissionId={vitalsData.admissionId}
                    token={token}
                    onSuccess={() => { actions.refetch(); }}
                />

                <footer className="py-6 flex justify-center pb-8 mt-4">
                    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="보기 모드">
                        <button
                            type="button"
                            onClick={() => actions.setViewModeAndStore('mobile')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${!isDesktop ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <Smartphone size={16} />
                            모바일
                        </button>
                        <button
                            type="button"
                            onClick={() => actions.setViewModeAndStore('desktop')}
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

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
