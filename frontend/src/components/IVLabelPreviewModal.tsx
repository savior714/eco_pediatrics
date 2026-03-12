import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { Bed } from '@/types/domain';
import { formatPatientDemographics, getKSTNowString } from '@/utils/dateUtils';
import { Printer, Loader2, Beaker, Syringe, ShieldCheck } from 'lucide-react';
import { IVLabelPreviewSection } from './IVLabelPreviewSection';
import { MedSection, MixedMed } from './IVLabelMedSection';
import { toaster } from './ui/Toast';
import { Field } from './ui/Field';

interface IVLabelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    currentRate?: number;
}

const formatMeds = (meds: MixedMed[]) => meds.map(m => `${m.name} ${m.amount}${m.unit}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ');

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

    const handleLabChange = (id: string, field: 'checked' | 'value', val: boolean | string) => {
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

                        <IVLabelPreviewSection
                            bed={bed}
                            patientId={patientId}
                            manualName={manualName}
                            ageGender={ageGender}
                            printDate={printDate}
                            rapidRate={rapidRate}
                            rapidBaseFluid={rapidBaseFluid}
                            rapidMeds={rapidMeds}
                            maintRate={maintRate}
                            maintBaseFluid={maintBaseFluid}
                            maintMeds={maintMeds}
                            antibioticMeds={antibioticMeds}
                            otherMeds={otherMeds}
                            astResult={astResult}
                            labResults={labResults}
                            formatMeds={formatMeds}
                        />

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
