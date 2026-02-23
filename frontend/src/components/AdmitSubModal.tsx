'use client';

import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

import Portal from './common/Portal';

const PHYSICIANS = ['조요셉', '김종률', '원유종', '이승주'];

/** 생년월일 입력: 숫자만 허용, 8자리 시 YYYY-MM-DD로 포맷 */
function formatBirthdayInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length === 8) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    return digits;
}

interface AdmitSubModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomNumber: string;
    onAdmit: (name: string, birthday: string, gender: string, attendingPhysician: string) => Promise<void>;
}

export function AdmitSubModal({ isOpen, onClose, roomNumber, onAdmit }: AdmitSubModalProps) {
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
    const [gender, setGender] = useState<'M' | 'F' | ''>('M'); // Default to M
    const [attendingPhysician, setAttendingPhysician] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !birthday.trim()) {
            alert('이름과 생년월일을 입력해주세요.');
            return;
        }
        if (!attendingPhysician) {
            alert('원장님을 지정해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            await onAdmit(name, birthday, gender, attendingPhysician);
            onClose();
            setName('');
            setBirthday('');
            setAttendingPhysician('');
        } catch (error) {
            console.error(error);
            alert('입원 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen" onClick={(e) => e.stopPropagation()}>
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                />
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10 border border-slate-200 animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <UserPlus size={20} className="text-teal-600" />
                            입원 수속 ({roomNumber}호)
                        </h3>
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 ml-1">환자 이름</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="이름 입력 (예: 김우주)"
                                className="w-full p-3.5 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-medium text-slate-700"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 ml-1">생년월일</label>
                            <input
                                type="text"
                                value={birthday}
                                onChange={e => setBirthday(formatBirthdayInput(e.target.value))}
                                placeholder="YYYY-MM-DD (예: 20150630)"
                                className="w-full p-3.5 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-medium text-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 ml-1">성별</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setGender('M')}
                                    className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-all ${gender === 'M' ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border-slate-100'}`}
                                >
                                    남아 (M)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGender('F')}
                                    className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-all ${gender === 'F' ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white text-slate-400 border-slate-100'}`}
                                >
                                    여아 (F)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 ml-1">담당 원장님</label>
                            <select
                                value={attendingPhysician}
                                onChange={e => setAttendingPhysician(e.target.value)}
                                className="w-full p-3.5 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-medium text-slate-700"
                            >
                                <option value="">선택</option>
                                {PHYSICIANS.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                            >
                                {isLoading ? '처리 중...' : '입원 완료'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}
