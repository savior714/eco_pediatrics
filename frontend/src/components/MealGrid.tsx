'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Bed } from '@/types/domain';
import { useStation } from '@/hooks/useStation';

interface MealGridProps { }

// Maps for dropdowns/display
const PEDIATRIC_OPTIONS = ['일반식', '연식(죽)', '미음', '금식'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

export function MealGrid({ }: MealGridProps) {
    const { beds } = useStation();
    const [loading, setLoading] = useState(false);

    // Filter only occupied beds
    const patients = beds.filter(b => b.id && b.name);

    return (
        <div className="bg-white rounded-xl shadow p-4 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">식단 현황 (실시간)</h2>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>실시간 업데이트 중</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-xl">
                <table className="w-full text-sm text-left rtl:text-right text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 border-b">병실</th>
                            <th scope="col" className="px-6 py-3 border-b">환자명</th>
                            <th scope="col" className="px-6 py-3 border-b">환아식</th>
                            <th scope="col" className="px-6 py-3 border-b">보호자식</th>
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
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${bed.latest_meal?.pediatric_meal_type ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {bed.latest_meal?.pediatric_meal_type || '미신청'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${bed.latest_meal?.guardian_meal_type === 'GENERAL' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {bed.latest_meal?.guardian_meal_type || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-slate-600 text-xs">
                                        {bed.latest_meal?.room_note || '-'}
                                    </span>
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
