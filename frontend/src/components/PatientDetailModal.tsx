import React, { useMemo } from 'react';
import { X, Check, Clock, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { IVUploadForm } from './IVUploadForm';
import { TemperatureGraph } from './TemperatureGraph';

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
    onIVUploadSuccess?: () => void;
    vitals?: VitalData[];
    checkInAt?: string | null;
}

export function PatientDetailModal({ isOpen, onClose, bed, notifications, onCompleteRequest, onIVUploadSuccess, vitals: propVitals, checkInAt: propCheckInAt }: PatientDetailModalProps) {
    if (!isOpen || !bed) return null;

    const roomNotifications = notifications.filter(n => n.room === bed.room);

    // Chart data: use real vitals if provided, else mock from current temp for station view
    const { chartVitals, chartCheckIn } = useMemo(() => {
        if (propVitals && propVitals.length > 0) {
            return { chartVitals: propVitals, chartCheckIn: propCheckInAt ?? null };
        }
        const base = new Date();
        base.setDate(base.getDate() - 5);
        const mock: VitalData[] = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(base);
            d.setHours(d.getHours() + i * 10);
            const t = bed.temp + (Math.sin(i * 0.5) * 0.8);
            mock.push({
                time: d.toISOString(),
                temperature: Math.round(t * 10) / 10,
                has_medication: i === 3 || i === 7,
                medication_type: i === 3 ? 'A' : i === 7 ? 'I' : undefined,
                recorded_at: d.toISOString()
            });
        }
        return { chartVitals: mock, chartCheckIn: base.toISOString() };
    }, [bed.temp, propVitals, propCheckInAt]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal: 가로 2배 확대 (max-w-4xl ≈ 56rem) */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-6 ${bed.status === 'fever' ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-100`}>
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
                <div className="p-6 flex gap-6">
                    <div className="flex-1 min-w-0">
                        <TemperatureGraph data={chartVitals} checkInAt={chartCheckIn} />
                    </div>
                    <div className="w-80 shrink-0 flex flex-col gap-6">
                        <IVUploadForm
                            admissionId={bed.id}
                            patientName={bed.name}
                            onUploadSuccess={() => onIVUploadSuccess?.()}
                        />
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                요청 사항 <span className="bg-slate-100 text-slate-600 px-1.5 rounded-md text-xs">{roomNotifications.length}</span>
                            </h3>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto">
                        {roomNotifications.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
