import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface EditMealModalProps {
    isOpen: boolean;
    onClose: () => void;
    label: string;
    date: string;
    mealTime: string;
    currentPediatric: string;
    currentGuardian: string;
    onSave: (pediatric: string, guardian: string) => Promise<void>;
}

const PEDIATRIC_OPTIONS = ['일반식', '죽1', '죽2', '죽3'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

export function EditMealModal({
    isOpen,
    onClose,
    label,
    date,
    mealTime,
    currentPediatric,
    currentGuardian,
    onSave
}: EditMealModalProps) {
    const [pediatric, setPediatric] = useState(currentPediatric);
    const [guardian, setGuardian] = useState(currentGuardian);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSave(pediatric, guardian);
            onClose();
        } catch (error) {
            console.error(error);
            alert('저장 실패');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div className="bg-white rounded-[1.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{label} 식사 수정</h3>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{date} / {mealTime}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                            환아 식사
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PEDIATRIC_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setPediatric(opt)}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${pediatric === opt ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                            보호자 식사
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {GUARDIAN_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setGuardian(opt)}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${guardian === opt ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? '저장 중...' : (
                                <>
                                    <Check size={18} />
                                    저장하기
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
