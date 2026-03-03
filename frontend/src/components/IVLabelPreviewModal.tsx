import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { Bed } from '@/types/domain';
import { formatPatientDemographics, getKSTNowString } from '@/utils/dateUtils';
import { Printer, Loader2, Check, Plus, Trash2, Syringe, Beaker, ShieldCheck } from 'lucide-react';
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
}

const MedSection = ({
    title, icon: Icon, meds, setter, color, showRate = false, rateVal, setRateVal,
    presets = [], unit = 'amp', showFrequency = false, baseFluid, setBaseFluid
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

        {showRate && (
            <div className="grid grid-cols-12 gap-4 items-end">
                {/* 메인 수액 선택 (Left 7) */}
                <div className="col-span-12 lg:col-span-7 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Base Fluid</label>
                    <div className="flex flex-wrap gap-2">
                        {presets.map((name: string) => {
                            const isSelected = baseFluid === name;
                            return (
                                <button
                                    key={name}
                                    onClick={() => setBaseFluid?.(isSelected ? '' : name)}
                                    className={`px-3 py-1 h-12 border rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 ${isSelected
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

                {/* 주입 속도 입력 (Right 5) */}
                <div className="col-span-12 lg:col-span-5 space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-tighter">Infusion Rate</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={rateVal || ''}
                            onChange={(e) => setRateVal?.(Number(e.target.value))}
                            className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none text-xs focus:ring-4 focus:ring-teal-500/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">CC/HR</span>
                    </div>
                </div>
            </div>
        )}

        {!showRate && (
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
        )}

        <div className="space-y-2">
            {meds.map((med: any) => (
                <div key={med.id} className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <input
                            value={med.name}
                            onChange={(e) => updateMed(setter, med.id, 'name', e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700"
                            placeholder="약물명"
                        />
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                            <input
                                type="number"
                                value={med.amount}
                                onChange={(e) => updateMed(setter, med.id, 'amount', Number(e.target.value))}
                                className="w-12 bg-transparent border-none outline-none text-xs font-black text-slate-700 text-center"
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
                        </div>
                        <button onClick={() => removeMed(setter, med.id)} className="p-1 text-slate-300 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    {showFrequency && (
                        <div className="flex gap-1.5 pt-1 border-t border-slate-100/50">
                            {(['QD', 'BID', 'TID'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => updateMed(setter, med.id, 'frequency', f)}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${med.frequency === f ? 'bg-purple-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
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

    const PRESET_MEDS = ['ambroxol', 'tiropramide', 'VitB complex', 'Ceftriaxone', 'K-contin'];

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
            // Combine all meds for the backend (simplified for now)
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
                infusionRate: maintRate || rapidRate, // Most significant rate
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
                        />

                        {/* 4. 항생제 */}
                        <MedSection
                            title="항생제 (Antibiotics)"
                            icon={ShieldCheck}
                            meds={antibioticMeds}
                            setter={setAntibioticMeds}
                            color="bg-purple-400"
                            presets={['ceftriaxone', 'cefotaxime', 'ampicillin + sulbactam']}
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
                        />

                        <div className="h-10" />
                    </div>

                    {/* [우측] 미리보기 및 액션 영역 (5/12) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 h-full min-h-0">
                        {/* 라벨 미리보기 시뮬레이터 (A6 감열지 느낌) */}
                        <div className="flex-1 bg-slate-200 rounded-3xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-300/50 to-transparent" />
                            <div className="w-[380px] h-[540px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm p-8 flex flex-col relative z-10 border-t-[6px] border-[#2D4B3E]">
                                {/* 감열지 텍스처 효과 */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />

                                {/* Header */}
                                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">IV FLUID</h1>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{printDate}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-[#2D4B3E]">{bed.room}호</p>
                                            <p className="text-[11px] font-bold text-slate-400">{bed.id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Info */}
                                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Patient Name</p>
                                        <h2 className="text-2xl font-black text-slate-900">{manualName || bed.name}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sex/Age</p>
                                        <p className="text-lg font-black text-slate-700">{ageGender}</p>
                                    </div>
                                </div>

                                {/* Main Content (Meds/Fluids) */}
                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-[2px] bg-slate-200" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Prescription Info</span>
                                        <div className="flex-1 h-[2px] bg-slate-200" />
                                    </div>

                                    <section className="flex-1 flex flex-col min-h-0 border-2 border-[#A8C3B8]/30 rounded-2xl p-3 overflow-hidden bg-white/50">
                                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                            {/* Rapid */}
                                            {(rapidRate > 0 || rapidMeds.length > 0 || rapidBaseFluid) && (
                                                <div className="border-l-4 border-red-400 pl-2 py-0.5">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black text-red-700 uppercase">{rapidBaseFluid || 'RAPID INFUSION'}</span>
                                                        <span className="text-[9px] font-black">{rapidRate} cc/hr</span>
                                                    </div>
                                                    <div className="text-[8px] font-bold text-slate-500 italic bg-red-50/50 p-1 rounded-md">
                                                        {formatMeds(rapidMeds) || (rapidMeds.length === 0 ? 'Pure' : 'Mixed')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Maint */}
                                            {(maintRate > 0 || maintMeds.length > 0 || maintBaseFluid) && (
                                                <div className="border-l-4 border-blue-400 pl-2 py-0.5">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black text-blue-700 uppercase">{maintBaseFluid || 'MAINTENANCE'}</span>
                                                        <span className="text-[9px] font-black">{maintRate} cc/hr</span>
                                                    </div>
                                                    <div className="text-[8px] font-bold text-slate-500 italic bg-blue-50/50 p-1 rounded-md">
                                                        {formatMeds(maintMeds) || (maintMeds.length === 0 ? 'Pure' : 'Mixed')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Antibiotics */}
                                            {antibioticMeds.length > 0 && (
                                                <div className="border-l-4 border-purple-400 pl-2 py-0.5">
                                                    <span className="text-[10px] font-black text-purple-700 block mb-1 uppercase">Antibiotics</span>
                                                    <div className="text-[8px] font-bold text-slate-500 italic bg-purple-50/50 p-1 rounded-md">
                                                        {formatMeds(antibioticMeds)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Other */}
                                            {otherMeds.length > 0 && (
                                                <div className="border-l-4 border-amber-400 pl-2 py-0.5">
                                                    <span className="text-[10px] font-black text-amber-700 block mb-1 uppercase">Other Meds</span>
                                                    <div className="text-[8px] font-bold text-slate-500 italic bg-amber-50/50 p-1 rounded-md">
                                                        {formatMeds(otherMeds)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lab Results (Small Tag style) */}
                                            {Object.entries(labResults).some(([_, res]) => res.checked) && (
                                                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                                    {Object.entries(labResults).map(([key, res]) => res.checked && (
                                                        <span key={key} className="px-1.5 py-0.5 bg-slate-100 text-[7px] font-black text-slate-500 rounded uppercase">
                                                            {key}: {res.value || '?'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Footer / Stamp */}
                                <div className="mt-6 flex justify-between items-end">
                                    <div className="text-[8px] font-bold text-slate-300">
                                        ECO PEDIATRICS<br />Digital Healthcare Sys.
                                    </div>
                                    <div className="w-16 h-16 border-4 border-red-500/20 rounded-full flex items-center justify-center rotate-12">
                                        <Printer size={32} className="text-red-500/20" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/60 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                취소
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={isPrinting}
                                className="flex-[2] h-14 bg-[#2D4B3E] hover:bg-[#1E332A] disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-teal-900/20 transition-all flex items-center justify-center gap-2 group"
                            >
                                {isPrinting ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <Printer size={20} className="group-hover:scale-110 transition-transform" />
                                        처방 및 라벨 인쇄
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
