import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Check, Clock, AlertCircle, CalendarCheck, Plus, Thermometer, Droplets, Calendar, Bell, Edit2, Trash2, FileText, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { IVUploadForm } from './IVUploadForm';
import { TemperatureGraph } from './TemperatureGraph';
import { getNextThreeMealSlots } from '@/utils/dateUtils';
import { Bed, Notification, ExamScheduleItem, VitalData, LastUploadedIv } from '@/types/domain';
import { MEAL_MAP, DOC_MAP, EXAM_TYPE_OPTIONS } from '@/constants/mappings';
import { api } from '@/lib/api';
import { TransferModal } from './TransferModal';
import { useVitals } from '@/hooks/useVitals';

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    notifications: Notification[];
    onCompleteRequest: (id: string) => void;
    lastUploadedIv?: LastUploadedIv | null;
    onIVUploadSuccess?: (rate?: number) => void;
    lastUpdated?: number;
    vitals?: VitalData[];
    checkInAt?: string | null;
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

export function PatientDetailModal({ isOpen, onClose, bed, notifications, onCompleteRequest, onIVUploadSuccess, vitals: propVitals, checkInAt: propCheckInAt, lastUploadedIv, lastUpdated }: PatientDetailModalProps) {
    const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>([]);
    const [examFormOpen, setExamFormOpen] = useState(false);
    const [examForm, setExamForm] = useState<{ date: string; timeOfDay: 'am' | 'pm'; name: string }>({ date: '', timeOfDay: 'am', name: '' });
    const [examSubmitting, setExamSubmitting] = useState(false);
    const [examAddError, setExamAddError] = useState<string | null>(null);
    const [deletingExamId, setDeletingExamId] = useState<number | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const handleTransfer = async (targetRoom: string) => {
        if (!bed?.id) return;
        await api.post(`/api/v1/admissions/${bed.id}/transfer`, { target_room: targetRoom });
        alert('전실 완료');
        setTransferModalOpen(false);
        onClose();
        window.location.reload();
    };

    // Derived state (safe access)
    const roomNotifications = useMemo(() => {
        if (!bed) return [];
        return notifications.filter(n => String(n.room) === String(bed.room));
    }, [notifications, bed]);

    useEffect(() => {
        if (!isOpen || !bed?.id) return;
        api.get<ExamScheduleItem[]>(`/api/v1/admissions/${bed.id}/exam-schedules`)
            .then(data => setExamSchedules(Array.isArray(data) ? data : []))
            .catch(() => setExamSchedules([]));
    }, [isOpen, bed?.id]);

    const refetchExams = () => {
        if (!bed?.id) return;
        api.get<ExamScheduleItem[]>(`/api/v1/admissions/${bed.id}/exam-schedules`)
            .then(data => setExamSchedules(Array.isArray(data) ? data : []))
            .catch(() => { });
    };

    const handleAddExam = async () => {
        if (!bed?.id || !examForm.date || !examForm.name) return;
        setExamSubmitting(true);
        setExamAddError(null);
        try {
            const [y, m, d] = examForm.date.split('-').map(Number);
            const hour = examForm.timeOfDay === 'am' ? 9 : 14;
            const scheduledAt = new Date(y, m - 1, d, hour, 0).toISOString();
            await api.post('/api/v1/exam-schedules', {
                admission_id: bed.id,
                scheduled_at: scheduledAt,
                name: examForm.name.trim(),
                note: ''
            });

            setExamForm({ date: '', timeOfDay: 'am', name: '' });
            setExamFormOpen(false);
            setExamAddError(null);
            refetchExams();
        } catch (e) {
            setExamAddError('서버에 연결할 수 없습니다. 백엔드(localhost:8000)가 실행 중인지, exam_schedules 테이블이 생성되었는지 확인해 주세요.');
        } finally {
            setExamSubmitting(false);
        }
    };

    const handleDeleteExam = async (scheduleId: number) => {
        if (!window.confirm('이 검사 일정을 삭제할까요?')) return;
        setDeletingExamId(scheduleId);
        try {
            await api.delete(`/api/v1/exam-schedules/${scheduleId}`);
            refetchExams();
        } finally {
            setDeletingExamId(null);
        }
    };

    const {
        vitals: fetchedVitals,
        checkInAt: fetchedCheckIn,
        meals: fetchedMeals,
        documentRequests: fetchedDocRequests,
        isRefreshing,
        fetchDashboardData
    } = useVitals(bed?.token, isOpen);

    // Auto-refresh when a new notification arrives for this room OR when lastUpdated changes (new vital/iv)
    useEffect(() => {
        if (isOpen) {
            fetchDashboardData();
        }
    }, [isOpen, roomNotifications.length, lastUpdated, fetchDashboardData]);

    const currentMealLabelModal = fetchedMeals.length > 0 ? (MEAL_MAP[fetchedMeals[0].request_type] ?? fetchedMeals[0].request_type) : null;
    const latestDocRequest = fetchedDocRequests.length > 0 ? fetchedDocRequests[0] : null;
    const currentDocLabelsModal = latestDocRequest?.request_items?.map((id: string) => DOC_MAP[id] || id) ?? [];

    // Chart data: Prioritize props > fetched > empty (no mock data)
    const { chartVitals, chartCheckIn } = useMemo(() => {
        if (!bed) return { chartVitals: [], chartCheckIn: null };

        // 1. Props from dashboard (if reused there)
        if (propVitals && propVitals.length > 0) {
            return { chartVitals: propVitals, chartCheckIn: propCheckInAt ?? null };
        }

        // 2. Fetched real data
        if (fetchedVitals.length > 0) {
            return { chartVitals: fetchedVitals, chartCheckIn: fetchedCheckIn };
        }

        // 3. No data - return empty to avoid misleading sine wave
        return { chartVitals: [], chartCheckIn: fetchedCheckIn || propCheckInAt || null };
    }, [bed, propVitals, propCheckInAt, fetchedVitals, fetchedCheckIn]);

    if (!isOpen || !bed) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className={`bg-white rounded-[2rem] w-[75%] max-w-none max-h-[85vh] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {/* Header */}
                <div className={`p-4 shrink-0 ${bed.status === 'fever' ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-100`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-slate-800">{bed.room}호</h2>
                                {bed.status === 'fever' && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                                        고열 주의
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 font-medium">{bed.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTransferModalOpen(true)}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 self-start"
                            >
                                전실
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 -mt-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Vitals Summary + Meal Status + IV Check Top */}
                    <div className="flex gap-3 mt-3">
                        <div className="flex-[7] flex gap-0 overflow-x-auto scrollbar-hide">
                            {/* 1. Vitals */}
                            <div className="bg-white px-3 rounded-xl border-[1.5px] border-slate-600 shadow-sm inline-flex flex-col justify-center min-w-[100px] shrink-0 z-10">
                                <span className="text-[10px] text-slate-400 block mb-0 font-bold uppercase tracking-tight">현재 체온</span>
                                <span className={`text-base font-bold ${bed.status === 'fever' ? 'text-red-500' : 'text-slate-700'}`}>
                                    {bed.temp.toFixed(1)}°C
                                </span>
                            </div>
                            <div className="bg-white px-3 rounded-xl border-[1.5px] border-slate-600 shadow-sm inline-flex flex-col justify-center min-w-[100px] shrink-0 -ml-[1.5px] z-0">
                                <span className="text-[10px] text-slate-400 block mb-0 font-bold uppercase tracking-tight">수액 속도</span>
                                <span className="text-base font-bold text-slate-700">{bed.drops} <span className="text-xs font-normal text-slate-400">cc/hr</span></span>
                            </div>

                            {/* Divider line (optional, or just gap) */}
                            <div className="w-px bg-slate-200 mx-1 shrink-0 my-2" />

                            {/* 2. Meals - 다음 3끼 (오늘 점심, 오늘 저녁, 내일 아침 등) */}
                            {getNextThreeMealSlots().map(({ label }) => (
                                <div key={label} className="bg-white px-3 rounded-xl border-[1.5px] border-slate-600 shadow-sm w-[110px] shrink-0 text-center font-bold flex flex-col justify-center relative group/meal -ml-[1.5px]">
                                    <button
                                        className="absolute top-1 right-1 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-50 transition-colors opacity-100"
                                        title={`${label} 식사 수정`}
                                    >
                                        <Edit2 size={10} />
                                    </button>
                                    <span className="text-[9px] text-slate-400 block mb-0 uppercase">{label}</span>
                                    <span className="text-xs text-slate-600 line-clamp-1">
                                        {currentMealLabelModal ?? '신청전'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="w-px bg-slate-200 mx-1 shrink-0 my-2" />

                        {/* IV Upload Form moved to TOP - More compact design (3 Ratio) */}
                        <div className="flex-[3] bg-white p-3 rounded-[1.5rem] border-[1.5px] border-slate-600 shadow-sm relative group/iv">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex items-center gap-1.5">
                                    <Droplets size={12} className="text-sky-500" />
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        IV 수액 속도 (cc/hr)
                                    </h3>
                                </div>
                            </div>
                            <IVUploadForm
                                admissionId={bed.id}
                                patientName={bed.name}
                                token={bed.token}
                                onUploadSuccess={(rate) => onIVUploadSuccess?.(rate)}
                                lastUploadedIv={lastUploadedIv}
                            />
                        </div>
                    </div>
                </div>

                {/* Body: Bottom Columns */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 1st Column: Chart (Main Bottom Left) */}
                        <div className="lg:col-span-7 space-y-6">
                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Thermometer size={16} className="text-rose-500" />
                                    체온 기록 (24h)
                                </h3>
                                <TemperatureGraph
                                    data={chartVitals}
                                    checkInAt={chartCheckIn}
                                    className="h-auto min-h-[340px] border-[1.5px] border-slate-600 shadow-sm"
                                />
                            </section>
                        </div>

                        {/* 2nd Column: Exam & Requests Stacked (Main Bottom Right) */}
                        <div className="lg:col-span-5 space-y-6 flex flex-col">
                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar size={16} className="text-primary" />
                                        오늘의 검사 일정
                                    </h3>
                                    <button
                                        onClick={() => setExamFormOpen(true)}
                                        className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold hover:bg-primary/20 transition"
                                    >
                                        일정 등록
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                                    {examSchedules.map(ex => (
                                        <div key={ex.id} className="p-3 bg-white rounded-xl border-[1.5px] border-slate-600 shadow-sm text-xs flex justify-between items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between mb-0.5">
                                                    <span className="font-bold text-slate-700">{ex.name}</span>
                                                    <span className="text-slate-400 shrink-0">{formatExamTime(ex.scheduled_at)}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteExam(ex.id)}
                                                disabled={deletingExamId === ex.id}
                                                className="shrink-0 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                                                title="삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {examSchedules.length === 0 && <p className="text-xs text-slate-400 text-center py-4">등록된 일정이 없습니다.</p>}
                                </div>

                                {examFormOpen && (
                                    <div className="mt-4 p-4 bg-white rounded-xl border-[1.5px] border-slate-600 space-y-3 shadow-lg">
                                        {examAddError && <p className="text-[10px] text-red-500">{examAddError}</p>}
                                        <input type="date" value={examForm.date} onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))} className="w-full text-xs p-2 border rounded" />
                                        <div className="flex gap-2">
                                            <button onClick={() => setExamForm(f => ({ ...f, timeOfDay: 'am' }))} className={`flex-1 py-1 text-xs rounded border ${examForm.timeOfDay === 'am' ? 'border-violet-500 bg-violet-50' : ''}`}>오전</button>
                                            <button onClick={() => setExamForm(f => ({ ...f, timeOfDay: 'pm' }))} className={`flex-1 py-1 text-xs rounded border ${examForm.timeOfDay === 'pm' ? 'border-violet-500 bg-violet-50' : ''}`}>오후</button>
                                        </div>
                                        <select value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} className="w-full text-xs p-2 border rounded">
                                            <option value="">검사 선택</option>
                                            {EXAM_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="flex gap-2">
                                            <button onClick={() => setExamFormOpen(false)} className="flex-1 py-2 text-xs border rounded">취소</button>
                                            <button onClick={handleAddExam} disabled={examSubmitting} className="flex-1 py-2 text-xs bg-violet-500 text-white rounded font-bold">추가</button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex-1">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-sky-500" />
                                    신청된 서류
                                </h3>
                                <div className="bg-white rounded-xl border-[1.5px] border-slate-600 p-4 shadow-sm">
                                    {currentDocLabelsModal.length > 0 ? (
                                        <ul className="space-y-1 text-xs text-slate-600">
                                            {currentDocLabelsModal.map((label: string) => (
                                                <li key={label} className="flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                                                    {label}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-400">신청된 서류 없음</p>
                                    )}
                                </div>
                            </section>

                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex-1">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Bell size={16} className="text-amber-500" />
                                    요청 사항 ({roomNotifications.length})
                                </h3>
                                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                                    {roomNotifications.map(note => (
                                        <div key={note.id} className="p-3 bg-white rounded-xl border-[1.5px] border-slate-600 shadow-sm flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{note.time}</span>
                                                <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{note.content}</p>
                                            </div>
                                            <button
                                                onClick={() => onCompleteRequest(note.id)}
                                                className="shrink-0 px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                                            >
                                                완료
                                            </button>
                                        </div>
                                    ))}
                                    {roomNotifications.length === 0 && <p className="text-xs text-slate-400 text-center py-4">대기 중인 요청이 없습니다.</p>}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition">
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
