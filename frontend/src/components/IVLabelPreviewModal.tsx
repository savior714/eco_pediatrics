import React from 'react';
import { Modal } from './ui/Modal';
import { Bed } from '@/types/domain';
import { Printer, Loader2, Beaker, Syringe, ShieldCheck } from 'lucide-react';
import { IVLabelPreviewSection } from './IVLabelPreviewSection';
import { MedSection } from './IVLabelMedSection';
import { IVLabelLabSection } from './IVLabelLabSection';

import { useIVLabel } from '@/hooks/useIVLabel';

/** 수액 라벨 미리보기 모달 Props */
interface IVLabelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    currentRate?: number;
}

/** 혼합 약물 프리셋 목록 */
const PRESET_MEDS = ['ambroxol', 'tiropramide', 'dexamethasone', 'Vit B complex'];

/**
 * 수액 라벨 처방 설정 모달 컴포넌트.
 * - Architectural Goal: Pure Presenter (UI 렌더링에만 집중)
 * - 비즈니스 로직 및 상태 관리는 useIVLabel 훅으로 위임
 * - 각 섹션은 하위 전용 컴포넌트로 분리하여 가독성 및 유지보수성 확보
 */
export function IVLabelPreviewModal({ isOpen, onClose, bed, currentRate }: IVLabelPreviewModalProps) {
    const { state, actions } = useIVLabel(bed, currentRate, onClose);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="수액 라벨 처방 설정"
            className="sm:max-w-[1240px] max-h-[98vh] overflow-hidden"
            elevation="nested"
            noPadding={true}
            headerActions={
                <button
                    onClick={actions.handlePrint}
                    disabled={state.isPrinting}
                    className="flex items-center gap-1.5 px-4 h-9 bg-[#2D4B3E] hover:bg-[#1E332A] disabled:opacity-50 text-white font-black rounded-xl shadow-sm text-sm transition-all active:scale-[0.98]"
                >
                    {state.isPrinting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                    인쇄
                </button>
            }
        >
            <div className="flex h-[88vh] bg-white overflow-hidden">
                <div className="flex-1 flex overflow-hidden min-h-0">

                    {/* [좌측] 설정 입력 영역 — flex-[7] */}
                    <div className="flex-[7] overflow-y-auto p-6 pr-4 custom-scrollbar pb-10">
                        <div className="grid grid-cols-2 gap-3.5">

                        {/* 1. 급속수액요법 (Rapid) 섹션 */}
                        <MedSection
                            title="급속 수액 요법 (Rapid)"
                            icon={Beaker}
                            meds={state.rapidMeds}
                            setter={actions.setRapidMeds}
                            color="bg-red-400"
                            showRate={true}
                            rateVal={state.rapidRate}
                            setRateVal={actions.setRapidRate}
                            presets={['NS', "HS(Lactated Ringer's)"]}
                            baseFluid={state.rapidBaseFluid}
                            setBaseFluid={actions.setRapidBaseFluid}
                            rateLabel="Volume"
                            rateUnit="CC"
                            rateStep={10}
                            rateMin={10}
                            rateMax={500}
                            mixedMedPresets={PRESET_MEDS}
                        />

                        {/* 2. 유지수액요법 (Maint) 섹션 */}
                        <MedSection
                            title="유지 수액 요법 (Maint)"
                            icon={Syringe}
                            meds={state.maintMeds}
                            setter={actions.setMaintMeds}
                            color="bg-blue-400"
                            showRate={true}
                            rateVal={state.maintRate}
                            setRateVal={actions.setMaintRate}
                            rateReadOnly={true}
                            presets={['5DS', '1:4']}
                            baseFluid={state.maintBaseFluid}
                            setBaseFluid={actions.setMaintBaseFluid}
                            mixedMedPresets={PRESET_MEDS}
                        />

                        {/* 3. 항생제 (Antibiotics) 섹션 — 전체 너비 */}
                        <div className="col-span-2">
                            <MedSection
                                title="항생제 (Antibiotics)"
                                icon={ShieldCheck}
                                meds={state.antibioticMeds}
                                setter={actions.setAntibioticMeds}
                                color="bg-purple-400"
                                maxMeds={2}
                                presets={[]}
                                mixedMedPresets={['ceftriaxone', 'cefotaxime', 'ampicillin + sulbactam']}
                                unit="mg"
                                showFrequency={true}
                                astResult={state.astResult}
                                onAstChange={actions.setAstResult}
                                defaultAmount={100}
                                amountStep={100}
                                amountMin={100}
                                amountMax={4000}
                            />
                        </div>

                        {/* 4. 기타 약물 (IVS, IVM, IM) 섹션 — 전체 너비 */}
                        <div className="col-span-2">
                            <MedSection
                                title="기타 약물 (IVS, IVM, IM)"
                                icon={Syringe}
                                meds={state.otherMeds}
                                setter={actions.setOtherMeds}
                                color="bg-amber-400"
                                maxMeds={2}
                                presets={[]}
                                mixedMedPresets={['Vitamin D', ...PRESET_MEDS]}
                            />
                        </div>

                        {/* 5. 주요 검사 항목 결과 (Lab) 섹션 — 전체 너비 */}
                        <div className="col-span-2">
                            <IVLabelLabSection
                                labResults={state.labResults}
                                onLabChange={actions.handleLabChange}
                            />
                        </div>

                        </div>{/* grid end */}
                    </div>

                    {/* [우측] 라벨 편집 영역 — flex-[5], border 밀착 */}
                    <div className="flex-[5] grid place-items-center overflow-y-auto bg-[#F8FAFC] border-l border-slate-200 p-5 shadow-[inset_1px_0_10px_rgba(0,0,0,0.03)]">

                        <div className="w-full">
                            <IVLabelPreviewSection
                                bed={bed}
                                patientId={state.patientId}
                                onPatientIdChange={actions.setPatientId}
                                manualName={state.manualName}
                                onManualNameChange={actions.setManualName}
                                ageGender={state.ageGender}
                                printDate={state.printDate}
                                rapidRate={state.rapidRate}
                                rapidBaseFluid={state.rapidBaseFluid}
                                rapidMeds={state.rapidMeds}
                                maintRate={state.maintRate}
                                maintBaseFluid={state.maintBaseFluid}
                                maintMeds={state.maintMeds}
                                antibioticMeds={state.antibioticMeds}
                                otherMeds={state.otherMeds}
                                astResult={state.astResult}
                                labResults={state.labResults}
                                formatMeds={actions.formatMeds}
                            />
                        </div>

                    </div>
                </div>
            </div>
        </Modal>
    );
}
