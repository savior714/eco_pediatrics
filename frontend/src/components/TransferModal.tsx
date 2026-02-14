'use client';

import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { ROOM_NUMBERS } from '@/constants/mappings';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRoom: string;
    onTransfer: (targetRoom: string) => Promise<void>;
}

export function TransferModal({ isOpen, onClose, currentRoom, onTransfer }: TransferModalProps) {
    const [targetRoom, setTargetRoom] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRoom) {
            alert('이동할 병실을 선택해주세요.');
            return;
        }
        if (targetRoom === currentRoom) {
            alert('현재 병실과 동일합니다.');
            return;
        }

        if (!confirm(`${currentRoom}호 -> ${targetRoom}호로 이동하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            await onTransfer(targetRoom);
            onClose();
        } catch (error) {
            console.error(error);
            alert('전실 처리 실패 (이미 사용 중인 병실일 수 있습니다)');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ArrowRight size={20} className="text-blue-600" />
                        병실 이동 (전실)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="text-center mb-2">
                        <span className="text-xl font-bold text-slate-700">{currentRoom}호</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-xl font-bold text-blue-600">{targetRoom || '?'}호</span>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">이동할 병실 선택</label>
                        <select
                            value={targetRoom}
                            onChange={e => setTargetRoom(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                        >
                            <option value="">병실 선택</option>
                            {ROOM_NUMBERS.filter(r => r !== currentRoom).map(r => (
                                <option key={r} value={r}>{r}호</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || !targetRoom}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '이동 중...' : '이동 완료'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
