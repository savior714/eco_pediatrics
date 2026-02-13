'use client';

import React, { useState } from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { PatientDetailModal } from '@/components/PatientDetailModal';

export default function Station() {
    // Use static initial state to prevent hydration mismatch
    const [beds, setBeds] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedBed, setSelectedBed] = useState<any>(null);

    React.useEffect(() => {
        // Initialize 30 beds as per user requirements
        const roomNumbers = [
            '301', '302', '303', '304', '305', '306', '307', '308', '309',
            '310-1', '310-2',
            '311-1', '311-2', '311-3', '311-4',
            '312', '313', '314',
            '315-1', '315-2', '315-3', '315-4',
            '401-1', '401-2', '401-3', '401-4',
            '402-1', '402-2', '402-3', '402-4'
        ];

        setBeds(roomNumbers.map((room, i) => ({
            id: `admission-uuid-${i}`,
            room: room,
            name: `환자 ${i + 1}`,
            temp: 36.5 + (Math.random() * 2),
            drops: 20,
            status: 'normal'
        })));

        // WebSocket Connection for alerts
        const ws = new WebSocket('ws://localhost:8000/ws/STATION');

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
            }
        };

        return () => ws.close();
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = (notif: any) => {
        // Find the bed corresponding to the room number
        const bed = beds.find(b => b.room === notif.room);
        if (bed) {
            setSelectedBed(bed);
        } else {
            // Fallback
            if (window.confirm(`${notif.room}호 변동사항을 확인하시겠습니까? (환자 정보 없음)`)) {
                removeNotification(notif.id);
            }
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Main Grid */}
            <main className="flex-1 p-6 overflow-y-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Pediatric Ward Station (Unit 3/4)</h1>
                    <div className="text-slate-500">Total Patients: 30</div>
                </header >

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {beds.map((bed: any, index: number) => {
                        // Dynamic status calculation
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
                                onCardClick={() => setSelectedBed({ ...bed, status })}
                            />
                        );
                    })}
                </div>
            </main >

            {/* Notification Sidebar */}
            < aside className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col gap-4" >
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                    <Bell size={20} className="text-teal-500" />
                    <span>Recent Requests</span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            대기 중인 요청이 없습니다.
                        </div>
                    ) : (
                        notifications.map((notif) => (
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
            </aside >

            {/* Detail Modal */}
            <PatientDetailModal
                isOpen={!!selectedBed}
                onClose={() => setSelectedBed(null)}
                bed={selectedBed}
                notifications={notifications}
                onCompleteRequest={removeNotification}
            />
        </div >
    );
}
