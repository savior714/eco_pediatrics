import React from 'react';
import { Edit2, Droplets } from 'lucide-react';
import { Bed, MealRequest, LastUploadedIv } from '@/types/domain';
import { getNextThreeMealSlots } from '@/utils/dateUtils';
import { IVUploadForm } from '../IVUploadForm';

interface VitalStatusGridProps {
    bed: Bed;
    displayTemp: number | null;
    displayVitalTime: string | null;
    meals: MealRequest[];
    lastUploadedIv?: LastUploadedIv | null;
    onVitalModalOpen: () => void;
    onEditMeal: (config: { label: string; date: string; meal_time: string; pediatric: string; guardian: string; mealId: number }) => void;
    onIVUploadSuccess?: (rate?: number) => void;
}

export function VitalStatusGrid({
    bed,
    displayTemp,
    displayVitalTime,
    meals,
    lastUploadedIv,
    onVitalModalOpen,
    onEditMeal,
    onIVUploadSuccess
}: VitalStatusGridProps) {

    const getTempBorderColor = () => {
        if (!displayVitalTime) return 'border-slate-200';
        const hours = (Date.now() - new Date(displayVitalTime).getTime()) / (1000 * 60 * 60);
        if (hours >= 4) return 'border-red-500 ring-4 ring-red-100';
        if (hours >= 2) return 'border-orange-400 ring-4 ring-orange-100';
        return 'border-slate-200';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mt-4">
            <div className="lg:col-span-7">
                <div className="grid grid-cols-5 gap-2 h-full">
                    <button
                        onClick={onVitalModalOpen}
                        className={`col-span-1 bg-white rounded-[1.2rem] border-[1.5px] ${displayVitalTime && (Date.now() - new Date(displayVitalTime).getTime()) / 3600000 >= 2 ? getTempBorderColor() : 'border-slate-200'} shadow-sm flex flex-col justify-center items-center hover:bg-slate-50 transition-all py-1.5 px-1`}
                    >
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">체온</span>
                        <div className="flex items-center gap-0.5">
                            <span className={`text-lg font-bold ${displayTemp !== null && displayTemp >= 38.0 ? 'text-red-500' : 'text-slate-700'}`}>
                                {displayTemp !== null ? displayTemp.toFixed(1) : '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1">°C</span>
                        </div>
                    </button>

                    <div className="col-span-1 bg-white rounded-[1.2rem] border-[1.5px] border-slate-200 shadow-sm flex flex-col justify-center items-center py-1.5 px-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">속도</span>
                        <div className="flex items-center gap-0.5">
                            <span className="text-lg font-bold text-slate-700">{bed.drops ?? '-'}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1">cc/hr</span>
                        </div>
                    </div>

                    {getNextThreeMealSlots().map((slot, index) => {
                        const meal = meals.find(m => m.meal_date === slot.date && m.meal_time === slot.meal_time);
                        return (
                            <div key={`meal-slot-${slot.label}-${index}`} className="col-span-1 bg-white rounded-[1.2rem] border-[1.5px] border-slate-200 shadow-sm flex flex-col justify-center items-center relative group/meal py-1.5 px-1">
                                <button
                                    onClick={() => meal?.id && onEditMeal({
                                        ...slot,
                                        mealId: meal.id,
                                        pediatric: meal?.pediatric_meal_type || '선택 안함',
                                        guardian: meal?.guardian_meal_type || '선택 안함'
                                    })}
                                    className="absolute top-1 right-1 p-1 text-slate-300 hover:text-slate-500 rounded-full hover:bg-slate-50 transition-colors opacity-0 group-hover/meal:opacity-100"
                                    title={`${slot.label} 식사 수정`}
                                >
                                    <Edit2 size={10} />
                                </button>
                                <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-tight">{slot.label}</span>
                                <div className={`text-[11px] font-bold text-slate-700 flex flex-col items-center leading-tight gap-0.5 ${meal?.isOptimistic ? 'opacity-50' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <span>{meal?.pediatric_meal_type || (meal ? '일반식' : '환아식 미신청')}</span>
                                        {meal?.status === 'PENDING' && meal.requested_pediatric_meal_type && meal.requested_pediatric_meal_type !== meal.pediatric_meal_type && (
                                            <span className="text-[9px] text-orange-500 font-medium">→ {meal.requested_pediatric_meal_type} (신청됨)</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span>{meal?.guardian_meal_type || (meal ? '신청 안함' : '보호자식 미신청')}</span>
                                        {meal?.status === 'PENDING' && meal.requested_guardian_meal_type && meal.requested_guardian_meal_type !== meal.guardian_meal_type && (
                                            <span className="text-[9px] text-orange-500 font-medium">→ {meal.requested_guardian_meal_type} (신청됨)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="lg:col-span-5 h-full">
                <div className="bg-white px-4 py-2 rounded-[1.5rem] border-[1.5px] border-slate-200 shadow-sm relative group/iv h-full flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-sky-50 text-sky-500 rounded-full">
                                <Droplets size={14} />
                            </div>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                IV 수액 속도 기록
                            </h3>
                        </div>
                    </div>
                    <IVUploadForm
                        admissionId={bed.id}
                        patientName={bed.name}
                        token={bed.token}
                        onUploadSuccess={(rate) => onIVUploadSuccess?.(rate)}
                        lastUploadedIv={lastUploadedIv}
                    />
                </div>
            </div>
        </div>
    );
}
