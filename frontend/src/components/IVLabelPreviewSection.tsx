import React from 'react';
import { Check, Baby, Syringe, FlaskConical } from 'lucide-react';
import type { MixedMed } from '@/types/domain';

export type { MixedMed as MixedMedForPreview };

export interface LabResultsForPreview {
    [key: string]: { checked: boolean; value: string };
}

export interface IVLabelPreviewSectionProps {
    bed: { room: string; name?: string };
    patientId: string;
    onPatientIdChange: (id: string) => void;
    manualName: string;
    onManualNameChange: (name: string) => void;
    ageGender: string;
    printDate: string;
    rapidRate: number;
    rapidBaseFluid: string;
    rapidMeds: MixedMed[];
    maintRate: number;
    maintBaseFluid: string;
    maintMeds: MixedMed[];
    antibioticMeds: MixedMed[];
    otherMeds: MixedMed[];
    astResult: 'NONE' | 'NEG' | 'POS';
    labResults: LabResultsForPreview;
    formatMeds: (meds: MixedMed[]) => string;
}

const LAB_ITEMS = [
    { id: 'cbc', label: 'CBC' },
    { id: 'lft', label: 'LFT' },
    { id: 'electrolyte', label: 'Electro' },
    { id: 'ua', label: 'UA & UC' },
    { id: 'bcx', label: 'B/Cx.' },
    { id: 'stool', label: 'Stool PCR' },
    { id: 'resp', label: 'Resp. PCR' }
] as const;

