import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Check } from 'lucide-react';
import { toaster } from './ui/Toast';

interface EditMealModalProps {
    isOpen: boolean;
    onClose: () => void;
    label: string;
    date: string;
    mealTime: string;
    mealId: number;
    currentPediatric: string;
    currentGuardian: string;
    onSave: (mealId: number, pediatric: string, guardian: string) => { rollback: () => void };
    onApiSave: (pediatric: string, guardian: string) => Promise<void>;
}

const PEDIATRIC_OPTIONS = ['일반식', '죽1', '죽2', '죽3'];
const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

export function EditMealModal({
    isOpen,
    onClose,
    label,
    date,
    mealTime,
    mealId,
    currentPediatric,
    currentGuardian,
    onSave,
    onApiSave
}: EditMealModalProps) {
    const [pediatric, setPediatric] = useState(currentPediatric);
    const [guardian, setGuardian] = useState(currentGuardian);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { rollback } = onSave(mealId, pediatric, guardian);
        onClose();

        try {
            await onApiSave(pediatric, guardian);
            toaster.create({
                title: '성공',
                description: `${label} 식사가 수정되었습니다.`,
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            rollback();
            toaster.create({
                title: '실패',
                description: '식사 수정 중 오류가 발생했습니다.',
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${label} 식사 수정`}
            elevation="nested"
        >
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6 -mt-2 px-1">
                {date} / {mealTime}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                        환아 식사
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {PEDIATRIC_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setPediatric(opt)}
                                className={`px-3 py-3 rounded-xl text-xs font-bold border-2 transition-all ${pediatric === opt ? 'bg-teal-50 border-teal-500 text-teal-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1">
                        보호자 식사
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {GUARDIAN_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setGuardian(opt)}
                                className={`px-3 py-3 rounded-xl text-xs font-bold border-2 transition-all ${guardian === opt ? 'bg-teal-50 border-teal-500 text-teal-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
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
                        className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-4 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
        </Modal>
    );
}
