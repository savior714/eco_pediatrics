'use client';

import React from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';
import Image from 'next/image';
import { QrCodeModal } from '@/components/QrCodeModal';
import { AdmitSubModal } from '@/components/AdmitSubModal';
import { Bed, Notification } from '@/types/domain';
import { useStationActions } from '@/hooks/useStationActions';
import { MealGrid } from '@/components/MealGrid';

export default function Station() {
    const {
        stationData,
        state,
        actions
    } = useStationActions();

    const { beds, notifications, lastUploadedIv, lastUpdated, removeNotification } = stationData;
    const { selectedRoom, qrBed, admitRoom, activeTab, selectedBed } = state;

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            <main className="flex-1 p-2 overflow-y-auto flex flex-col">
                <header className="flex justify-between items-center mb-2 px-1 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="relative h-14 w-32">
                            <Image
                                src="/eco_logo.png"
                                alt="Eco Pediatrics"
                                fill
                                className="object-contain object-left"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => actions.setActiveTab('patients')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'patients' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
                            >
                                환자 리스트
                            </button>
                            <button
                                onClick={() => actions.setActiveTab('meals')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'meals' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
                            >
                                식단 관리
                            </button>
                            {process.env.NEXT_PUBLIC_ENABLE_DEV_UI === 'true' && (
                                <button
                                    onClick={actions.handleDischargeAll}
                                    className="px-3 py-2 text-xs bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100 font-bold ml-2"
                                >
                                    DEV: 전체퇴원
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-slate-500 text-xs">Total: {beds.length}</div>
                </header >

                {activeTab === 'patients' && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 pb-20">
                        {beds.map((bed: Bed) => {
                            if (!bed.id) {
                                return (
                                    <div key={bed.room} className="h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="text-lg font-bold text-slate-400 mb-2">{bed.room}</div>
                                        <button
                                            onClick={() => actions.setAdmitRoom(bed.room)}
                                            className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700"
                                        >
                                            입원
                                        </button>
                                    </div>
                                );
                            }

                            const isFever = bed.had_fever_in_6h || (bed.temp !== null && bed.temp >= 38.0);
                            const status = isFever ? 'fever' : 'normal';
                            return (
                                <PatientCard
                                    key={bed.room}
                                    name={bed.name}
                                    roomNumber={bed.room}
                                    temperature={bed.temp !== null ? bed.temp.toFixed(1) : '-'}
                                    infusionRate={bed.drops ?? '-'}
                                    status={status}
                                    onCardClick={() => actions.setSelectedRoom(bed.room)}
                                    onQrClick={(e) => {
                                        e.stopPropagation();
                                        if (bed.token) actions.setQrBed(bed);
                                        else alert('토큰 없음');
                                    }}
                                    dob={bed.dob}
                                    gender={bed.gender}
                                />
                            );
                        })}
                    </div>
                )}

                {activeTab === 'meals' && (
                    <div className="flex-1 overflow-hidden p-1">
                        <MealGrid beds={beds} />
                    </div>
                )}
            </main>

            <aside className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                    <Bell size={20} className="text-teal-500" />
                    <span>Recent Requests</span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                    {notifications.map((notif: Notification) => (
                        <Card
                            key={notif.id}
                            className={`border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${notif.type === 'meal' ? 'border-l-orange-500' : 'border-l-blue-500'}`}
                            onClick={() => actions.handleNotificationClick(notif)}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-700">{notif.room}호</span>
                                <span className="text-xs text-slate-400">{notif.time}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{notif.content}</p>
                        </Card>
                    ))}
                </div>
            </aside>

            {selectedBed && (
                <PatientDetailModal
                    isOpen={!!selectedRoom}
                    onClose={() => actions.setSelectedRoom(null)}
                    bed={selectedBed}
                    notifications={notifications}
                    onCompleteRequest={(id: string, type?: string, admissionId?: string) => removeNotification(id, type, admissionId)}
                    lastUploadedIv={lastUploadedIv}
                    onIVUploadSuccess={(rate) => {
                        if (rate !== undefined && selectedRoom) {
                            actions.setBeds(prev => prev.map(b => String(b.room) === selectedRoom ? { ...b, drops: rate } : b));
                        }
                    }}
                    onVitalUpdate={(temp) => {
                        if (selectedRoom) {
                            actions.setBeds(prev => prev.map(b => String(b.room) === selectedRoom ? {
                                ...b,
                                temp: temp,
                                last_vital_at: new Date().toISOString(),
                                status: (temp >= 38.0 || b.had_fever_in_6h) ? 'fever' : 'normal'
                            } : b));
                        }
                    }}
                    lastUpdated={lastUpdated}
                />
            )}
            {qrBed && (
                <QrCodeModal
                    isOpen={!!qrBed}
                    onClose={() => actions.setQrBed(null)}
                    patientName={qrBed.name}
                    roomNumber={qrBed.room}
                    token={qrBed.token}
                />
            )}
            <AdmitSubModal
                isOpen={!!admitRoom}
                onClose={() => actions.setAdmitRoom(null)}
                roomNumber={admitRoom || ''}
                onAdmit={actions.handleAdmit}
            />
        </div>
    );
}


