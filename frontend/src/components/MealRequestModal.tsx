import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Utensils, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MealRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    admissionId: string | null;
}

type MealType = 'GENERAL' | 'SOFT' | 'NPO';

export function MealRequestModal({ isOpen, onClose, admissionId }: MealRequestModalProps) {
    const [selectedType, setSelectedType] = useState<MealType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'SUCCESS' | 'ERROR' | null>(null);

    const handleSubmit = async () => {
        if (!selectedType || !admissionId) return;

        setIsLoading(true);
        setResult(null);

        try {
            const res = await fetch('http://localhost:8000/api/v1/meals/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_id: admissionId,
                    request_type: selectedType
                })
            });

            if (!res.ok) throw new Error('Failed to request meal');

            setResult('SUCCESS');
            setTimeout(() => {
                onClose();
                setResult(null);
                setSelectedType(null);
            }, 1500);
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
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">신청 완료!</h3>
                    <p className="text-slate-500 mt-2">간호사 스테이션으로 전송되었습니다.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        변경하실 식단을 선택해주세요. <br />
                        <span className="text-xs text-orange-500">* 치료식(당뇨/신장 등)은 의료진과 상담이 필요합니다.</span>
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <OptionButton
                            label="일반식 (General)"
                            active={selectedType === 'GENERAL'}
                            onClick={() => setSelectedType('GENERAL')}
                            icon="🍚"
                        />
                        <OptionButton
                            label="죽 (Soft Diet)"
                            active={selectedType === 'SOFT'}
                            onClick={() => setSelectedType('SOFT')}
                            icon="🥣"
                        />
                        <OptionButton
                            label="금식 (NPO)"
                            active={selectedType === 'NPO'}
                            onClick={() => setSelectedType('NPO')}
                            icon="🚫"
                            danger
                        />
                    </div>

                    {result === 'ERROR' && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            <span>요청 중 오류가 발생했습니다. 다시 시도해주세요.</span>
                        </div>
                    )}

                    <button
                        disabled={!selectedType || isLoading}
                        onClick={handleSubmit}
                        className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-white transition-all mt-4",
                            !selectedType || isLoading
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-teal-500 hover:bg-teal-600 active:scale-95 shadow-md shadow-teal-200"
                        )}
                    >
                        {isLoading ? '전송 중...' : '신청하기'}
                    </button>
                </div>
            )}
        </Modal>
    );
}

function OptionButton({ label, active, onClick, icon, danger }: { label: string, active: boolean, onClick: () => void, icon: string, danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                active
                    ? danger ? "border-red-500 bg-red-50 text-red-700" : "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-100 hover:border-slate-200 bg-white text-slate-600"
            )}
        >
            <span className="text-2xl">{icon}</span>
            <span className={cn("font-bold flex-1", active && "text-lg")}>{label}</span>
            {active && <CheckCircle size={20} className={danger ? "text-red-500" : "text-teal-500"} />}
        </button>
    );
}
