import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Check, Clock, AlertCircle, CalendarCheck, Plus, Thermometer, Droplets, Calendar, Bell, Edit2, Trash2, FileText, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { IVUploadForm } from './IVUploadForm';
import { TemperatureGraph } from './TemperatureGraph';
import { getNextThreeMealSlots, formatPatientDemographics } from '@/utils/dateUtils';
import { Bed, Notification, ExamScheduleItem, VitalData, LastUploadedIv } from '@/types/domain';
import { MEAL_MAP, DOC_MAP, EXAM_TYPE_OPTIONS } from '@/constants/mappings';
import { api } from '@/lib/api';
import { TransferModal } from './TransferModal';
import { VitalModal } from './VitalModal';
import { EditMealModal } from './EditMealModal';
import { AddExamModal } from './AddExamModal';
import { useVitals } from '@/hooks/useVitals';

interface PatientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    notifications: Notification[];
    onCompleteRequest: (id: string) => void;
    lastUploadedIv?: LastUploadedIv | null;
    onIVUploadSuccess?: (rate?: number) => void;
    onVitalUpdate?: (temp: number) => void;
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

export function PatientDetailModal({ isOpen, onClose, bed, notifications, onCompleteRequest, onIVUploadSuccess, onVitalUpdate, vitals: propVitals, checkInAt: propCheckInAt, lastUploadedIv, lastUpdated }: PatientDetailModalProps) {
    const [addExamModalOpen, setAddExamModalOpen] = useState(false);
    const [deletingExamId, setDeletingExamId] = useState<number | null>(null);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [vitalModalOpen, setVitalModalOpen] = useState(false);
    const [editMealConfig, setEditMealConfig] = useState<{ label: string; date: string; meal_time: string; pediatric: string; guardian: string } | null>(null);

    const handleDischarge = async () => {
        if (!bed?.id) return;
        if (!window.confirm(`${bed.name} 환자를 퇴원 처리할까요?`)) return;
        try {
            await api.post(`/api/v1/admissions/${bed.id}/discharge`, {});
            alert('퇴원 완료');
            onClose();
            window.location.reload();
        } catch (e) {
            alert('퇴원 실패');
        }
    };

    const handleSeedData = async () => {
        if (!bed?.id) return;
        if (!window.confirm(`[Dev] ${bed.name} 환자에게 가상 데이터를 생성할까요?`)) return;
        try {
            await api.post(`/api/v1/dev/seed-patient/${bed.id}`, {});
            await fetchDashboardData();
            onVitalUpdate?.(36.5);
            onIVUploadSuccess?.(40);
            alert('데이터 생성 및 동기화 완료');
        } catch (e) {
            alert('데이터 생성 실패');
        }
    };

    const handleTransfer = async (targetRoom: string) => {
        if (!bed?.id) return;
        try {
            await api.post(`/api/v1/admissions/${bed.id}/transfer`, { target_room: targetRoom });
            alert('전실 완료');
            setTransferModalOpen(false);
            onClose();
            window.location.reload();
        } catch (e) {
            alert('전실 실패: 이미 사용 중인 병실이거나 오류가 발생했습니다.');
        }
    };

    const roomNotifications = useMemo(() => {
        if (!bed) return [];
        return notifications.filter(n => String(n.room) === String(bed.room));
    }, [notifications, bed]);


    const handleAddExam = async (examData: { name: string; date: string; timeOfDay: 'am' | 'pm' }) => {
        if (!bed?.id) return;
        try {
            const [y, m, d] = examData.date.split('-').map(Number);
            const hour = examData.timeOfDay === 'am' ? 9 : 14;
            const scheduledAt = new Date(y, m - 1, d, hour, 0).toISOString();
            await api.post('/api/v1/exam-schedules', {
                admission_id: bed.id,
                scheduled_at: scheduledAt,
                name: examData.name.trim(),
                note: ''
            });

            fetchDashboardData();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const handleDeleteExam = async (scheduleId: number) => {
        if (!window.confirm('이 검사 일정을 삭제할까요?')) return;
        setDeletingExamId(scheduleId);
        try {
            await api.delete(`/api/v1/exam-schedules/${scheduleId}`);
            fetchDashboardData();
        } finally {
            setDeletingExamId(null);
        }
    };

    const {
        vitals: fetchedVitals,
        checkInAt: fetchedCheckIn,
        meals: fetchedMeals,
        documentRequests: fetchedDocRequests,
        examSchedules,
        isRefreshing,
        fetchDashboardData,
        addOptimisticVital
    } = useVitals(bed?.token, isOpen);

    const handleMealEditSave = async (pediatric: string, guardian: string) => {
        if (!bed?.id || !editMealConfig) return;
        try {
            await api.post('/api/v1/meals/requests', {
                admission_id: bed.id,
                request_type: 'STATION_UPDATE',
                meal_date: editMealConfig.date,
                meal_time: editMealConfig.meal_time,
                pediatric_meal_type: pediatric,
                guardian_meal_type: guardian,
                room_note: fetchedMeals.find(m => m.meal_date === editMealConfig.date && m.meal_time === editMealConfig.meal_time)?.room_note || ''
            });
            fetchDashboardData();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    useEffect(() => {
        if (isOpen && bed?.token) {
            fetchDashboardData();
        }
    }, [isOpen, bed?.token, fetchDashboardData, lastUpdated]); // Add lastUpdated to sync when parent detects changes

    const latestMeal = fetchedMeals.length > 0 ? fetchedMeals[0] : null;
    const currentMealLabelModal = latestMeal
        ? (latestMeal.request_type === 'STATION_UPDATE'
            ? (latestMeal.pediatric_meal_type || '일반식')
            : (MEAL_MAP[latestMeal.request_type] ?? latestMeal.request_type))
        : null;
    const latestDocRequest = fetchedDocRequests.length > 0 ? fetchedDocRequests[0] : null;
    const currentDocLabelsModal = latestDocRequest?.request_items?.map((id: string) => DOC_MAP[id] || id) ?? [];

    const { chartVitals, chartCheckIn } = useMemo(() => {
        if (!bed) return { chartVitals: [], chartCheckIn: null };
        if (propVitals && propVitals.length > 0) {
            return { chartVitals: propVitals, chartCheckIn: propCheckInAt ?? null };
        }
        if (fetchedVitals.length > 0) {
            return { chartVitals: fetchedVitals, chartCheckIn: fetchedCheckIn };
        }
        return { chartVitals: [], chartCheckIn: fetchedCheckIn || propCheckInAt || null };
    }, [bed, propVitals, propCheckInAt, fetchedVitals, fetchedCheckIn]);

    // useVitals returns vitals in newest-first order. latestVital should be index 0.
    const latestVital = fetchedVitals.length > 0 ? fetchedVitals[0] : null;
    const displayTemp = latestVital ? latestVital.temperature : bed.temp;
    const displayVitalTime = latestVital ? latestVital.recorded_at : bed.last_vital_at;

    const getTempBorderColor = () => {
        if (!displayVitalTime) return 'border-slate-200';
        const hours = (Date.now() - new Date(displayVitalTime).getTime()) / (1000 * 60 * 60);
        if (hours >= 4) return 'border-red-500 ring-4 ring-red-100';
        if (hours >= 2) return 'border-orange-400 ring-4 ring-orange-100';
        return 'border-slate-200';
    };

    if (!isOpen || !bed) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className={`bg-white rounded-[2rem] w-[75%] max-w-none max-h-[85vh] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                {/* Header */}
                <div className={`px-8 py-6 shrink-0 ${bed.status === 'fever' ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-100`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{bed.room}호</h2>
                            <span className="text-xl text-slate-300 font-light">/</span>
                            <p className="text-slate-500 font-bold text-base mt-1">{bed.name}</p>
                            {bed.dob && (
                                <span className={`text-base mt-1 ml-1 font-bold ${bed.gender === 'M' ? 'text-blue-500' : bed.gender === 'F' ? 'text-rose-500' : 'text-slate-500'}`}>
                                    ({formatPatientDemographics(bed.dob, bed.gender)})
                                </span>
                            )}
                            {bed.status === 'fever' && (
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                                    고열 주의
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 -mt-1">
                            <button
                                onClick={handleDischarge}
                                className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors"
                            >
                                퇴원
                            </button>
                            <button
                                onClick={() => setTransferModalOpen(true)}
                                className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors"
                            >
                                전실
                            </button>
                            <button
                                onClick={handleSeedData}
                                className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                                title="가상 데이터 생성 (Dev)"
                            >
                                Dev
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 -mt-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mt-4">
                        <div className="lg:col-span-7">
                            <div className="grid grid-cols-5 gap-2 h-full">
                                <button
                                    onClick={() => setVitalModalOpen(true)}
                                    className={`col-span-1 bg-white rounded-[1.2rem] border-[1.5px] ${displayVitalTime && (Date.now() - new Date(displayVitalTime).getTime()) / 3600000 >= 2 ? getTempBorderColor() : 'border-slate-200'} shadow-sm flex flex-col justify-center items-center hover:bg-slate-50 transition-all py-1.5 px-1`}
                                >
                                    <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">체온</span>
                                    <div className="flex items-center gap-0.5">
                                        <span className={`text-lg font-bold ${displayTemp !== null && displayTemp >= 38.0 ? 'text-red-500' : 'text-slate-700'}`}>
                                            {displayTemp !== null ? displayTemp.toFixed(1) : '-'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold mt-1">°C</span>
                                    </div>
                                </button>

                                <div className="col-span-1 bg-white rounded-[1.2rem] border-[1.5px] border-slate-200 shadow-sm flex flex-col justify-center items-center py-1.5 px-1">
                                    <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">속도</span>
                                    <div className="flex items-center gap-0.5">
                                        <span className="text-lg font-bold text-slate-700">{bed.drops ?? '-'}</span>
                                        <span className="text-[10px] text-slate-400 font-bold mt-1">cc/hr</span>
                                    </div>
                                </div>

                                {getNextThreeMealSlots().map((slot) => {
                                    const meal = fetchedMeals.find(m => m.meal_date === slot.date && m.meal_time === slot.meal_time);
                                    const labelText = meal
                                        ? (meal.pediatric_meal_type || '일반식')
                                        : '신청전';

                                    return (
                                        <div key={slot.label} className="col-span-1 bg-white rounded-[1.2rem] border-[1.5px] border-slate-200 shadow-sm flex flex-col justify-center items-center relative group/meal py-1.5 px-1">
                                            <button
                                                onClick={() => setEditMealConfig({
                                                    ...slot,
                                                    pediatric: meal?.pediatric_meal_type || '선택 안함',
                                                    guardian: meal?.guardian_meal_type || '선택 안함'
                                                })}
                                                className="absolute top-1 right-1 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-50 transition-colors opacity-0 group-hover/meal:opacity-100"
                                                title={`${slot.label} 식사 수정`}
                                            >
                                                <Edit2 size={10} />
                                            </button>
                                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">{slot.label}</span>
                                            <span className="text-lg font-bold text-slate-700 line-clamp-1 break-keep text-center leading-tight">
                                                {labelText}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-5 h-full">
                            <div className="bg-white px-4 py-2 rounded-[1.5rem] border-[1.5px] border-slate-200 shadow-sm relative group/iv h-full flex flex-col justify-center">
                                <div className="flex items-center justify-between mb-1 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-sky-50 text-sky-500 rounded-full">
                                            <Droplets size={14} />
                                        </div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            IV 수액 속도 기록
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
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

                        <div className="lg:col-span-5 space-y-6 flex flex-col">
                            <section className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar size={16} className="text-primary" />
                                        오늘의 검사 일정
                                    </h3>
                                    <button
                                        onClick={() => setAddExamModalOpen(true)}
                                        className="text-[10px] bg-violet-100 text-violet-600 px-2 py-1 rounded-lg font-bold hover:bg-violet-200 transition"
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
            </div>

            {transferModalOpen && (
                <TransferModal
                    isOpen={transferModalOpen}
                    onClose={() => setTransferModalOpen(false)}
                    onTransfer={handleTransfer}
                    currentRoom={bed.room}
                />
            )}

            {vitalModalOpen && (
                <VitalModal
                    isOpen={vitalModalOpen}
                    onClose={() => setVitalModalOpen(false)}
                    admissionId={bed.id}
                    onSuccess={(temp, recordedAt) => {
                        addOptimisticVital(temp, recordedAt);
                        fetchDashboardData();
                        onVitalUpdate?.(temp);
                    }}
                />
            )}

            {editMealConfig && (
                <EditMealModal
                    isOpen={!!editMealConfig}
                    onClose={() => setEditMealConfig(null)}
                    label={editMealConfig.label}
                    date={editMealConfig.date}
                    mealTime={editMealConfig.meal_time}
                    currentPediatric={editMealConfig.pediatric}
                    currentGuardian={editMealConfig.guardian}
                    onSave={handleMealEditSave}
                />
            )}

            <AddExamModal
                isOpen={addExamModalOpen}
                onClose={() => setAddExamModalOpen(false)}
                onSave={handleAddExam}
            />
        </div>
    );
}
