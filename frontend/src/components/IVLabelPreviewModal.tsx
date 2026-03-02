import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { Bed } from '@/types/domain';
import { formatPatientDemographics } from '@/utils/dateUtils';
import { Printer, X, Loader2, Info } from 'lucide-react';
import { toaster } from './ui/Toast';

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
                dropFactor
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
    }, [isOpen, dropFactor]); // Rate 변경 시에는 디바운스 적용 권장하나 일단 간단히 구현

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const data: IVLabelData = {
                name: bed.name,
                room: `${bed.room}호`,
                ageGender,
                infusionRate: rate,
                dropFactor
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
            title="수액 라벨 미리보기"
            className="w-[500px]"
            elevation="nested"
        >
            <div className="p-6 flex flex-col gap-6">
                {/* 인쇄 설정 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500">수액 세트 선택</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setDropFactor(60)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dropFactor === 60 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                            >
                                Micro (60)
                            </button>
                            <button
                                onClick={() => setDropFactor(20)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dropFactor === 20 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                            >
                                Standard (20)
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500">속도 설정 (cc/hr)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={rate || ''}
                                onChange={(e) => setRate(Number(e.target.value))}
                                onBlur={generatePreview}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">cc/hr</span>
                        </div>
                    </div>
                </div>

                {/* 환산 정보 */}
                <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3 border border-indigo-100">
                    <Info className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-indigo-900 leading-relaxed font-bold">
                            현재 {rate} cc/hr 속도는 분당 <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-200">{Math.round(gttMin)} gtt</span>입니다.
                        </p>
                        <p className="text-[10px] text-indigo-400 font-medium">
                            * {dropFactor === 60 ? '소아용(Micro) 세트: 1 cc/hr = 1 gtt' : '성인용(Standard) 세트: 3 cc/hr = 1 gtt'} 원칙 적용
                        </p>
                    </div>
                </div>

                {/* 미리보기 영역 */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500">라벨 미리보기</label>
                    <div className="aspect-[2/1] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin text-slate-400" size={32} />
                                <span className="text-[10px] text-slate-400 font-bold">미리보기 생성 중...</span>
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt="Label Preview" className="w-full h-full object-contain p-4" />
                        ) : (
                            <span className="text-[10px] text-slate-400 font-bold">속도를 입력하면 미리보기가 생성됩니다.</span>
                        )}
                    </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={!previewUrl || isPrinting}
                        className={`flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all ${(!previewUrl || isPrinting) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
