import React, { useMemo, useState, useEffect } from 'react';
import { X, Check, Clock, AlertCircle, CalendarCheck, Plus } from 'lucide-react';
import { Card } from './Card';
import { IVUploadForm } from './IVUploadForm';
import { TemperatureGraph } from './TemperatureGraph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const EXAM_TYPE_OPTIONS = [
    '흉부 X-Ray',
    '복부 X-Ray',
    '초음파',
    '소변검사',
    '대변검사',
    '혈액검사',
    'PCR 검사',
    '신속항원 검사',
] as const;

interface ExamScheduleItem {
    id: number;
    admission_id: string;
    scheduled_at: string;
    name: string;
    note?: string;
}

interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    medication_type?: string;
    recorded_at: string;
}

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: any;
    notifications: any[];
    onCompleteRequest: (id: string) => void;
    onIVUploadSuccess?: (rate?: number) => void;
    vitals?: VitalData[];
    checkInAt?: string | null;
    lastUploadedIv?: { admissionId: string; url: string } | null;
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

export function PatientDetailModal({ isOpen, onClose, bed, notifications, onCompleteRequest, onIVUploadSuccess, vitals: propVitals, checkInAt: propCheckInAt, lastUploadedIv }: PatientDetailModalProps) {
    const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>([]);
    const [examFormOpen, setExamFormOpen] = useState(false);
    const [examForm, setExamForm] = useState<{ date: string; timeOfDay: 'am' | 'pm'; name: string }>({ date: '', timeOfDay: 'am', name: '' });
    const [examSubmitting, setExamSubmitting] = useState(false);
    const [examAddError, setExamAddError] = useState<string | null>(null);

    // Derived state (safe access)
    const roomNotifications = useMemo(() => {
        if (!bed) return [];
        return notifications.filter(n => n.room === bed.room);
    }, [notifications, bed]);

    useEffect(() => {
        if (!isOpen || !bed?.id) return;
        fetch(`${API_BASE}/api/v1/admissions/${bed.id}/exam-schedules`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setExamSchedules(Array.isArray(data) ? data : []))
            .catch(() => setExamSchedules([]));
    }, [isOpen, bed?.id]);

    const refetchExams = () => {
        if (!bed?.id) return;
        fetch(`${API_BASE}/api/v1/admissions/${bed.id}/exam-schedules`)
            .then(res => res.ok ? res.json() : [])
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
            const res = await fetch(`${API_BASE}/api/v1/exam-schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_id: bed.id,
                    scheduled_at: scheduledAt,
                    name: examForm.name.trim(),
                    note: ''
                })
            });
            if (res.ok) {
                setExamForm({ date: '', timeOfDay: 'am', name: '' });
                setExamFormOpen(false);
                setExamAddError(null);
                refetchExams();
            } else {
                const text = await res.text();
                setExamAddError(text || `서버 오류 (${res.status})`);
            }
        } catch (e) {
            setExamAddError('서버에 연결할 수 없습니다. 백엔드(localhost:8000)가 실행 중인지, exam_schedules 테이블이 생성되었는지 확인해 주세요.');
        } finally {
            setExamSubmitting(false);
        }
    };

    const [fetchedVitals, setFetchedVitals] = useState<VitalData[]>([]);
    const [fetchedCheckIn, setFetchedCheckIn] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && bed?.token) {
            fetch(`${API_BASE}/api/v1/dashboard/${bed.token}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        setFetchedVitals(data.vitals || []);
                        setFetchedCheckIn(data.admission?.check_in_at || null);
                    }
                })
                .catch(err => console.error(err));
        } else {
            setFetchedVitals([]);
            setFetchedCheckIn(null);
        }
    }, [isOpen, bed?.token]);

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

            {/* Modal: 가로 2배 확대 (max-w-4xl ≈ 56rem) */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 -mt-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Quick Vitals Summary */}
                    <div className="flex gap-4 mt-4">
                        <div className="bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm flex-1">
                            <span className="text-xs text-slate-400 block mb-0.5">현재 체온</span>
                            <span className={`text-lg font-bold ${bed.status === 'fever' ? 'text-red-500' : 'text-slate-700'}`}>
                                {bed.temp.toFixed(1)}°C
                            </span>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm flex-1">
                            <span className="text-xs text-slate-400 block mb-0.5">수액 속도</span>
                            <span className="text-lg font-bold text-slate-700">{bed.drops} <span className="text-sm font-normal text-slate-400">cc/hr</span></span>
                        </div>
                    </div>
                </div>

                {/* Body: 좌 = 체온 차트, 우 = IV + 요청 */}
                <div className="p-4 flex gap-4 overflow-y-auto">
                    <div className="flex-1 min-w-0">
                        <TemperatureGraph data={chartVitals} checkInAt={chartCheckIn} />
                    </div>
                    <div className="w-80 shrink-0 flex flex-col gap-6">
                        <IVUploadForm
                            admissionId={bed.id}
                            patientName={bed.name}
                            token={bed.token}
                            onUploadSuccess={(rate) => onIVUploadSuccess?.(rate)}
                            lastUploadedIv={lastUploadedIv}
                        />
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                요청 사항 <span className="bg-slate-100 text-slate-600 px-1.5 rounded-md text-xs">{roomNotifications.length}</span>
                            </h3>
                            <div className="space-y-3 max-h-[150px] overflow-y-auto">
                                {roomNotifications.length === 0 ? (
                                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-sm">현재 처리할 요청이 없습니다.</p>
                                    </div>
                                ) : (
                                    roomNotifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 rounded-2xl border flex flex-col gap-3 ${notif.type === 'meal'
                                                ? 'bg-orange-50 border-orange-100'
                                                : 'bg-blue-50 border-blue-100'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                    <div className={`mt-0.5 p-1.5 rounded-lg ${notif.type === 'meal' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'
                                                        }`}>
                                                        <AlertCircle size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{notif.content}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <Clock size={10} /> {notif.time}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onCompleteRequest(notif.id)}
                                                className="w-full py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check size={16} className="text-green-500" />
                                                완료 처리하기
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 예정된 검사 */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CalendarCheck size={14} /> 예정된 검사
                            </h3>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {!bed.id ? (
                                    <p className="text-slate-400 text-sm py-2">이 병상은 입원 정보가 연동되지 않아 검사 일정을 등록할 수 없습니다.</p>
                                ) : examSchedules.length === 0 && !examFormOpen ? (
                                    <p className="text-slate-400 text-sm py-2">등록된 검사 일정이 없습니다.</p>
                                ) : (
                                    examSchedules.map(ex => (
                                        <div key={ex.id} className="group flex gap-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100 hover:bg-violet-100/80 transition-colors relative">
                                            <div className="shrink-0 text-center min-w-[4rem]">
                                                <p className="text-xs font-bold text-violet-600">{formatExamDate(ex.scheduled_at)}</p>
                                                <p className="text-[10px] text-slate-500">{formatExamTime(ex.scheduled_at)}</p>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-slate-800 text-sm">{ex.name}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('이 검사 일정을 삭제하시겠습니까?')) {
                                                        const originalExams = [...examSchedules];
                                                        setExamSchedules(prev => prev.filter(item => item.id !== ex.id)); // Optimistic update

                                                        fetch(`${API_BASE}/api/v1/exam-schedules/${ex.id}`, { method: 'DELETE' })
                                                            .then(async res => {
                                                                if (!res.ok) {
                                                                    const text = await res.text();
                                                                    throw new Error(`${res.status} ${res.statusText}: ${text}`);
                                                                }
                                                                // Success
                                                            })
                                                            .catch((err) => {
                                                                alert(`삭제 실패: ${err.message}`);
                                                                setExamSchedules(originalExams); // Rollback
                                                            });
                                                    }
                                                }}
                                                className="absolute top-2 right-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="삭제"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                                {examFormOpen ? (
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                        {examAddError && (
                                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                                {examAddError}
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">날짜</label>
                                            <input
                                                type="date"
                                                value={examForm.date}
                                                onChange={e => setExamForm(f => ({ ...f, date: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">시간대</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setExamForm(f => ({ ...f, timeOfDay: 'am' }))}
                                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${examForm.timeOfDay === 'am' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                                                >
                                                    오전
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setExamForm(f => ({ ...f, timeOfDay: 'pm' }))}
                                                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${examForm.timeOfDay === 'pm' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                                                >
                                                    오후
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">검사 항목</label>
                                            <select
                                                value={examForm.name}
                                                onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                                            >
                                                <option value="">선택하세요</option>
                                                {EXAM_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setExamFormOpen(false); setExamForm({ date: '', timeOfDay: 'am', name: '' }); setExamAddError(null); }}
                                                className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"
                                            >
                                                취소
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!examForm.date || !examForm.name || examSubmitting}
                                                onClick={handleAddExam}
                                                className="flex-1 py-2 rounded-lg bg-violet-500 text-white text-sm font-bold disabled:opacity-50"
                                            >
                                                {examSubmitting ? '등록 중...' : '추가'}
                                            </button>
                                        </div>
                                    </div>
                                ) : bed.id ? (
                                    <button
                                        type="button"
                                        onClick={() => { setExamFormOpen(true); setExamAddError(null); }}
                                        className="w-full py-2 rounded-xl border border-dashed border-violet-200 text-violet-600 text-sm font-medium flex items-center justify-center gap-1 hover:bg-violet-50"
                                    >
                                        <Plus size={14} /> 검사 일정 추가
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 shrink-0 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        닫기
                    </button>
                    {/* Future: Add 'View Full Chart' button here */}
                </div>
            </div>
        </div>
    );
}
