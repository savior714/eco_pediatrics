import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Utensils, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { getNextThreeMealSlots } from '@/utils/dateUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MealRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string | null;
    currentMeals?: any[]; // Existing meals from props
    onSuccess?: () => void;
}

const PEDIATRIC_OPTIONS = ['일반식', '죽1', '죽2', '죽3'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

interface SlotState {
    pediatric: string;
    guardian: string;
}

export function MealRequestModal({ isOpen, onClose, admissionId, currentMeals = [], onSuccess }: MealRequestModalProps) {
    const slots = getNextThreeMealSlots();
    const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);

    // Independent state for each of the 3 slots
    const [selections, setSelections] = useState<Record<number, SlotState>>({
        0: { pediatric: '일반식', guardian: '선택 안함' },
        1: { pediatric: '일반식', guardian: '선택 안함' },
        2: { pediatric: '일반식', guardian: '선택 안함' }
    });

    const [initialSelections, setInitialSelections] = useState<Record<number, SlotState>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'SUCCESS' | 'ERROR' | null>(null);

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setSelectedSlotIdx(0);

            // Initialize from currentMeals if available
            const initial: Record<number, SlotState> = {};
            slots.forEach((slot, idx) => {
                const existing = currentMeals.find(m =>
                    m.meal_date === slot.date &&
                    m.meal_time === slot.meal_time
                );
                initial[idx] = {
                    pediatric: existing?.pediatric_meal_type || '일반식',
                    guardian: existing?.guardian_meal_type || '선택 안함'
                };
            });

            setSelections(initial);
            setInitialSelections(initial);
        }
    }, [isOpen, currentMeals]);

    const updateSelection = (field: keyof SlotState, value: string) => {
        setSelections(prev => ({
            ...prev,
            [selectedSlotIdx]: {
                ...prev[selectedSlotIdx],
                [field]: value
            }
        }));
    };

    const currentSelection = selections[selectedSlotIdx];

    const handleSubmit = async () => {
        if (!admissionId) return;

        // Check if anything actually changed
        const changedIdxs = slots.map((_, idx) => {
            const current = selections[idx];
            const initial = initialSelections[idx];
            const hasChanged = current.pediatric !== initial.pediatric || current.guardian !== initial.guardian;
            return hasChanged ? idx : -1;
        }).filter(idx => idx !== -1);

        if (changedIdxs.length === 0) {
            onClose(); // No changes, just close
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            // Submit only changed slots
            const promises = changedIdxs.map((idx) => {
                const slot = slots[idx];
                const sel = selections[idx];
                return fetch(`${API_BASE}/api/v1/meals/requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        admission_id: admissionId,
                        request_type: sel.pediatric === '일반식' ? 'GENERAL' : 'SOFT',
                        meal_date: slot.date,
                        meal_time: slot.meal_time,
                        pediatric_meal_type: sel.pediatric,
                        guardian_meal_type: sel.guardian,
                        room_note: ''
                    })
                });
            });

            const responses = await Promise.all(promises);
            if (responses.some(r => !r.ok)) throw new Error('Some meal requests failed');

            setResult('SUCCESS');
        } catch (error) {
            console.error(error);
            setResult('ERROR');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="식단 변경 신청">
            {result === 'SUCCESS' ? (
                <SuccessView onConfirm={() => { onSuccess?.(); }} />
            ) : (
                <div className="space-y-6">
                    {/* Slot Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                        {slots.map((slot, idx) => (
                            <button
                                key={slot.label}
                                onClick={() => setSelectedSlotIdx(idx)}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                                    selectedSlotIdx === idx
                                        ? "bg-white text-teal-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {slot.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-5">
                        {/* Pediatric Section */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                                <span className="w-1 h-3 bg-teal-500 rounded-full" />
                                환아 식사
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PEDIATRIC_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateSelection('pediatric', opt)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-[0.98]",
                                            currentSelection.pediatric === opt
                                                ? "bg-teal-50 border-teal-500 text-teal-700 font-extrabold"
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Guardian Section */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                                <span className="w-1 h-3 bg-teal-500 rounded-full" />
                                보호자 식사
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {GUARDIAN_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateSelection('guardian', opt)}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-[0.98]",
                                            currentSelection.guardian === opt
                                                ? "bg-teal-50 border-teal-500 text-teal-700 font-extrabold"
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {result === 'ERROR' && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={16} />
                            <span className="font-medium">요청 중 오류가 발생했습니다.</span>
                        </div>
                    )}

                    <button
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className={cn(
                            "w-full min-h-[52px] py-4 rounded-2xl font-bold text-white transition-all mt-2 touch-manipulation flex items-center justify-center gap-2 shadow-lg shadow-teal-100",
                            isLoading
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-teal-500 hover:bg-teal-600 active:scale-[0.98]"
                        )}
                    >
                        {isLoading ? '전송 중...' : (
                            <>
                                <Check size={18} />
                                변경 신청하기
                            </>
                        )}
                    </button>
                </div>
            )}
        </Modal>
    );
}

function SuccessView({ onConfirm }: { onConfirm: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 pb-2 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">신청 완료!</h3>
            <p className="text-slate-500 mt-2 font-medium">관리자 스테이션으로<br />식사 정보가 전송되었습니다.</p>
            <button
                type="button"
                onClick={onConfirm}
                className="mt-10 w-full min-h-[52px] py-3.5 rounded-2xl font-bold text-white bg-teal-500 hover:bg-teal-600 active:scale-[0.98] transition-all shadow-md shadow-teal-100 touch-manipulation uppercase tracking-wide"
            >
                확인
            </button>
        </div>
    );
}
