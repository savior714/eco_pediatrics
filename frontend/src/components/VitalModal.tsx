import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { NumberInput } from '@/components/ui/NumberInput';

interface VitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string;
    onSave: (temp: number, recordedAt: string) => { rollback: () => void };
}

import { toaster } from '@/components/ui/Toast';

export function VitalModal({ isOpen, onClose, admissionId, onSave }: VitalModalProps) {
    const [temp, setTemp] = useState('36.5');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!temp) return;

        const now = new Date().toISOString();
        const { rollback } = onSave(parseFloat(temp), now);

        onClose();
        // Reset to default
        setTemp('36.5');

        try {
            await api.post('/api/v1/vitals', {
                admission_id: admissionId,
                temperature: parseFloat(temp),
                has_medication: false,
                recorded_at: now
            });
            toaster.create({
                title: '체온 기록 완료',
                description: `${temp}°C 가 성공적으로 기록되었습니다.`,
                type: 'success'
            });
        } catch (error) {
            rollback();
            toaster.create({
                title: '저장 실패',
                description: '서버 오류로 인해 체온 저장에 실패했습니다.',
                type: 'error'
            });
            console.error(error);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="체온 입력"
            className="max-w-[280px]"
            elevation="nested"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <NumberInput
                    label="체온 (°C)"
                    value={temp}
                    onValueChange={(details) => setTemp(details.value)}
                    min={30}
                    max={45}
                    step={0.1}
                    placeholder="36.5"
                />

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !temp}
                        className="flex-1 py-3 text-sm font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-teal-100"
                    >
                        {submitting ? '저장 중...' : '저장'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
