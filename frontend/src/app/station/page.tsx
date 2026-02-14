'use client';

import React, { useState } from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';
import Image from 'next/image';
import { QrCodeModal } from '@/components/QrCodeModal';

import { Bed, Notification, LastUploadedIv } from '@/types/domain';
import { MEAL_MAP, DOC_MAP, ROOM_NUMBERS } from '@/constants/mappings';
import { api } from '@/lib/api';

import { useStation } from '@/hooks/useStation';

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

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Main Grid */}
            <main className="flex-1 p-2 overflow-y-auto">
                <header className="flex justify-between items-center mb-2 px-1">
                    <div className="flex items-center gap-4">
                        <div className="relative h-14 w-80">
                            {/* Make sure to save the logo as 'eco_logo.png' in the public folder */}
                            <Image
                                src="/eco_logo.png"
                                alt="Eco Pediatrics"
                                fill
                                className="object-contain object-left"
                            />
                        </div>
                        {/* [DEV] Seed Data Button */}
                        <button
                            onClick={async () => {
                                if (confirm('30개 병상 전체에 가상 입원 데이터를 생성하시겠습니까? (테스트용)')) {
                                    try {
                                        await api.post('/api/v1/seed/full-test-data', {});
                                        alert('데이터 생성이 완료되었습니다. 페이지를 새로고침합니다.');
                                        window.location.reload();
                                    } catch (e) {
                                        console.error(e);
                                        alert('데이터 생성 실패/서버 연결 실패');
                                    }
                                }
                            }}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                        >
                            데이터 초기화/생성 (Dev)
                        </button>
                    </div>
                    <div className="text-slate-500 text-xs">Total: 30</div>
                </header >

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                    {beds.map((bed: Bed, index: number) => {
                        const isFever = bed.temp >= 38.0;
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
                                    if (bed.token) {
                                        setQrBed(bed);
                                    } else {
                                        alert('입원 정보가 없거나 토큰이 생성되지 않았습니다.');
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Notification Sidebar */}
            {/* ... (sidebar content) ... */}
            <aside className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col gap-4">
                {/* ... (sidebar content) ... */}
                {/* Simplified for matching, assumed unchanged */}
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                    <Bell size={20} className="text-teal-500" />
                    <span>Recent Requests</span>
                </div>
                {/* ... */}
                <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            대기 중인 요청이 없습니다.
                        </div>
                    ) : (
                        notifications.map((notif: Notification) => (
                            <Card
                                key={notif.id}
                                className={`border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${notif.type === 'meal' ? 'border-l-orange-500' : 'border-l-blue-500'
                                    }`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-slate-700">{notif.room}호</span>
                                    <span className="text-xs text-slate-400">{notif.time}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{notif.content}</p>
                            </Card>
                        ))
                    )}
                </div>
            </aside>

            {/* Detail Modal */}
            {/* Detail Modal */}
            {selectedBed && (
                <PatientDetailModal
                    isOpen={!!selectedRoom}
                    onClose={() => setSelectedRoom(null)}
                    bed={selectedBed}
                    notifications={notifications}
                    onCompleteRequest={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
                    lastUploadedIv={lastUploadedIv}
                    onIVUploadSuccess={(rate) => {
                        console.log('IV Upload Success!', rate);
                        // Optimistic update
                        if (rate !== undefined && selectedRoom) {
                            setBeds(prev => prev.map(b => String(b.room) === selectedRoom ? { ...b, drops: rate } : b));
                        }
                    }}
                    lastUpdated={lastUpdated}
                />
            )}

            {/* QR Code Modal using dynamic import to avoid SSR issues if component uses browser APIs immediately */}
            {qrBed && (
                <QrCodeModal
                    isOpen={!!qrBed}
                    onClose={() => setQrBed(null)}
                    patientName={qrBed.name}
                    roomNumber={qrBed.room}
                    token={qrBed.token}
                />
            )}
        </div >
    );
}


