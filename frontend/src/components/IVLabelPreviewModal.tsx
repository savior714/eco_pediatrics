import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { Bed } from '@/types/domain';
import { formatPatientDemographics } from '@/utils/dateUtils';
import { Printer, X, Loader2, Info, FlaskConical, Beaker, ClipboardList } from 'lucide-react';
import { toaster } from './ui/Toast';
import { Field } from './ui/Field';
import { Select } from './ui/Select';
import { Checkbox } from './ui/Checkbox';

interface IVLabelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bed: Bed;
    currentRate?: number; // 대시보드에서 전달받은 현재 수액 속도
}

export function IVLabelPreviewModal({ isOpen, onClose, bed, currentRate }: IVLabelPreviewModalProps) {
    const [rate, setRate] = useState<number>(currentRate || 0);
    const [dropFactor, setDropFactor] = useState<20 | 60>(60); // 기본 Micro set
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // 신규 필드 상태
    const [patientId, setPatientId] = useState<string>('');
    const [manualName, setManualName] = useState<string>('');
    const [fluidType, setFluidType] = useState<string[]>([]);
    const [mixMeds, setMixMeds] = useState<string>('');
    const [astCheck, setAstCheck] = useState<boolean>(false);
    const [labResults, setLabResults] = useState<Record<string, string>>({
        cbc: '', rb: '', ua: '', bcx: '', stool: '', resp: ''
    });

    const FLUID_OPTIONS = [
        { label: '급속수액요법용 수액', value: 'RAPID' },
        { label: '유지용법 수액', value: 'MAINTENANCE' },
    ];

    const ageGender = formatPatientDemographics(bed.dob, bed.gender);
    const gttMin = IVLabelService.calculateGttFromCc(rate, dropFactor);

    const generatePreview = async () => {
        if (rate <= 0) return;
        setIsLoading(true);
        try {
            const data: IVLabelData = {
                name: bed.name,
                room: `${bed.room}호`,
                ageGender,
                infusionRate: rate,
                dropFactor,
                patientId,
                manualName,
                fluidType: fluidType[0],
                mixMeds,
                astCheck,
                labResults: JSON.stringify(labResults)
            };
            const url = await IVLabelService.generatePreview(data);
            setPreviewUrl(url);
        } catch (error) {
            toaster.create({ title: '미리보기 생성 실패', description: 'b-PAC SDK 연결을 확인해 주세요.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && rate > 0) {
            generatePreview();
        }
    }, [isOpen, dropFactor, astCheck, fluidType]);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const data: IVLabelData = {
                name: bed.name,
                room: `${bed.room}호`,
                ageGender,
                infusionRate: rate,
                dropFactor,
                patientId,
                manualName,
                fluidType: fluidType[0],
                mixMeds,
                astCheck,
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
            title="수액 라벨 상세 설정 및 인쇄"
            className="w-[600px] max-h-[90vh] overflow-y-auto"
            elevation="nested"
        >
            <div className="p-6 flex flex-col gap-8">
                {/* 1. 기본 식별 정보 (Read-only + ID/Name 입력) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-teal-500 rounded-full" />
                        <h3 className="text-sm font-bold text-slate-700">환자 식별 정보</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400">병실 / SEX / AGE</span>
                            <span className="text-xs font-bold text-slate-700">{bed.room}호 / {ageGender}</span>
                        </div>
                        <Field
                            label="환자번호"
                            placeholder="직접 입력"
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                        />
                    </div>
                    <Field
                        label="이름 (실무용 수동 입력)"
                        placeholder="기록에 남지 않음 (성함 전체 입력 가능)"
                        helperText="시스템 마스킹을 우회하여 실무용 라벨에만 표시됩니다."
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                    />
                </section>

                {/* 2. 주입 설정 */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                        <h3 className="text-sm font-bold text-slate-700">주입 설정</h3>
                    </div>
                    <Select
                        label="수액 종류"
                        options={FLUID_OPTIONS}
                        value={fluidType}
                        onValueChange={setFluidType}
                        placeholder="수액 종류 선택"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">수액 세트</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl h-11">
                                <button
                                    onClick={() => setDropFactor(60)}
                                    className={`flex-1 text-[10px] font-bold rounded-lg transition-all ${dropFactor === 60 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                    Micro (60)
                                </button>
                                <button
                                    onClick={() => setDropFactor(20)}
                                    className={`flex-1 text-[10px] font-bold rounded-lg transition-all ${dropFactor === 20 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                    Standard (20)
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">속도 (cc/hr)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={rate || ''}
                                    onChange={(e) => setRate(Number(e.target.value))}
                                    onBlur={generatePreview}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-xs"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">cc/hr</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3 border border-indigo-100">
                        <Info className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                        <div className="flex flex-col gap-1">
                            <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                                분당 <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-200">{Math.round(gttMin)} gtt</span> (세트 환산 적용)
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. 약물 & AST */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-purple-500 rounded-full" />
                        <h3 className="text-sm font-bold text-slate-700">혼합 약물 및 AST</h3>
                    </div>
                    <Field
                        label="Mix되는 약물들"
                        placeholder="예: KCl 10ml, NaCl 20ml 등 직접 입력"
                        value={mixMeds}
                        onChange={(e) => setMixMeds(e.target.value)}
                    />
                    <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                        <Checkbox
                            label="AST (항생제 감수성 검사) 필요"
                            checked={astCheck}
                            onCheckedChange={(checked) => setAstCheck(checked === true)}
                        />
                    </div>
                </section>

                {/* 4. 검사 결과 내역 */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                        <h3 className="text-sm font-bold text-slate-700">검사 결과 (Label 하단 표기)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries({
                            cbc: 'CBC',
                            rb: 'R-B',
                            ua: 'UA&U/Cx.',
                            bcx: 'B/Cx.',
                            stool: 'Stool PCR/Cx.',
                            resp: 'Resp. PCR V/B'
                        }).map(([id, label]) => (
                            <div key={id} className="relative group">
                                <label className="absolute left-3 -top-2 px-1 bg-white text-[9px] font-bold text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                    {label}
                                </label>
                                <input
                                    type="text"
                                    value={labResults[id]}
                                    onChange={(e) => setLabResults(prev => ({ ...prev, [id]: e.target.value }))}
                                    className="w-full p-2.5 pt-3.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-500/5 transition-all"
                                    placeholder="결과 입력"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. 미리보기 영역 */}
                <section className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">라벨 미리보기</label>
                    <div className="aspect-[2/1] bg-slate-900 rounded-2xl border-4 border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin text-teal-500" size={32} />
                                <span className="text-[10px] text-slate-500 font-bold">Generating Real-time Label...</span>
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Label Preview" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-30">
                                <Printer size={48} className="text-slate-500" />
                                <span className="text-[10px] text-slate-500 font-bold whitespace-pre-center text-center">
                                    설정 값을 입력하면{"\n"}Brother b-PAC 실시간 미리보기가 생성됩니다
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* 액션 버튼 */}
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting || isLoading}
                        className={`flex-[2] py-4 bg-teal-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-teal-100 flex items-center justify-center gap-2 hover:bg-teal-700 transition-all active:scale-[0.98] ${(isPrinting || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isPrinting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Printer size={20} />
                        )}
                        인쇄하기
                    </button>
                </div>
            </div>
        </Modal>
    );
}
