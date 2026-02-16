import React, { useState } from 'react';
import { X, Check, Calendar } from 'lucide-react';

interface AddExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (examData: { name: string; date: string; timeOfDay: 'am' | 'pm' }) => Promise<void>;
}

import { EXAM_TYPE_OPTIONS } from '@/constants/mappings';

export function AddExamModal({ isOpen, onClose, onSave }: AddExamModalProps) {
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeOfDay, setTimeOfDay] = useState<'am' | 'pm'>('am');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            setError('검사 항목을 선택해주세요.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            await onSave({ name, date, timeOfDay });
            setName('');
            onClose();
        } catch (err) {
            console.error(err);
            setError('일정 저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-[1.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-100 text-violet-600 rounded-xl">
                            <Calendar size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">검사 일정 등록</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">날짜 선택</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">시간대</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTimeOfDay('am')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${timeOfDay === 'am' ? 'border-violet-500 bg-violet-50 text-violet-700 font-extrabold' : 'border-slate-100 bg-white text-slate-400'}`}
                            >
                                오전
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimeOfDay('pm')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${timeOfDay === 'pm' ? 'border-violet-500 bg-violet-50 text-violet-700 font-extrabold' : 'border-slate-100 bg-white text-slate-400'}`}
                            >
                                오후
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">검사 항목</label>
                        <select
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-500 transition-all cursor-pointer appearance-none"
                        >
                            <option value="">검사 선택</option>
                            {EXAM_TYPE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3.5 bg-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 hover:bg-violet-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
