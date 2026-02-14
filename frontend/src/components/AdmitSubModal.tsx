'use client';

import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface AdmitSubModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomNumber: string;
    onAdmit: (name: string, birthday: string) => Promise<void>;
}

export function AdmitSubModal({ isOpen, onClose, roomNumber, onAdmit }: AdmitSubModalProps) {
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !birthday.trim()) {
            alert('이름과 생년월일을 입력해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            await onAdmit(name, birthday);
            onClose();
            setName('');
            setBirthday('');
        } catch (error) {
            console.error(error);
            alert('입원 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserPlus size={20} className="text-teal-600" />
                        입원 수속 ({roomNumber}호)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">환자 이름</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="이름 입력 (예: 김우주)"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">생년월일</label>
                        <input
                            type="text"
                            value={birthday}
                            onChange={e => setBirthday(e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? '처리 중...' : '입원 완료'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
