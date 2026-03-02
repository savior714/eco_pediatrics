import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Check, Calendar } from 'lucide-react';
import { toaster } from './ui/Toast';
import { EXAM_TYPE_OPTIONS } from '@/constants/mappings';

interface AddExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (examData: { name: string; date: string; timeOfDay: 'am' | 'pm' }) => { rollback: () => void };
    onApiSave: (examData: { name: string; date: string; timeOfDay: 'am' | 'pm' }) => Promise<void>;
}

export function AddExamModal({ isOpen, onClose, onSave, onApiSave }: AddExamModalProps) {
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toaster.create({
                title: '알림',
                description: '검사 항목을 선택해주세요.',
                type: 'error'
            });
            return;
        }

        const examData = { name, date, timeOfDay };
        const { rollback } = onSave(examData);

        onClose();
        setName('');

        try {
            await onApiSave(examData);
            toaster.create({
                title: '성공',
                description: '검사 일정이 등록되었습니다.',
                type: 'success'
            });
        } catch (err) {
            console.error(err);
            rollback();
            toaster.create({
                title: '실패',
                description: '일정 저장에 실패했습니다.',
                type: 'error'
            });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="검사 일정 등록"
            elevation="nested"
        >
            <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">날짜 선택</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">시간대</label>
                    <div className="flex gap-2">
                        {(['am', 'pm'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setTimeOfDay(type)}
                                className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-all ${timeOfDay === type
                                    ? 'border-violet-500 bg-violet-50 text-violet-700 font-extrabold'
                                    : 'border-slate-100 bg-white text-slate-400'
                                    }`}
                            >
                                {type === 'am' ? '오전' : '오후'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">검사 항목</label>
                    <div className="relative">
                        <select
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 transition-all cursor-pointer appearance-none"
                        >
                            <option value="">검사 선택</option>
                            {EXAM_TYPE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Calendar size={16} />
                        </div>
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
                        className="flex-1 py-4 bg-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
