'use client';

import React, { useState } from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';
import Image from 'next/image';
import { QrCodeModal } from '@/components/QrCodeModal';

export default function Station() {
    // Use static initial state to prevent hydration mismatch
    const [beds, setBeds] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [qrBed, setQrBed] = useState<any>(null); // State for QR Modal
    const [lastUploadedIv, setLastUploadedIv] = useState<{ admissionId: string; url: string } | null>(null);

    // Derive selectedBed from beds and selectedRoom
    const selectedBed = React.useMemo(() => {
        if (!selectedRoom) return null;
        return beds.find(b => String(b.room) === selectedRoom) || null;
    }, [beds, selectedRoom]);

    React.useEffect(() => {
        const roomNumbers = [
            '301', '302', '303', '304', '305', '306', '307', '308', '309',
            '310-1', '310-2',
            '311-1', '311-2', '311-3', '311-4',
            '312', '313', '314',
            '315-1', '315-2', '315-3', '315-4',
            '401-1', '401-2', '401-3', '401-4',
            '402-1', '402-2', '402-3', '402-4'
        ];

        // 초기 30 병상
        setBeds(roomNumbers.map((room, i) => ({
            id: '',
            room: room,
            name: `환자${i + 1}`,
            temp: 36.5,
            drops: 20,
            status: 'normal',
            token: '' // access_token placeholder
        })));

        // 실제 입원 목록 연동
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        fetch(`${API_URL}/api/v1/admissions`)
            .then(res => res.ok ? res.json() : [])
            .then((admissions: {
                id: string;
                room_number: string;
                patient_name_masked: string;
                access_token: string;
                latest_iv: { infusion_rate: number; photo_url: string } | null;
            }[]) => {
                if (!Array.isArray(admissions)) return;
                setBeds(prev => prev.map(bed => {
                    const adm = admissions.find((a: any) => String(a.room_number).trim() === String(bed.room).trim());
                    if (adm) {
                        const infusionRate = adm.latest_iv ? adm.latest_iv.infusion_rate : 20;
                        return {
                            ...bed,
                            id: adm.id,
                            name: adm.patient_name_masked,
                            token: adm.access_token,
                            drops: infusionRate
                        };
                    }
                    return bed;
                }));
            })
            .catch(() => { });

        // ... WebSocket ...
        const WS_URL = API_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${WS_URL}/ws/STATION`);
        // ... (rest of websocket logic) ...
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const id = Math.random().toString(36).substr(2, 9);

            if (message.type === 'NEW_MEAL_REQUEST') {
                const mealMap: any = { GENERAL: '일반식', SOFT: '죽', NPO: '금식' };
                setNotifications(prev => [{
                    id,
                    room: message.data.room,
                    time: '방금',
                    content: `식단 신청 (${mealMap[message.data.request_type] || message.data.request_type})`,
                    type: 'meal'
                }, ...prev]);
            } else if (message.type === 'NEW_DOC_REQUEST') {
                const docMap: any = { RECEIPT: '영수증', DETAIL: '세부내역서', CERT: '진단서', DIAGNOSIS: '소견서', INITIAL: '기록지' };
                const items = message.data.request_items.map((it: string) => docMap[it] || it).join(', ');
                setNotifications(prev => [{
                    id,
                    room: message.data.room,
                    time: '방금',
                    content: `서류 신청 (${items})`,
                    type: 'doc'
                }, ...prev]);
            } else if (message.type === 'IV_PHOTO_UPLOADED') {
                // If the modal is open for this bed, we want to auto-fill the photo
                // We'll use a specific state or event for this
                // Since we can't easily pass this to the modal deeply without context or prop drilling,
                // We will set a temporary state that PatientDetailModal can react to.
                setLastUploadedIv({
                    admissionId: message.data.admission_id,
                    url: message.data.photo_url
                });
            } else if (message.type === 'NEW_IV') {
                const newDrops = message.data.infusion_rate;
                const room = message.data.room;

                console.log(`[DEBUG] Received NEW_IV for room ${room}: ${newDrops}`);

                setBeds(prev => prev.map(bed => {
                    if (String(bed.room) === String(room)) {
                        console.log(`[DEBUG] Updating grid bed ${room} drops to ${newDrops}`);
                        return { ...bed, drops: newDrops };
                    }
                    return bed;
                }));

                // Update selectedBed logic no longer needed separately as it's derived
            }
        };

        return () => ws.close();
    }, []);

    // ... (rest of removeNotification, handleNotificationClick) ...

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = (notif: any) => {
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
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                if (confirm('30개 병상 전체에 가상 입원 데이터를 생성하시겠습니까? (테스트용)')) {
                                    try {
                                        const res = await fetch(`${API_URL}/api/v1/seed/full-test-data`, { method: 'POST' });
                                        if (res.ok) {
                                            alert('데이터 생성이 완료되었습니다. 페이지를 새로고침합니다.');
                                            window.location.reload();
                                        } else {
                                            alert('데이터 생성 실패');
                                        }
                                    } catch (e) {
                                        alert('서버 연결 실패');
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
                    {beds.map((bed: any, index: number) => {
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
                        notifications.map((notif: any) => (
                            <Card
                                key={notif.id}
                                className={`border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${notif.type === 'meal' ? 'border-l-orange-500' : 'border-l-blue-500'
                                    }`}
                                onClick={() => { /* handleNotificationClick(notif) */ }}
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
            />

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


