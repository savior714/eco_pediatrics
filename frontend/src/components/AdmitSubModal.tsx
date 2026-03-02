import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';

const PHYSICIANS = [
    { label: '조요셉', value: '조요셉' },
    { label: '김종률', value: '김종률' },
    { label: '원유종', value: '원유종' },
    { label: '이승주', value: '이승주' },
];

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

import { toaster } from '@/components/ui/Toast';

export function AdmitSubModal({ isOpen, onClose, roomNumber, onAdmit }: AdmitSubModalProps) {
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState(''); // YYYY-MM-DD
    const [gender, setGender] = useState<'M' | 'F' | ''>('M'); // Default to M
    const [attendingPhysician, setAttendingPhysician] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !birthday.trim()) {
            toaster.create({
                title: '입력 오류',
                description: '환자 이름과 생년월일을 입력해주세요.',
                type: 'error'
            });
            return;
        }
        if (!attendingPhysician) {
            toaster.create({
                title: '의료진 미선택',
                description: '담당 원장님을 지정해주세요.',
                type: 'error'
            });
            return;
        }
        setIsLoading(true);
        try {
            await onAdmit(name, birthday, gender, attendingPhysician);
            onClose();
            setName('');
            setBirthday('');
            setAttendingPhysician('');
            toaster.create({
                title: '입원 완료',
                description: `${roomNumber}호 ${name} 환자의 입원 수속이 완료되었습니다.`,
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            toaster.create({
                title: '입원 처리 실패',
                description: '서버 오류로 인해 입원 처리에 실패했습니다. 다시 시도해 주세요.',
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
            title={`입원 수속 (${roomNumber}호)`}
            className="sm:max-w-md"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <Field
                    label="환자 이름"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="이름 입력 (예: 김우주)"
                    autoFocus
                />

                <Field
                    label="생년월일"
                    value={birthday}
                    onChange={e => setBirthday(formatBirthdayInput(e.target.value))}
                    placeholder="YYYY-MM-DD (예: 20150630)"
                />

                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 ml-1">성별</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setGender('M')}
                            className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-all ${gender === 'M' ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            남아 (M)
                        </button>
                        <button
                            type="button"
                            onClick={() => setGender('F')}
                            className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-all ${gender === 'F' ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            여아 (F)
                        </button>
                    </div>
                </div>

                <Select
                    label="담당 원장님"
                    options={PHYSICIANS}
                    value={[attendingPhysician]}
                    onValueChange={(val) => setAttendingPhysician(val[0])}
                    placeholder="원장님 선택"
                />

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold text-lg hover:bg-teal-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
                    >
                        {isLoading ? '처리 중...' : '입원 완료'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
