'use client';

import React, { useState } from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';
import Image from 'next/image';
import { QrCodeModal } from '@/components/QrCodeModal';
import { AdmitSubModal } from '@/components/AdmitSubModal';
import { Bed, Notification, LastUploadedIv } from '@/types/domain';
import { MEAL_MAP, DOC_MAP, ROOM_NUMBERS } from '@/constants/mappings';
import { api } from '@/lib/api';

import { useStation } from '@/hooks/useStation';
import { useMeals } from '@/hooks/useMeals';
import { MealGrid } from '@/components/MealGrid';

export default function Station() {
    const {
        beds,
        setBeds,
        notifications,
        setNotifications,
        lastUploadedIv,
        lastUpdated,
        removeNotification
    } = useStation();

    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [qrBed, setQrBed] = useState<Bed | null>(null); // State for QR Modal
    const [admitRoom, setAdmitRoom] = useState<string | null>(null);

    const handleAdmit = async (name: string, birthday: string) => {
        if (!admitRoom) return;
        try {
            await api.post('/api/v1/admissions', {
                patient_name: name,
                room_number: admitRoom
            });
            // 1. Success Feedback
            alert('입원 수속이 완료되었습니다.');
            setAdmitRoom(null);

            // 2. Refresh Logic separation
            try {
                window.location.reload();
            } catch (reloadErr) {
                console.error("Reload/Fetch failed", reloadErr);
                alert('목록 조회 중 오류가 발생했습니다. (입원은 정상 처리됨)');
            }
        } catch (e) {
            console.error(e);
            alert('입원 처리 실패: 서버 응답을 확인해주세요.');
        }
    };

    // Derived selectedBed from beds and selectedRoom
    const selectedBed = React.useMemo(() => {
        if (!selectedRoom) return null;
        return beds.find(b => String(b.room) === selectedRoom) || null;
    }, [beds, selectedRoom]);

    const handleNotificationClick = (notif: Notification) => {
        const bed = beds.find(b => b.room === notif.room);
        if (bed) {
            setSelectedRoom(notif.room);
        } else {
            if (window.confirm(`${notif.room}호 변동사항을 확인하시겠습니까? (환자 정보 없음)`)) {
                removeNotification(notif.id);
            }
        }
    };

    const [activeTab, setActiveTab] = useState<'patients' | 'meals'>('patients');
    const { plans, fetchPlans, savePlans, loading: mealsLoading } = useMeals(); // Import this hook at top

    // Fetch meals on tab change
    React.useEffect(() => {
        if (activeTab === 'meals') {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            fetchPlans(today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0]);
        }
    }, [activeTab, fetchPlans]);

    const handleSaveMeals = async () => {
        try {
            await savePlans(plans);
            alert('식단이 저장되었습니다.');
        } catch (e) {
            alert('저장 실패');
        }
    };

    const handleMealChange = (date: string, type: 'breakfast' | 'lunch' | 'dinner' | 'snack', value: string) => {
        // Optimistic update in plans state (needs setPlans exposed from useMeals or handled here)
        // For simplicity, let's assume useMeals exposes setPlans or we wrap it.
        // Actually, useMeals should probably expose a setter or we manage local state here.
        // Let's modify useMeals to expose setPlans or update logic.
        // Re-implementing simplified logic here for speed if useMeals doesn't support it yet.
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Main Content */}
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
                        {/* Tabs */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('patients')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'patients' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
                            >
                                환자 리스트
                            </button>
                            <button
                                onClick={() => setActiveTab('meals')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'meals' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600'}`}
                            >
                                식단 관리
                            </button>
                            <button onClick={async () => {
                                if (!confirm('경고: DEV 모드 전용입니다.\n모든 환자를 퇴원 처리하시겠습니까?')) return;
                                try {
                                    await api.post('/api/v1/dev/discharge-all', {});
                                    alert('모든 환자가 퇴원 처리되었습니다.');
                                    window.location.reload();
                                } catch (e) {
                                    alert('Error discharging');
                                }
                            }} className="px-3 py-2 text-xs bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100 font-bold ml-2">
                                DEV: 전체퇴원
                            </button>
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
                                            onClick={() => setAdmitRoom(bed.room)}
                                            className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700"
                                        >
                                            입원 수속
                                        </button>
                                    </div>
                                );
                            }

                            const isFever = bed.had_fever_in_6h || bed.temp >= 38.0;
                            const status = isFever ? 'fever' : 'normal';
                            return (
                                <PatientCard
                                    key={bed.room}
                                    name={bed.name}
                                    roomNumber={bed.room}
                                    temperature={bed.temp.toFixed(1)}
                                    infusionRate={bed.drops}
                                    status={status}
                                    onCardClick={() => setSelectedRoom(bed.room)}
                                    onQrClick={(e) => {
                                        e.stopPropagation();
                                        if (bed.token) setQrBed(bed);
                                        else alert('토큰 없음');
                                    }}
                                />
                            );
                        })}
                    </div>
                )}

                {activeTab === 'meals' && (
                    <div className="flex-1 overflow-hidden p-1">
                        <MealGrid />
                    </div>
                )}
            </main>

            {/* Notification Sidebar */}
            <aside className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                    <Bell size={20} className="text-teal-500" />
                    <span>Recent Requests</span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                    {/* ... notifications map ... */}
                    {notifications.map((notif: Notification) => (
                        <Card
                            key={notif.id}
                            className={`border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${notif.type === 'meal' ? 'border-l-orange-500' : 'border-l-blue-500'}`}
                            onClick={() => handleNotificationClick(notif)}
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

            {/* Modals ... */}
            {selectedBed && (
                <PatientDetailModal
                    isOpen={!!selectedRoom}
                    onClose={() => setSelectedRoom(null)}
                    bed={selectedBed}
                    notifications={notifications}
                    onCompleteRequest={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
                    lastUploadedIv={lastUploadedIv}
                    onIVUploadSuccess={(rate) => {
                        if (rate !== undefined && selectedRoom) {
                            setBeds(prev => prev.map(b => String(b.room) === selectedRoom ? { ...b, drops: rate } : b));
                        }
                    }}
                    lastUpdated={lastUpdated}
                />
            )}
            {qrBed && (
                <QrCodeModal
                    isOpen={!!qrBed}
                    onClose={() => setQrBed(null)}
                    patientName={qrBed.name}
                    roomNumber={qrBed.room}
                    token={qrBed.token}
                />
            )}
            <AdmitSubModal
                isOpen={!!admitRoom}
                onClose={() => setAdmitRoom(null)}
                roomNumber={admitRoom || ''}
                onAdmit={handleAdmit}
            />
        </div>
    );
}


