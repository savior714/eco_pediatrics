'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { Bed, MealRequest } from '@/types/domain';

interface MealGridProps {
    beds: Bed[];
}

const PEDIATRIC_OPTIONS = ['일반식', '죽1', '죽2', '죽3', '선택 안함'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

// Helper to format date "YYYY-MM-DD"
const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper for display "MM/DD (Mon)"
const formatDisplayDate = (d: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

export function MealGrid({ beds }: MealGridProps) {
    const [activeDate, setActiveDate] = useState<Date>(new Date());
    // Map: admissionId -> { BREAKFAST: MealRequest, LUNCH: MealRequest, ... }
    const [matrix, setMatrix] = useState<Record<string, Record<string, MealRequest>>>({});
    const [loading, setLoading] = useState(false);

    // Filter occupied beds
    const patients = useMemo(() => beds.filter(b => b.id && b.name), [beds]);
    // Generate tabs (Today, Tomorrow, D+2)
    const tabs = [0, 1, 2].map(offset => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d;
    });

    const fetchMatrix = useCallback(async () => {
        setLoading(true);
        try {
            const dateStr = formatDate(activeDate);
            const res = await api.get(`/api/v1/meals/matrix?target_date=${dateStr}`);

            const map: Record<string, Record<string, MealRequest>> = {};
            // Initialize map for all patients to avoid lookup errors
            patients.forEach(p => { if (p.id) map[p.id] = {} });

            if (Array.isArray(res)) {
                res.forEach((req: MealRequest) => {
                    if (req.admission_id && req.meal_time) {
                        if (!map[req.admission_id]) map[req.admission_id] = {};
                        map[req.admission_id][req.meal_time] = req;
                    }
                });
            }
            setMatrix(map);
        } catch (e) {
            console.error("Fetch Matrix Error", e);
        } finally {
            setLoading(false);
        }
    }, [activeDate, patients]);

    useEffect(() => {
        fetchMatrix();
    }, [activeDate, fetchMatrix]); // Added fetchMatrix to dependency array for correctness

    const handleUpdate = async (
        bed: Bed,
        mealTime: string,
        field: keyof MealRequest,
        value: string
    ) => {
        if (!bed.id) return;

        // Current state for this specific slot
        const currentReq = matrix[bed.id]?.[mealTime] || {};

        // Optimistic UI
        setMatrix(prev => ({
            ...prev,
            [bed.id]: {
                ...prev[bed.id],
                [mealTime]: { ...currentReq, [field]: value } as MealRequest
            }
        }));

        try {
            const payload = {
                admission_id: bed.id,
                request_type: 'STATION_UPDATE',
                meal_date: formatDate(activeDate),
                meal_time: mealTime,
                pediatric_meal_type: field === 'pediatric_meal_type' ? value : (currentReq.pediatric_meal_type || '선택 안함'),
                guardian_meal_type: field === 'guardian_meal_type' ? value : (currentReq.guardian_meal_type || '선택 안함'),
                room_note: field === 'room_note' ? value : (currentReq.room_note || '')
            };
            await api.post('/api/v1/meals/requests', payload);
        } catch (e) {
            console.error("Update Failed", e);
            alert('저장 실패');
            fetchMatrix(); // Revert
        }
    };

    // Render Cell Helper
    const renderCell = (bed: Bed, time: string, type: 'child' | 'guardian') => {
        if (!bed.id) return null;
        const req = matrix[bed.id]?.[time];
        const value = type === 'child'
            ? (req?.pediatric_meal_type || '선택 안함')
            : (req?.guardian_meal_type || '선택 안함');

        const requestedValue = type === 'child'
            ? req?.requested_pediatric_meal_type
            : req?.requested_guardian_meal_type;

        const isPending = req?.status === 'PENDING' && requestedValue && requestedValue !== value;

        const options = type === 'child' ? PEDIATRIC_OPTIONS : GUARDIAN_OPTIONS;

        return (
            <td className={`p-0 border border-slate-300 h-[32px] relative ${isPending ? 'bg-orange-50' : ''}`}>
                <div className="flex items-center h-full">
                    <select
                        className={`flex-1 h-full text-center bg-transparent border-none text-xs focus:ring-inset focus:ring-1 focus:ring-blue-500 cursor-pointer ${value !== '선택 안함' ? 'font-bold text-slate-800' : 'text-slate-400'}`}
                        value={value}
                        onChange={(e) => handleUpdate(bed, time, type === 'child' ? 'pediatric_meal_type' : 'guardian_meal_type', e.target.value)}
                    >
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>

                    {isPending && (
                        <button
                            title={`환자 신청: ${requestedValue}`}
                            onClick={() => handleUpdate(bed, time, type === 'child' ? 'pediatric_meal_type' : 'guardian_meal_type', requestedValue)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-orange-600 shadow-sm z-10 animate-pulse"
                        >
                            !
                        </button>
                    )}
                </div>
            </td>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow p-4 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-end mb-2">
                <div className="flex gap-1">
                    {tabs.map((t, i) => {
                        const isSelected = formatDate(t) === formatDate(activeDate);
                        return (
                            <button
                                key={i}
                                onClick={() => setActiveDate(t)}
                                className={`px-4 py-2 rounded-t-lg text-sm font-bold border-t border-x transition-colors ${isSelected ? 'bg-white border-slate-300 text-teal-700 z-10 -mb-[1px]' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}
                            >
                                {formatDisplayDate(t)}
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2 items-center mb-1">
                    <button
                        onClick={async () => {
                            if (!window.confirm(`[Dev] ${formatDisplayDate(activeDate)}의 모든 환자 식단을 생성할까요?`)) return;
                            try {
                                await api.post(`/api/v1/dev/seed-meals?target_date=${formatDate(activeDate)}`, {});
                                fetchMatrix();
                                alert('식단 생성 완료');
                            } catch (e) {
                                alert('생성 실패');
                            }
                        }}
                        className="px-3 py-1.5 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-bold"
                    >
                        식단 일괄 생성 (Dev)
                    </button>
                    <div className="text-xs text-slate-400">
                        {loading ? '로딩중...' : '자동 저장됨'}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-300 relative bg-white">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-2 py-1.5 border border-slate-300 text-center w-[60px]" rowSpan={2}>병실</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-center w-[80px]" rowSpan={2}>환자명</th>
                            <th className="px-1 py-1 border border-slate-300 text-center" colSpan={2}>아침</th>
                            <th className="px-1 py-1 border border-slate-300 text-center" colSpan={2}>점심</th>
                            <th className="px-1 py-1 border border-slate-300 text-center" colSpan={2}>저녁</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-center min-w-[150px]" rowSpan={2}>비고</th>
                        </tr>
                        <tr>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">환아</th>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">보호자</th>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">환아</th>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">보호자</th>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">환아</th>
                            <th className="px-1 py-1 border border-slate-300 text-center w-[90px] bg-slate-50">보호자</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map((bed) => (
                            <tr key={bed.room} className="hover:bg-blue-50 transition-colors">
                                <td className="px-2 py-1 border border-slate-300 text-center font-bold bg-slate-50">{bed.room}</td>
                                <td className="px-2 py-1 border border-slate-300 text-center font-bold text-slate-900">{bed.name}</td>

                                {renderCell(bed, 'BREAKFAST', 'child')}
                                {renderCell(bed, 'BREAKFAST', 'guardian')}

                                {renderCell(bed, 'LUNCH', 'child')}
                                {renderCell(bed, 'LUNCH', 'guardian')}

                                {renderCell(bed, 'DINNER', 'child')}
                                {renderCell(bed, 'DINNER', 'guardian')}

                                <td className="p-0 border border-slate-300 h-[32px]">
                                    <input
                                        type="text"
                                        className="w-full h-full px-2 bg-transparent border-none text-xs focus:ring-inset focus:ring-1 focus:ring-blue-500"
                                        placeholder="-"
                                        defaultValue={matrix[bed.id]?.['LUNCH']?.room_note || ''}
                                        // Using LUNCH as the 'main' note carrier as decided
                                        onBlur={(e) => {
                                            const oldVal = matrix[bed.id]?.['LUNCH']?.room_note || '';
                                            if (e.target.value !== oldVal) {
                                                handleUpdate(bed, 'LUNCH', 'room_note', e.target.value);
                                            }
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                        {patients.length === 0 && (
                            <tr>
                                <td colSpan={9} className="text-center py-10 text-slate-400 border border-slate-300">
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