/** 수액 라벨 카드 (A6 감열지 스타일). 환자번호·성명 직접 편집 지원. */
export function IVLabelPreviewSection({
    bed,
    patientId,
    onPatientIdChange,
    manualName,
    onManualNameChange,
    ageGender,
    printDate,
    rapidRate,
    rapidBaseFluid,
    rapidMeds,
    maintRate,
    maintBaseFluid,
    maintMeds,
    antibioticMeds,
    otherMeds,
    astResult,
    labResults,
    formatMeds
}: IVLabelPreviewSectionProps) {
    return (
        <div className="w-full bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.10)] rounded-sm p-5 flex flex-col relative border border-slate-200">

                {/* 1. Header: Clinic Identity */}
                <div className="flex justify-between items-center mb-2 border-b-2 border-[#2D4B3E] pt-1 pb-2">
                    <img src="/eco_logo.png" alt="에코소아과 로고" className="h-8 object-contain" />
                    <div className="text-right">
                        <p className="text-[12px] font-bold text-slate-800">인쇄 일자: {printDate}</p>
                    </div>
                </div>

                {/* 2. 환자 정보 (Grid Box) */}
                <div className="border-2 border-[#2D4B3E] p-2 mb-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Baby size={13} className="text-[#2D4B3E] shrink-0" />
                        <h3 className="text-[13px] font-black text-[#2D4B3E]">환자 정보</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-12 text-slate-600">병실:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{bed.room}호</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-16 text-slate-600 whitespace-nowrap">환자번호:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={patientId}
                                onChange={(e) => onPatientIdChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                placeholder="________"
                                className="flex-1 min-w-0 border-b border-slate-400 font-black bg-transparent outline-none text-[13px] placeholder:text-slate-300 focus:border-[#2D4B3E]"
                            />
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-12 text-slate-600">성명:</span>
                            <input
                                type="text"
                                value={manualName || bed.name || ''}
                                onChange={(e) => onManualNameChange(e.target.value)}
                                placeholder="________"
                                className="flex-1 min-w-0 border-b border-slate-400 font-black bg-transparent outline-none text-[13px] placeholder:text-slate-300 focus:border-[#2D4B3E]"
                            />
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-20 text-slate-600 whitespace-nowrap">성별/나이:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{ageGender}</span>
                        </div>
                    </div>
                </div>

                {/* 3. 수액 처방 정보 (Hierarchy Box) */}
                <div className="border-2 border-[#2D4B3E] p-2 mb-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Syringe size={13} className="text-[#2D4B3E] shrink-0" />
                        <h3 className="text-[13px] font-black text-[#2D4B3E]">수액 처방 정보</h3>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border border-[#2D4B3E] flex items-center justify-center ${rapidRate > 0 ? 'bg-[#2D4B3E]' : ''}`}>
                                {rapidRate > 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-[12px] font-bold">급속수액요법:</span>
                            <span className="text-[12px] font-black text-[#2D4B3E] px-1.5 bg-slate-50 rounded border border-slate-100">{rapidBaseFluid || '____'}</span>
                            <span className="flex-1 border-b border-slate-300 text-right font-black px-2">{rapidRate || '____'}</span>
                            <span className="text-[11px] text-slate-400 font-bold">(CC)</span>
                        </div>
                        {rapidMeds.length > 0 && (
                            <div className="ml-5 flex items-start gap-1">
                                <span className="text-[10px] font-bold text-slate-400">└ Mix:</span>
                                <span className="flex-1 border-b border-slate-200 text-[11px] font-black text-red-600 italic leading-tight">{formatMeds(rapidMeds)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border border-[#2D4B3E] flex items-center justify-center ${maintBaseFluid ? 'bg-[#2D4B3E]' : ''}`}>
                                {maintBaseFluid && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-[12px] font-bold">유지수액요법:</span>
                            <span className="text-[12px] font-black text-[#2D4B3E] px-1.5 bg-slate-50 rounded border border-slate-100">{maintBaseFluid || '____'}</span>
                            {maintBaseFluid && (
                                <>
                                    <span className="flex-1 border-b border-slate-300 text-right font-black px-2">{maintRate || '____'}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">(cc/hr)</span>
                                </>
                            )}
                        </div>
                        {maintMeds.length > 0 && (
                            <div className="ml-5 flex items-start gap-1">
                                <span className="text-[10px] font-bold text-slate-400">└ Mix:</span>
                                <span className="flex-1 border-b border-slate-200 text-[11px] font-black text-blue-600 italic leading-tight">{formatMeds(maintMeds)}</span>
                            </div>
                        )}
                    </div>

                        <div className="pt-1 space-y-1 border-t border-dashed border-slate-200">
                            <div className="flex items-start gap-2">
                                <span className="text-[12px] font-bold w-14 text-slate-600 shrink-0">항생제:</span>
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex items-baseline justify-between border-b border-slate-300 gap-2">
                                        <span className="text-[12px] font-black text-purple-700 truncate">{antibioticMeds.length > 0 ? formatMeds(antibioticMeds) : ''}</span>
                                        <div className="flex items-center gap-1 shrink-0 mb-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">AST</span>
                                            <span className={`flex items-center justify-center w-3.5 h-3.5 text-[11px] font-black rounded border ${astResult === 'NEG' ? 'bg-green-100 text-green-700 border-green-200' : astResult === 'POS' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-slate-400 border-slate-300'}`}>
                                                {astResult === 'NEG' ? '-' : astResult === 'POS' ? '+' : ''}
                                            </span>

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[12px] font-bold w-14 text-slate-600">기타:</span>
                                <span className="flex-1 border-b border-slate-300 text-[12px] font-bold text-slate-600 min-h-[1.2rem]">{otherMeds.length > 0 ? formatMeds(otherMeds) : ''}</span>
                            </div>
                        </div>
                </div>

                {/* 4. 주요 검사 항목 결과 (2-Column Grid) */}
                <div className="border-2 border-[#2D4B3E] p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1.5">
                        <FlaskConical size={13} className="text-[#2D4B3E] shrink-0" />
                        <h3 className="text-[13px] font-black text-[#2D4B3E]">주요 검사 항목 결과</h3>
                    </div>
                    <div className="grid grid-cols-2 border-t border-l border-[#2D4B3E]">
                        {LAB_ITEMS.map((lab, idx) => (
                            <div key={lab.id} className={`flex items-center gap-1 p-1 border-b border-r border-[#2D4B3E] ${idx === 6 ? 'col-span-2' : ''}`}>
                                <div className={`w-2.5 h-2.5 border border-[#2D4B3E] flex-shrink-0 ${labResults[lab.id]?.checked ? 'bg-[#2D4B3E]' : ''}`} />
                                <span className="text-[11px] font-bold w-16 truncate text-slate-700">[{lab.label}]</span>
                                <span className="flex-1 text-[11px] font-black text-right pr-1">{labResults[lab.id]?.value || '___'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Footer */}
                <div className="mt-auto text-center">
                    <p className="text-[12px] font-black text-[#2D4B3E] italic">
                        주의사항: &quot;본 라벨은 의료진 확인용입니다.&quot;
                    </p>
                </div>
            </div>
    );
}
