import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { Bed } from '@/types/domain';
import { formatPatientDemographics, getKSTNowString } from '@/utils/dateUtils';
import { Printer, Loader2, Check, Plus, Trash2, Syringe, Beaker, ShieldCheck, ChevronDown } from 'lucide-react';
import { toaster } from './ui/Toast';
import { Field } from './ui/Field';
import { Select } from './ui/Select';
import { Checkbox } from './ui/Checkbox';

interface IVLabelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    currentRate?: number;
}

interface MixedMed {
    id: string;
    name: string;
    amount: number;
    unit?: string;
    frequency?: 'QD' | 'BID' | 'TID';
}

// --- Helper Functions (Defined Outside to prevent re-creation) ---
const addMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, name: string = '', unit: string = 'amp') => {
    setter(prev => [...prev, { id: crypto.randomUUID(), name, amount: 1, unit }]);
};

const updateMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string, field: keyof MixedMed, val: any) => {
    setter(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
};

const removeMed = (setter: React.Dispatch<React.SetStateAction<MixedMed[]>>, id: string) => {
    setter(prev => prev.filter(m => m.id !== id));
};

const formatMeds = (meds: MixedMed[]) => meds.map(m => `${m.name} ${m.amount}${m.unit}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ');

// --- Sub-components (Defined Outside to prevent losing focus) ---
interface MedSectionProps {
    title: string;
    icon: any;
    meds: MixedMed[];
    setter: React.Dispatch<React.SetStateAction<MixedMed[]>>;
    color: string;
    showRate?: boolean;
    rateVal?: number;
    setRateVal?: (val: number) => void;
    presets?: string[];
    unit?: string;
    showFrequency?: boolean;
    baseFluid?: string;
    setBaseFluid?: (val: string) => void;
    rateLabel?: string;
    rateUnit?: string;
    mixedMedPresets?: string[];
}

const MedSection = ({
    title, icon: Icon, meds, setter, color, showRate = false, rateVal, setRateVal,
    presets = [], unit = 'amp', showFrequency = false, baseFluid, setBaseFluid,
    rateLabel = 'Infusion Rate', rateUnit = 'CC/HR',
    mixedMedPresets = []
}: MedSectionProps) => (
    <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-4 ${color} rounded-full`} />
                <Icon size={16} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            </div>
            <button
                onClick={() => addMed(setter, '', unit)}
                className="px-2.5 py-1 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-1.5 text-[11px] font-bold border border-teal-100"
            >
                <Plus size={14} /> 약물 추가
            </button>
        </div>

        {showRate ? (
            <div className="grid grid-cols-12 gap-6">
                {/* [좌측] 주입 설정 (5/12) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                    {/* 메인 수액 선택 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Base Fluid</label>
                        <div className="flex flex-wrap gap-2">
                            {presets.map((name: string) => {
                                const isSelected = baseFluid === name;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setBaseFluid?.(isSelected ? '' : name)}
                                        className={`flex-1 px-3 py-1 h-12 border rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${isSelected
                                            ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200'
                                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-teal-50'}`}
                                    >
                                        {isSelected && <Check size={12} />}
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 주입 속도/용량 입력 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-tighter">{rateLabel}</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={rateVal || ''}
                                onChange={(e) => setRateVal?.(Number(e.target.value))}
                                className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none text-xs focus:ring-4 focus:ring-teal-500/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{rateUnit}</span>
                        </div>
                    </div>
                </div>

                {/* [우측] 믹스 약물 리스트 (7/12) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-[120px]">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Mixed Medications</label>
                        <span className="text-[10px] font-bold text-slate-300">{meds.length} meds</span>
                    </div>
                    <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                        {meds.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl py-8 grayscale opacity-50">
                                <Beaker size={24} className="text-slate-300 mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 italic">No meds mixed yet</p>
                            </div>
                        ) : (
                            meds.map((med: any) => {
                                const showSelect = mixedMedPresets.length > 0 && (mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === '');

                                return (
                                    <div key={med.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
                                        <div className="flex items-center gap-2">
                                            {showSelect ? (
                                                <div className="flex-1 min-w-0">
                                                    <Select
                                                        options={[
                                                            ...mixedMedPresets.map(p => ({ label: p, value: p })),
                                                            { label: '직접 입력...', value: 'CUSTOM' }
                                                        ]}
                                                        value={med.name && med.name !== 'SELECT_MODE' ? [med.name] : []}
                                                        onValueChange={(val) => {
                                                            if (val[0] === 'CUSTOM') {
                                                                updateMed(setter, med.id, 'name', 'CUSTOM_MODE');
                                                            } else {
                                                                updateMed(setter, med.id, 'name', val[0]);
                                                            }
                                                        }}
                                                        placeholder="약물 선택"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                    <div className="relative flex-1 group">
                                                        <input
                                                            value={med.name === 'CUSTOM_MODE' ? '' : med.name}
                                                            onChange={(e) => updateMed(setter, med.id, 'name', e.target.value)}
                                                            autoFocus
                                                            className="w-full h-11 pl-4 pr-10 bg-white border-2 border-teal-500/30 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
                                                            placeholder="약물명 직접 입력"
                                                        />
                                                        {mixedMedPresets.length > 0 && (
                                                            <button
                                                                onClick={() => updateMed(setter, med.id, 'name', 'SELECT_MODE')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                                title="목록에서 선택"
                                                            >
                                                                <ChevronDown size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex-shrink-0 flex items-center gap-2 bg-white px-2 py-1 h-11 rounded-xl border-2 border-slate-100">
                                                <input
                                                    type="number"
                                                    value={med.amount}
                                                    onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                                                    className="w-10 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center"
                                                />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                                            </div>
                                            <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <>
                <div className="flex flex-wrap gap-2">
                    {presets.map((name: string) => (
                        <button
                            key={name}
                            onClick={() => addMed(setter, name, unit)}
                            className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-teal-50 transition-all"
                        >
                            + {name}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    {meds.map((med: any) => {
                        return (
                            <div key={med.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
                                <div className="flex items-center gap-2">
                                    {(mixedMedPresets.length > 0 && (mixedMedPresets.includes(med.name) || !med.name || med.name === 'SELECT_MODE' || med.name === '')) ? (
                                        <div className="flex-1 min-w-0">
                                            <Select
                                                options={[
                                                    ...mixedMedPresets.map(p => ({ label: p, value: p })),
                                                    { label: '직접 입력...', value: 'CUSTOM' }
                                                ]}
                                                value={med.name && med.name !== 'SELECT_MODE' ? [med.name] : []}
                                                onValueChange={(val) => {
                                                    if (val[0] === 'CUSTOM') {
                                                        updateMed(setter, med.id, 'name', 'CUSTOM_MODE');
                                                    } else {
                                                        updateMed(setter, med.id, 'name', val[0]);
                                                    }
                                                }}
                                                placeholder="약물 선택"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <div className="relative flex-1 group">
                                                <input
                                                    value={med.name === 'CUSTOM_MODE' ? '' : med.name}
                                                    onChange={(e) => updateMed(setter, med.id, 'name', e.target.value)}
                                                    autoFocus
                                                    className="w-full h-11 pl-4 pr-10 bg-white border-2 border-teal-500/30 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
                                                    placeholder="약물명 직접 입력"
                                                />
                                                {mixedMedPresets.length > 0 && (
                                                    <button
                                                        onClick={() => updateMed(setter, med.id, 'name', 'SELECT_MODE')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                                        title="목록에서 선택"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex-shrink-0 flex items-center gap-2 bg-white px-2 py-1 h-11 rounded-xl border-2 border-slate-100">
                                        <input
                                            type="number"
                                            value={med.amount}
                                            onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                                            className="w-12 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center"
                                        />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                                    </div>
                                    <button onClick={() => removeMed(setter, med.id)} className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {showFrequency && (
                                    <div className="flex gap-1.5 pt-2 border-t border-slate-200/50">
                                        {(['QD', 'BID', 'TID'] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => updateMed(setter, med.id, 'frequency', f)}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${med.frequency === f ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-400 border border-slate-100'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>
        )}
    </section>
);

export function IVLabelPreviewModal({ isOpen, onClose, bed, currentRate }: IVLabelPreviewModalProps) {
    const [patientId, setPatientId] = useState<string>('');
    const [manualName, setManualName] = useState<string>(bed.name || '');
    const [astResult, setAstResult] = useState<'NONE' | 'NEG' | 'POS'>('NONE');
    const [isPrinting, setIsPrinting] = useState(false);

    // [Category 1] 급속수액요법 (Rapid)
    const [rapidBaseFluid, setRapidBaseFluid] = useState<string>('');
    const [rapidRate, setRapidRate] = useState<number>(0);
    const [rapidMeds, setRapidMeds] = useState<MixedMed[]>([]);

    // [Category 2] 유지수액요법 (Maintenance)
    const [maintBaseFluid, setMaintBaseFluid] = useState<string>('');
    const [maintRate, setMaintRate] = useState<number>(currentRate || 0);
    const [maintMeds, setMaintMeds] = useState<MixedMed[]>([]);

    // [Category 3] 항생제 (Antibiotics)
    const [antibioticMeds, setAntibioticMeds] = useState<MixedMed[]>([]);

    // [Category 4] 기타 약물 (IVS, IVM, IM)
    const [otherMeds, setOtherMeds] = useState<MixedMed[]>([]);

    const [labResults, setLabResults] = useState<Record<string, { checked: boolean, value: string }>>({
        cbc: { checked: false, value: '' },
        lft: { checked: false, value: '' },
        electrolyte: { checked: false, value: '' },
        ua: { checked: false, value: '' },
        bcx: { checked: false, value: '' },
        stool: { checked: false, value: '' },
        resp: { checked: false, value: '' }
    });

    const PRESET_MEDS = ['ambroxol', 'tiropramide', 'dexamethasone', 'Vit B complex'];

    const ageGender = formatPatientDemographics(bed.dob, bed.gender);
    const printDate = getKSTNowString().split(' ')[0];

    const handleLabChange = (id: string, field: 'checked' | 'value', val: any) => {
        setLabResults(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: val }
        }));
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 모든 약물을 하나로 통합하여 전달
            const allMeds = [
                rapidMeds.length > 0 ? `[Rapid] ${formatMeds(rapidMeds)}` : '',
                maintMeds.length > 0 ? `[Maint] ${formatMeds(maintMeds)}` : '',
                antibioticMeds.length > 0 ? `[Anti] ${formatMeds(antibioticMeds)}` : '',
                otherMeds.length > 0 ? `[Other] ${formatMeds(otherMeds)}` : ''
            ].filter(Boolean).join(' | ');

            const data: IVLabelData = {
                name: bed.name,
                room: `${bed.room}호`,
                ageGender,
                infusionRate: rapidRate || maintRate, // 우선순위: 급속 > 유지
                dropFactor: 60,
                patientId,
                manualName,
                fluidType: rapidRate > 0 ? (rapidBaseFluid || 'RAPID') : (maintBaseFluid || 'MAINTENANCE'),
                mixMeds: allMeds,
                astCheck: astResult !== 'NONE',
                astResult,
                labResults: JSON.stringify(labResults)
            };
            await IVLabelService.printLabel(data);
            toaster.create({ title: '인쇄 시작', description: '라벨 인쇄를 요청했습니다.', type: 'success' });
            onClose();
        } catch (error) {
            toaster.create({ title: '인쇄 실패', description: '프린터 연결 상태를 확인해 주세요.', type: 'error' });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="수액 라벨 처방 설정"
            className="sm:max-w-[1200px] max-h-[98vh] overflow-hidden"
            elevation="nested"
        >
            <div className="flex flex-col h-full bg-[#F8FAFC]">
                <div className="flex-1 p-6 grid grid-cols-12 gap-8 overflow-hidden min-h-0">

                    {/* [좌측] 설정 입력 영역 (7/12) - 스크롤 허용 */}
                    <div className="col-span-12 lg:col-span-7 space-y-4 overflow-y-auto pr-3 custom-scrollbar h-full">

                        {/* 1. 환자 정보 */}
                        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-4 bg-[#2D4B3E] rounded-full" />
                                <h3 className="text-sm font-bold text-slate-800">환자 인적 사항</h3>
                            </div>
                            <div className="grid grid-cols-12 gap-5 items-end">
                                <div className="col-span-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-500 ml-1 uppercase">BED / S / A</label>
                                        <div className="w-full px-4 border-2 border-slate-100 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 truncate h-12 flex items-center">
                                            {bed.room}호 / {ageGender}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <Field
                                        label="환자번호 (PID)"
                                        value={patientId}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length <= 6) setPatientId(val);
                                        }}
                                        inputMode="numeric"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Field label="성명 (수동)" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                                </div>
                            </div>
                        </section>

                        {/* 2. 급속수액요법 */}
                        <MedSection
                            title="급속 수액 요법 (Rapid)"
                            icon={Beaker}
                            meds={rapidMeds}
                            setter={setRapidMeds}
                            color="bg-red-400"
                            showRate={true}
                            rateVal={rapidRate}
                            setRateVal={setRapidRate}
                            presets={['NS', "HS(Lactated Ringer's)"]}
                            baseFluid={rapidBaseFluid}
                            setBaseFluid={setRapidBaseFluid}
                            rateLabel="Volume"
                            rateUnit="CC"
                            mixedMedPresets={PRESET_MEDS}
                        />

                        {/* 3. 유지수액요법 */}
                        <MedSection
                            title="유지 수액 요법 (Maint)"
                            icon={Syringe}
                            meds={maintMeds}
                            setter={setMaintMeds}
                            color="bg-blue-400"
                            showRate={true}
                            rateVal={maintRate}
                            setRateVal={setMaintRate}
                            presets={['5DS', '1:4']}
                            baseFluid={maintBaseFluid}
                            setBaseFluid={setMaintBaseFluid}
                            mixedMedPresets={PRESET_MEDS}
                        />

                        {/* 4. 항생제 */}
                        <MedSection
                            title="항생제 (Antibiotics)"
                            icon={ShieldCheck}
                            meds={antibioticMeds}
                            setter={setAntibioticMeds}
                            color="bg-purple-400"
                            presets={['ceftriaxone', 'cefotaxime', 'ampicillin + sulbactam']}
                            mixedMedPresets={['ceftriaxone', 'cefotaxime', 'ampicillin + sulbactam']}
                            unit="mg"
                            showFrequency={true}
                        />

                        {/* 5. 기타 약물 */}
                        <MedSection
                            title="기타 약물 (IVS, IVM, IM)"
                            icon={Syringe}
                            meds={otherMeds}
                            setter={setOtherMeds}
                            color="bg-amber-400"
                            presets={['Vitamin D']}
                            mixedMedPresets={['Vitamin D', ...PRESET_MEDS]}
                        />

                        {/* 6. AST & Lab Results */}
                        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-4 bg-teal-600 rounded-full" />
                                <h3 className="text-sm font-bold text-slate-800">AST 및 주요 검사 결과</h3>
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-500 min-w-[100px]">AST 결과:</span>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'NONE', label: '미시행', color: 'bg-slate-200' },
                                        { id: 'NEG', label: 'Negative', color: 'bg-green-500' },
                                        { id: 'POS', label: 'Positive', color: 'bg-red-500' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setAstResult(opt.id as any)}
                                            className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all ${astResult === opt.id ? `${opt.color} text-white shadow-lg shadow-${opt.color}/20` : 'bg-white text-slate-400 border border-slate-100'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'cbc', label: 'CBC' },
                                    { id: 'lft', label: 'LFT' },
                                    { id: 'electrolyte', label: 'Electrolyte' },
                                    { id: 'ua', label: 'UA & U/Cx.' },
                                    { id: 'bcx', label: 'B/Cx.' },
                                    { id: 'stool', label: 'Stool PCR/Cx.' },
                                    { id: 'resp', label: 'Resp. PCR (V/B)' }
                                ].map(lab => (
                                    <div key={lab.id} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-black text-slate-700">{lab.label}</label>
                                            <input
                                                type="checkbox"
                                                checked={labResults[lab.id]?.checked}
                                                onChange={(e) => handleLabChange(lab.id, 'checked', e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                        </div>
                                        <input
                                            value={labResults[lab.id]?.value}
                                            onChange={(e) => handleLabChange(lab.id, 'value', e.target.value)}
                                            disabled={!labResults[lab.id]?.checked}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 transition-all"
                                            placeholder="결과값 입력"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="h-10" />
                    </div>

                    {/* [우측] 미리보기 및 액션 영역 (5/12) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 h-full min-h-0 bg-slate-100 p-6 rounded-r-2xl border-l border-slate-200">

                        {/* 라벨 미리보기 시뮬레이터 (A6 감열지 느낌 강화) */}
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

                                    {/* Rapid Section */}
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

                                    {/* Maintenance Section */}
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

                                    {/* Antibiotics & Others & AST */}
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
                                        {[
                                            { id: 'cbc', label: 'CBC' }, { id: 'lft', label: 'LFT' },
                                            { id: 'electrolyte', label: 'Electrolyte' }, { id: 'ua', label: 'UA & U/Cx.' },
                                            { id: 'bcx', label: 'B/Cx.' }, { id: 'stool', label: 'Stool PCR/Cx.' },
                                            { id: 'resp', label: 'Resp. PCR (V/B)' }
                                        ].map((lab, idx) => (
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
                                        주의사항: "본 라벨은 의료진 확인용입니다."
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons (Fixed at Bottom) */}
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 h-12 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all text-sm">
                                취소
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={isPrinting}
                                className="flex-[2] h-12 bg-[#2D4B3E] hover:bg-[#1E332A] disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <><Printer size={18} /> 처방 및 라벨 인쇄</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
