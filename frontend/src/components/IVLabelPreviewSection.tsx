import React from 'react';
import { Check } from 'lucide-react';

export interface MixedMedForPreview {
    id: string;
    name: string;
    amount: number;
    unit?: string;
    frequency?: 'QD' | 'BID' | 'TID';
}

export interface LabResultsForPreview {
    [key: string]: { checked: boolean; value: string };
}

export interface IVLabelPreviewSectionProps {
    bed: { room: string; name?: string };
    patientId: string;
    manualName: string;
    ageGender: string;
    printDate: string;
    rapidRate: number;
    rapidBaseFluid: string;
    rapidMeds: MixedMedForPreview[];
    maintRate: number;
    maintBaseFluid: string;
    maintMeds: MixedMedForPreview[];
    antibioticMeds: MixedMedForPreview[];
    otherMeds: MixedMedForPreview[];
    astResult: 'NONE' | 'NEG' | 'POS';
    labResults: LabResultsForPreview;
    formatMeds: (meds: MixedMedForPreview[]) => string;
}

const LAB_ITEMS = [
    { id: 'cbc', label: 'CBC' },
    { id: 'lft', label: 'LFT' },
    { id: 'electrolyte', label: 'Electrolyte' },
    { id: 'ua', label: 'UA & U/Cx.' },
    { id: 'bcx', label: 'B/Cx.' },
    { id: 'stool', label: 'Stool PCR/Cx.' },
    { id: 'resp', label: 'Resp. PCR (V/B)' }
] as const;

/** 수액 라벨 미리보기 카드 (A6 감열지 스타일). 모달 우측 전용 Presenter. */
export function IVLabelPreviewSection({
    bed,
    patientId,
    manualName,
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
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar py-4">
            <div className="w-[380px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-[2px] p-6 flex flex-col relative border border-slate-300 ring-1 ring-black/5">

                {/* 1. Header: Clinic Identity */}
                <div className="flex justify-between items-center mb-4 border-b-2 border-[#2D4B3E] pt-4 pb-3">
                    <img src="/eco_logo.png" alt="에코소아과 로고" className="h-12 object-contain" />
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-800">인쇄 일자: {printDate}</p>
                    </div>
                </div>

                {/* 2. 환자 정보 (Grid Box) */}
                <div className="border-2 border-[#2D4B3E] p-3 mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-[#2D4B3E]" />
                        <h3 className="text-[11px] font-black text-[#2D4B3E]">환자 정보</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-12 text-slate-600">병실:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{bed.room}호</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-12 text-slate-600">환자번호:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{patientId || '________'}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-12 text-slate-600">성명:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{manualName || bed.name}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="font-bold mr-2 w-14 text-slate-600">성별/나이:</span>
                            <span className="flex-1 border-b border-slate-300 font-black">{ageGender}</span>
                        </div>
                    </div>
                </div>

                {/* 3. 수액 처방 정보 (Hierarchy Box) */}
                <div className="border-2 border-[#2D4B3E] p-3 mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-[#2D4B3E]" />
                        <h3 className="text-[11px] font-black text-[#2D4B3E]">수액 처방 정보</h3>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border border-[#2D4B3E] flex items-center justify-center ${rapidRate > 0 ? 'bg-[#2D4B3E]' : ''}`}>
                                {rapidRate > 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-[10px] font-bold">급속수액요법:</span>
                            <span className="text-[10px] font-black text-[#2D4B3E] px-1.5 bg-slate-50 rounded border border-slate-100">{rapidBaseFluid || '____'}</span>
                            <span className="flex-1 border-b border-slate-300 text-right font-black px-2">{rapidRate || '____'}</span>
                            <span className="text-[9px] text-slate-400 font-bold">(CC)</span>
                        </div>
                        {rapidMeds.length > 0 && (
                            <div className="ml-5 flex items-start gap-1">
                                <span className="text-[8px] font-bold text-slate-400">└ Mix:</span>
                                <span className="flex-1 border-b border-slate-200 text-[9px] font-black text-red-600 italic leading-tight">{formatMeds(rapidMeds)}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 border border-[#2D4B3E] flex items-center justify-center ${maintRate > 0 ? 'bg-[#2D4B3E]' : ''}`}>
                                {maintRate > 0 && <Check size={10} className="text-white" />}
                            </div>
                            <span className="text-[10px] font-bold">유지용법:</span>
                            <span className="text-[10px] font-black text-[#2D4B3E] px-1.5 bg-slate-50 rounded border border-slate-100">{maintBaseFluid || '____'}</span>
                            <span className="flex-1 border-b border-slate-300 text-right font-black px-2">{maintRate || '____'}</span>
                            <span className="text-[9px] text-slate-400 font-bold">(cc/hr)</span>
                        </div>
                        {maintMeds.length > 0 && (
                            <div className="ml-5 flex items-start gap-1">
                                <span className="text-[8px] font-bold text-slate-400">└ Mix:</span>
                                <span className="flex-1 border-b border-slate-200 text-[9px] font-black text-blue-600 italic leading-tight">{formatMeds(maintMeds)}</span>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 space-y-2 border-t border-dashed border-slate-200">
                        <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold w-12 text-slate-600">항생제:</span>
                            <span className="flex-1 border-b border-slate-300 text-[10px] font-black text-purple-700 min-h-[1rem]">{antibioticMeds.length > 0 ? formatMeds(antibioticMeds) : ''}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold w-12 text-slate-600">기타:</span>
                            <span className="flex-1 border-b border-slate-300 text-[10px] font-bold text-slate-600 min-h-[1rem]">{otherMeds.length > 0 ? formatMeds(otherMeds) : ''}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-600">AST(항생제 반응 검사):</span>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-1 text-[10px] font-bold">
                                    <div className={`w-3 h-3 border border-[#2D4B3E] ${astResult === 'NEG' ? 'bg-[#2D4B3E]' : ''}`} /> Negative
                                </label>
                                <label className="flex items-center gap-1 text-[10px] font-bold">
                                    <div className={`w-3 h-3 border border-[#2D4B3E] ${astResult === 'POS' ? 'bg-red-500 border-red-500' : ''}`} /> Positive
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. 주요 검사 항목 결과 (2-Column Grid) */}
                <div className="border-2 border-[#2D4B3E] p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-3 bg-[#2D4B3E]" />
                        <h3 className="text-[11px] font-black text-[#2D4B3E]">주요 검사 항목 결과</h3>
                    </div>
                    <div className="grid grid-cols-2 border-t border-l border-[#2D4B3E]">
                        {LAB_ITEMS.map((lab, idx) => (
                            <div key={lab.id} className={`flex items-center gap-1 p-1 border-b border-r border-[#2D4B3E] ${idx === 6 ? 'col-span-2' : ''}`}>
                                <div className={`w-2.5 h-2.5 border border-[#2D4B3E] flex-shrink-0 ${labResults[lab.id]?.checked ? 'bg-[#2D4B3E]' : ''}`} />
                                <span className="text-[9px] font-bold w-14 truncate text-slate-700">[{lab.label}]</span>
                                <span className="flex-1 text-[9px] font-black text-right pr-1">{labResults[lab.id]?.value || '___'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Footer */}
                <div className="mt-auto text-center">
                    <p className="text-[10px] font-black text-[#2D4B3E] italic">
                        주의사항: &quot;본 라벨은 의료진 확인용입니다.&quot;
                    </p>
                </div>
            </div>
        </div>
    );
}
