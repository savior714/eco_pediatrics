'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface DocumentRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string | null;
    onSuccess?: () => void;
}

const DOCUMENT_OPTIONS = [
    { id: 'RECEIPT', label: '진료비 계산서(영수증)' },
    { id: 'DETAIL', label: '진료비 세부내역서' },
    { id: 'CERT', label: '입퇴원확인서' },
    { id: 'DIAGNOSIS', label: '진단서' },
    { id: 'INITIAL', label: '초진기록지' }
];

export function DocumentRequestModal({ isOpen, onClose, admissionId, onSuccess }: DocumentRequestModalProps) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'SUCCESS' | 'ERROR' | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setResult(null);
            setSelectedItems([]);
        }
    }, [isOpen]);

    const toggleItem = (id: string) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(prev => prev.filter(i => i !== id));
        } else {
            setSelectedItems(prev => [...prev, id]);
        }
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0 || !admissionId) return;

        setIsLoading(true);
        setResult(null);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_BASE}/api/v1/documents/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_id: admissionId,
                    request_items: selectedItems
                })
            });

            if (!res.ok) throw new Error('Failed to request documents');

            setResult('SUCCESS');
            // setResult('SUCCESS'); // Already set above
        } catch (error) {
            console.error(error);
            setResult('ERROR');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="필요 서류 신청">
            {result === 'SUCCESS' ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">신청 완료!</h3>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                        신청하신 서류는 간호스테이션에서<br />
                        준비 후 전달해 드립니다.
                    </p>
                    <button type="button" onClick={() => { onSuccess?.(); onClose(); }} className="mt-6 w-full min-h-[48px] py-3 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 touch-manipulation">
                        확인
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        필요하신 서류를 모두 선택해주세요.<br />
                        <span className="text-xs text-orange-500">* 발급 비용이 발생할 수 있습니다.</span>
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto px-1">
                        {DOCUMENT_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleItem(option.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-4 min-h-[48px] rounded-xl border-2 transition-all text-left touch-manipulation active:scale-[0.99]",
                                    selectedItems.includes(option.id)
                                        ? "border-teal-500 bg-teal-50 text-teal-700"
                                        : "border-slate-100 active:border-slate-200 bg-white text-slate-600"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                    selectedItems.includes(option.id)
                                        ? "bg-teal-500 border-teal-500"
                                        : "border-slate-300"
                                )}>
                                    {selectedItems.includes(option.id) && <CheckCircle size={14} className="text-white" />}
                                </div>
                                <span className={cn("font-medium flex-1", selectedItems.includes(option.id) && "font-bold")}>
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {result === 'ERROR' && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            <span>요청 중 오류가 발생했습니다. 다시 시도해주세요.</span>
                        </div>
                    )}

                    <button
                        disabled={selectedItems.length === 0 || isLoading}
                        onClick={handleSubmit}
                        className={cn(
                            "w-full min-h-[48px] py-3.5 rounded-xl font-bold text-white transition-all mt-4 touch-manipulation",
                            selectedItems.length === 0 || isLoading
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-teal-500 hover:bg-teal-600 active:scale-[0.98] shadow-md shadow-teal-200"
                        )}
                    >
                        {isLoading ? '전송 중...' : `${selectedItems.length}건 신청하기`}
                    </button>
                </div>
            )}
        </Modal>
    );
}
