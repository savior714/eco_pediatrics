import React, { useState } from 'react';
import { api } from '@/lib/api';

import Portal from './common/Portal';

interface VitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    onSave: (temp: number, recordedAt: string) => { rollback: () => void };
}

export function VitalModal({ isOpen, onClose, admissionId, onSave }: VitalModalProps) {
    const [temp, setTemp] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!temp) return;

        const now = new Date().toISOString();
        const { rollback } = onSave(parseFloat(temp), now);

        onClose();
        setTemp('');

        try {
            await api.post('/api/v1/vitals', {
                admission_id: admissionId,
                temperature: parseFloat(temp),
                has_medication: false,
                recorded_at: now
            });
        } catch (error) {
            rollback();
            alert('체온 저장 실패. 다시 시도해주세요.');
            console.error(error);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                />
                <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-xs z-10 p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-4">체온 입력</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">체온 (°C)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={temp}
                                onChange={(e) => setTemp(e.target.value)}
                                className="w-full text-lg p-3 border-2 border-slate-100 rounded-lg text-center font-bold focus:border-blue-500 outline-none"
                                placeholder="36.5"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !temp}
                                className="flex-1 py-3 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                                {submitting ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}
