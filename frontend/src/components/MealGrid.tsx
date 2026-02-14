'use client';

import React from 'react';
import { api } from '@/lib/api';
import { Bed } from '@/types/domain';

interface MealGridProps {
    beds: Bed[];
    setBeds: React.Dispatch<React.SetStateAction<Bed[]>>;
}

const PEDIATRIC_OPTIONS = ['일반식', '연식(죽)', '미음', '금식', '선택 안함'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

export function MealGrid({ beds, setBeds }: MealGridProps) {
    // Filter only occupied beds
    const patients = beds.filter(b => b.id && b.name);

    const handleUpdate = async (bed: Bed, field: string, value: string) => {
        if (!bed.id) return;

        // Current state for other fields
        const current = bed.latest_meal || {
            id: 0,
            admission_id: bed.id,
            request_type: 'STATION_UPDATE',
            created_at: '',
            pediatric_meal_type: '선택 안함',
            guardian_meal_type: '선택 안함',
            room_note: ''
        };

        const payload = {
            admission_id: bed.id,
            request_type: 'STATION_UPDATE',
            pediatric_meal_type: field === 'pediatric_meal_type' ? value : (current.pediatric_meal_type || '선택 안함'),
            guardian_meal_type: field === 'guardian_meal_type' ? value : (current.guardian_meal_type || '선택 안함'),
            room_note: field === 'room_note' ? value : (current.room_note || '')
        };

        // Optimistic UI Update
        setBeds(prev => prev.map(b => {
            if (b.id === bed.id) {
                return {
                    ...b,
                    latest_meal: {
                        ...current,
                        ...payload,
                        created_at: new Date().toISOString()
                    }
                };
            }
            return b;
        }));

        try {
            await api.post('/api/v1/meals/requests', payload);
        } catch (e) {
            console.error("Meal update failed", e);
            alert("식단 변경 저장 실패 (네트워크 확인 필요)");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-4 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">식단 현황 (실시간 수정)</h2>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span>자동 저장됨</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-xl">
                <table className="w-full text-sm text-left rtl:text-right text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 border-b">병실</th>
                            <th scope="col" className="px-6 py-3 border-b">환자명</th>
                            <th scope="col" className="px-6 py-3 border-b w-[200px]">환아식</th>
                            <th scope="col" className="px-6 py-3 border-b w-[200px]">보호자식</th>
                            <th scope="col" className="px-6 py-3 border-b">비고 (Room Note)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map((bed) => (
                            <tr key={bed.room} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                    {bed.room}호
                                </th>
                                <td className="px-6 py-4 font-bold text-slate-700">
                                    {bed.name}
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        value={bed.latest_meal?.pediatric_meal_type || '선택 안함'}
                                        onChange={(e) => handleUpdate(bed, 'pediatric_meal_type', e.target.value)}
                                    >
                                        {PEDIATRIC_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        value={bed.latest_meal?.guardian_meal_type || '선택 안함'}
                                        onChange={(e) => handleUpdate(bed, 'guardian_meal_type', e.target.value)}
                                    >
                                        {GUARDIAN_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        placeholder="비고 입력..."
                                        defaultValue={bed.latest_meal?.room_note || ''}
                                        onBlur={(e) => {
                                            if (e.target.value !== (bed.latest_meal?.room_note || '')) {
                                                handleUpdate(bed, 'room_note', e.target.value);
                                            }
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                        {patients.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-slate-400">
                                    입원 중인 환자가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
