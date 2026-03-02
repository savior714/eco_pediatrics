import React, { useState } from 'react';
import { ROOM_NUMBERS } from '@/constants/mappings';
import { Modal } from './ui/Modal';
import { ArrowRight } from 'lucide-react';
import { toaster } from './ui/Toast';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRoom: string;
    onTransfer: (targetRoom: string) => Promise<void>;
}

export function TransferModal({ isOpen, onClose, currentRoom, onTransfer }: TransferModalProps) {
    const [targetRoom, setTargetRoom] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRoom) {
            toaster.create({
                title: '알림',
                description: '이동할 병실을 선택해주세요.',
                type: 'error'
            });
            return;
        }
        if (targetRoom === currentRoom) {
            toaster.create({
                title: '알림',
                description: '현재 병실과 동일합니다.',
                type: 'error'
            });
            return;
        }

        if (!confirm(`${currentRoom}호 -> ${targetRoom}호로 이동하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            await onTransfer(targetRoom);
            onClose();
            toaster.create({
                title: '성공',
                description: `${targetRoom}호로 이동되었습니다.`,
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            toaster.create({
                title: '실패',
                description: '전실 처리 실패 (이미 사용 중인 병실일 수 있습니다)',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="병실 이동 (전실)"
            elevation="nested"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex items-center justify-center gap-4 bg-slate-50 py-4 rounded-xl border border-slate-100">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">현재</p>
                        <span className="text-xl font-extrabold text-slate-700">{currentRoom}호</span>
                    </div>
                    <ArrowRight className="text-slate-300" size={24} />
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">이동</p>
                        <span className="text-xl font-extrabold text-blue-600">{targetRoom || '?'}호</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">이동할 병실 선택</label>
                    <select
                        value={targetRoom}
                        onChange={e => setTargetRoom(e.target.value)}
                        className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-white text-slate-700 font-medium"
                    >
                        <option value="">병실을 선택해 주세요</option>
                        {ROOM_NUMBERS.filter(r => r !== currentRoom).map(r => (
                            <option key={r} value={r}>{r}호</option>
                        ))}
                    </select>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || !targetRoom}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                        {isLoading ? '처리 중...' : '이동 완료'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
