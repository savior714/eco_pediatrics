import React from 'react';
import { X } from 'lucide-react';
import { Bed } from '@/types/domain';
import { formatPatientDemographics } from '@/utils/dateUtils';

interface PatientDetailHeaderProps {
    bed: Bed;
    onClose: () => void;
    onDischarge: () => Promise<void>;
    onTransfer: () => void;
    onSeedData: () => Promise<void>;
}

export function PatientDetailHeader({ bed, onClose, onDischarge, onTransfer, onSeedData }: PatientDetailHeaderProps) {
    return (
        <div className={`px-8 py-6 shrink-0 ${bed.status === 'fever' ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-100`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{bed.name}</h2>
                    <span className="text-xl text-slate-300 font-light">/</span>
                    <p className="text-slate-500 font-bold text-base mt-1">{bed.room}호</p>
                    {bed.dob && (
                        <span className={`text-base mt-1 ml-2 font-bold ${bed.gender === 'M' ? 'text-blue-500' : bed.gender === 'F' ? 'text-rose-500' : 'text-slate-500'}`}>
                            {formatPatientDemographics(bed.dob, bed.gender)}
                        </span>
                    )}
                    {bed.status === 'fever' && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                            고열 주의
                        </span>
                    )}
                </div>
                <div className="flex gap-2 -mt-1">
                    <button
                        onClick={onDischarge}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${bed.status === 'fever'
                                ? 'bg-white border-red-200 text-red-600 hover:bg-red-600 hover:text-white'
                                : 'bg-red-50 border-transparent text-red-600 hover:bg-red-100'
                            }`}
                    >
                        퇴원
                    </button>
                    <button
                        onClick={onTransfer}
                        className="px-4 py-2 bg-white border border-blue-100 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                        전실
                    </button>
                    <button
                        onClick={onSeedData}
                        className="px-4 py-2 bg-white border border-indigo-100 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="가상 데이터 생성 (Dev)"
                    >
                        Dev
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 -mt-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
