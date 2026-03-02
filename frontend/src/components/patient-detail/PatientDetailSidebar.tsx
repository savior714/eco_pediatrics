import React, { useMemo } from 'react';
import { Calendar, FileText, Bell, Trash2, Check } from 'lucide-react';
import { ExamScheduleItem, DocumentRequest, Notification } from '@/types/domain';
import { DOC_MAP } from '@/constants/mappings';

interface PatientDetailSidebarProps {
    examSchedules: ExamScheduleItem[];
    documentRequests: DocumentRequest[];
    roomNotifications: Notification[];
    deletingExamId: number | null;
    onAddExam: () => void;
    onDeleteExam: (id: number) => void;
    onCompleteRequest: (id: string, type: string) => void;
}

function formatExamTime(iso: string): string {
    const d = new Date(iso);
    const mth = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours();
    const ampm = h < 12 ? '오전' : '오후';

    return `${mth}/${day} ${ampm}`;
}

/** 실시간 요청 섹션: 메모로 부모 리렌더 시 불필요한 재렌더 방지 */
const RealTimeRequestsSection = React.memo(function RealTimeRequestsSection({
    notifications,
    onCompleteRequest,
}: {
    notifications: Notification[];
    onCompleteRequest: (id: string, type: string) => void;
}) {
    return (
        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                실시간 요청 {notifications.length > 0 && <span className="text-amber-600">({notifications.length})</span>}
            </h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 bg-white rounded-xl border-[1.5px] border-slate-200 shadow-sm flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{notif.time}</span>
                            <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{notif.content}</p>
                        </div>
                        <button
                            onClick={() => onCompleteRequest(notif.id, notif.type)}
                            className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <Check size={16} />
                            완료
                        </button>
                    </div>
                ))}
                {notifications.length === 0 && <p className="text-xs text-slate-400 text-center py-4">대기 중인 요청이 없습니다.</p>}
            </div>
        </section>
    );
});

export function PatientDetailSidebar({
    examSchedules,
    documentRequests,
    roomNotifications,
    deletingExamId,
    onAddExam,
    onDeleteExam,
    onCompleteRequest,
}: PatientDetailSidebarProps) {
    const displayNotifications = useMemo(() => roomNotifications, [roomNotifications]);
    const completedDocs = useMemo(
        () => documentRequests.filter((r) => String(r.status ?? '').toUpperCase() === 'COMPLETED'),
        [documentRequests]
    );

    return (
        <div className="lg:col-span-5 h-full overflow-y-auto">
            <div className="space-y-4">
                <RealTimeRequestsSection notifications={displayNotifications} onCompleteRequest={onCompleteRequest} />

                <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Calendar size={16} className="text-violet-500" />
                            예정된 검사
                        </h3>
                        <button
                            onClick={onAddExam}
                            className="text-[10px] bg-violet-100 text-violet-600 px-2 py-1 rounded-lg font-bold hover:bg-violet-200 transition"
                        >
                            일정 등록
                        </button>
                    </div>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {examSchedules.map((ex) => (
                            <div
                                key={ex.id}
                                className={`p-3 bg-white rounded-xl border-[1.5px] border-slate-200 shadow-sm text-xs flex justify-between items-center gap-2 ${ex.isOptimistic ? 'opacity-50' : ''}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between mb-0.5">
                                        <span className="font-bold text-slate-700">{ex.name}</span>
                                        <span className="text-slate-400 shrink-0">{formatExamTime(ex.scheduled_at)}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onDeleteExam(ex.id)}
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

                <section id="patient-sidebar-completed-docs" className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-sky-500" />
                        신청된 서류 (완료)
                    </h3>
                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
                        {completedDocs.length > 0 ? (
                            <div className="space-y-4">
                                {completedDocs.map((req) => (
                                    <div key={req.id} className="space-y-1">
                                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                                            {new Date(req.created_at).toLocaleDateString()} 신청분
                                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-teal-100 text-teal-600">
                                                완료
                                            </span>
                                        </div>
                                        <ul className="space-y-1 text-xs text-slate-600">
                                            {req.request_items.map((it: string, i: number) => (
                                                <li key={`${req.id}-${it}-${i}`} className="flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                                                    {DOC_MAP[it] || it}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">신청된 서류 없음</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
