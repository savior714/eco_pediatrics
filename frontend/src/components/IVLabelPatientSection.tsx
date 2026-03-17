import React from 'react';
import { Bed } from '@/types/domain';
import { Field } from './ui/Field';

/** 
 * 환자 정보 섹션 Props 인터페이스 
 */
interface IVLabelPatientSectionProps {
    /** 환자 침대 정보 */
    bed: Bed;
    /** 포맷팅된 나이/성별 문자열 */
    ageGender: string;
    /** 환자 고유 번호 (PID) */
    patientId: string;
    /** PID 변경 핸들러 */
    onPatientIdChange: (id: string) => void;
    /** 수동 입력 성명 */
    manualName: string;
    /** 성명 변경 핸들러 */
    onManualNameChange: (name: string) => void;
}

/**
 * 수액 라벨 인쇄를 위한 환자 인적 사항 입력 섹션 컴포넌트.
 * 모달 좌측 최상단에 위치하며 침대 정보 확인 및 PID/성명 입력을 담당한다.
 */
export function IVLabelPatientSection({
    bed,
    ageGender,
    patientId,
    onPatientIdChange,
    manualName,
    onManualNameChange,
}: IVLabelPatientSectionProps) {
    return (
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-[#2D4B3E] rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">환자 인적 사항</h3>
            </div>
            
            <div className="grid grid-cols-12 gap-5 items-end">
                {/* 침대 및 환자 정보 요약 */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 ml-1">
                            BED / S / A
                        </label>
                        <div className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 truncate flex items-center shadow-inner">
                            {bed.room}호 / {ageGender}
                        </div>
                    </div>
                </div>

                {/* 환자 번호 (PID) 입력 */}
                <div className="col-span-6 lg:col-span-4">
                    <Field
                        label="환자번호 (PID)"
                        value={patientId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 6) onPatientIdChange(val);
                        }}
                        inputMode="numeric"
                        placeholder="000000"
                    />
                </div>

                {/* 수동 성명 입력 */}
                <div className="col-span-6 lg:col-span-4">
                    <Field
                        label="성명 (수동)"
                        value={manualName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onManualNameChange(e.target.value)}
                        placeholder="환자 성명"
                    />
                </div>
            </div>
        </section>
    );
}
