'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatientCard } from '@/components/PatientCard';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';
import Image from 'next/image';
import { QrCodeModal } from '@/components/QrCodeModal';
import { AdmitSubModal } from '@/components/AdmitSubModal';
import { Bed, Notification } from '@/types/domain';
import { useStationActions } from '@/hooks/useStationActions';
import { MealGrid } from '@/components/MealGrid';
import { NotificationItem } from '@/components/NotificationItem';

const PHYSICIAN_INITIALS = ['조', '김', '원', '이'] as const;

export default function Station() {
    const {
        stationData,
        state,
        actions
    } = useStationActions();

    const { beds, notifications, lastUploadedIv, lastUpdated, removeNotification } = stationData;
    const { selectedRoom, qrBed, admitRoom, activeTab, selectedBed } = state;

    const [filterPhysician, setFilterPhysician] = useState<string | null>(null);
    const activeCount = beds.filter(b => b.id).length;
    const displayBeds = filterPhysician
        ? beds.filter(b => b.id && b.attending_physician?.charAt(0) === filterPhysician)
        : beds;

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
                                <div className="flex gap-1 ml-2">
                                    <button
                                        onClick={actions.handleDischargeAll}
                                        className="px-3 py-2 text-xs bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100 font-bold"
                                    >
                                        DEV: 전체퇴원
                                    </button>
                                    <button
                                        onClick={actions.handleSeedSingle}
                                        className="px-3 py-2 text-xs bg-indigo-50 text-indigo-500 border border-indigo-200 rounded hover:bg-indigo-100 font-bold"
                                    >
                                        DEV: 환자추가
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            {PHYSICIAN_INITIALS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setFilterPhysician(prev => prev === p ? null : p)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-xl font-bold text-sm border shadow-sm transition-colors ${
                                        filterPhysician === p
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="text-slate-700 text-sm font-bold">
                            총 입원 : {activeCount} / {beds.length}
                        </div>
                    </div>
                </header >

                {activeTab === 'patients' && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 pb-20">
                        <AnimatePresence mode="popLayout">
                            {displayBeds.map((bed: Bed) => {
                                if (!bed.id) {
                                    return (
                                        <motion.div
                                            key={bed.room}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                            className="h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="text-lg font-bold text-slate-400 mb-2">{bed.room}</div>
                                            <button
                                                onClick={() => actions.setAdmitRoom(bed.room)}
                                                className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700"
                                            >
                                                입원
                                            </button>
                                        </motion.div>
                                    );
                                }

                                return (
                                    <motion.div
                                        key={bed.room}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    >
                                        <PatientCard
                                            bed={bed}
                                            name={bed.name}
                                            roomNumber={bed.room}
                                            temperature={bed.temp !== null ? bed.temp.toFixed(1) : '-'}
                                            infusionRate={bed.drops ?? '-'}
                                            status={bed.status}
                                            onCardClick={actions.handleCardClick}
                                            onQrClick={actions.handleQrClick}
                                            dob={bed.dob}
                                            gender={bed.gender}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
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
                    {notifications.map((notif) => (
                        <NotificationItem
                            key={notif.id}
                            notification={notif}
                            onClick={actions.handleNotificationClick}
                        />
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
                    onStationRefresh={() => stationData.fetchAdmissions(true)}
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


