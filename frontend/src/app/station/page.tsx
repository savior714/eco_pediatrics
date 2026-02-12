'use client';

import React, { useState } from 'react';
import { PatientCard } from '@/components/PatientCard';
import { Card } from '@/components/Card';
import { Bell } from 'lucide-react';
import { IVUploadForm } from '@/components/IVUploadForm';

export default function Station() {
    // Mock data for 29 beds
    // In a real app, fetch from /api/v1/admissions?status=IN_PROGRESS
    const [beds, setBeds] = useState(Array.from({ length: 29 }, (_, i) => ({
        id: `admission-uuid-${i}`, // Mock UUID
        room: 801 + i,
        name: `Child ${i + 1}`,
        temp: 36.5 + (Math.random() * 2), // Random temp
        drops: 20,
        // Logic: Fever if temp >= 38.0
        status: (36.5 + (Math.random() * 2)) >= 38.0 ? 'fever' : 'normal',
        showIVForm: false
    })));

    const toggleIVForm = (index: number) => {
        const newBeds = [...beds];
        newBeds[index].showIVForm = !newBeds[index].showIVForm;
        setBeds(newBeds);
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden">
            {/* Main Grid */}
            <main className="flex-1 p-6 overflow-y-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Pediatric Ward Station (Unit 8)</h1>
                    <div className="text-slate-500">Total Patients: 29</div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {beds.map((bed: any, index: number) => {
                        // Dynamic status calculation
                        const isFever = bed.temp >= 38.0;
                        const status = isFever ? 'fever' : 'normal';

                        return (
                            <div key={bed.room} className="relative">
                                <PatientCard
                                    name={bed.name}
                                    roomNumber={bed.room}
                                    temperature={bed.temp.toFixed(1)}
                                    infusionRate={bed.drops}
                                    status={status}
                                    onPrintQR={() => toggleIVForm(index)}
                                />
                                {/* Reusing QR button as "Action" button for MVP to show IV Form */}

                                {bed.showIVForm && (
                                    <div className="absolute top-full left-0 right-0 z-10 shadow-xl">
                                        <IVUploadForm
                                            admissionId={bed.id}
                                            patientName={bed.name}
                                            onUploadSuccess={() => {
                                                toggleIVForm(index);
                                                // Ideally, refresh data or update local state
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Notification Sidebar */}
            <aside className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
                    <Bell size={20} className="text-teal-500" />
                    <span>Recent Requests</span>
                </div>

                {/* Mock Notifications */}
                <Card className="border-l-4 border-l-teal-500">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-700">802호</span>
                        <span className="text-xs text-slate-400">2분 전</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">식단 변경 요청 (일반식 → 죽)</p>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-700">805호</span>
                        <span className="text-xs text-slate-400">10분 전</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">입퇴원 확인서 신청</p>
                </Card>
            </aside>
        </div>
    );
}
