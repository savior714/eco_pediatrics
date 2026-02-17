import React, { useState } from 'react';
import { api } from '@/lib/api';

interface VitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    onSuccess: (temp: number, recordedAt: string) => void;
}

export function VitalModal({ isOpen, onClose, admissionId, onSuccess }: VitalModalProps) {
    const [temp, setTemp] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!temp) return;

        setSubmitting(true);
        const now = new Date().toISOString();
        try {
            await api.post('/api/v1/vitals', {
                admission_id: admissionId,
                temperature: parseFloat(temp),
                has_medication: false, // Default to false for quick input
                recorded_at: now
            });
            onSuccess(parseFloat(temp), now);
            onClose();
            setTemp('');
        } catch (error) {
            alert('체온 저장 실패');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs z-10 p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4">체온 입력</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">체온 (°C)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={temp}
                            onChange={(e) => setTemp(e.target.value)}
                            className="w-full text-lg p-2 border rounded-lg text-center font-bold"
                            placeholder="36.5"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !temp}
                            className="flex-1 py-2 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
