import { useState } from 'react';
import { AstResult, Bed, LabResultMap, MixedMed } from '@/types/domain';
import { IVLabelService, IVLabelData } from '@/services/IVLabelService';
import { toaster } from '@/components/ui/Toast';
import { formatPatientDemographics, getKSTNowString } from '@/utils/dateUtils';

/**
 * 수액 라벨 비즈니스 로직 및 상태 관리를 담당하는 커스텀 훅.
 * @param bed 침대/환자 정보
 * @param currentRate 현재 설정된 수액 속도
 * @param onClose 모달 닫기 콜백
 * @returns 라벨 미리보기 상태 및 조작 액션
 */
export function useIVLabel(bed: Bed, currentRate: number | undefined, onClose: () => void) {
    const [patientId, setPatientId] = useState<string>('');
    const [manualName, setManualName] = useState<string>(bed.name || '');
    const [astResult, setAstResult] = useState<AstResult>('NONE');
    const [isPrinting, setIsPrinting] = useState(false);

    // [1] 급속수액요법 (Rapid) 상태
    const [rapidBaseFluid, setRapidBaseFluid] = useState<string>('');
    const [rapidRate, setRapidRate] = useState<number>(0);
    const [rapidMeds, setRapidMeds] = useState<MixedMed[]>([]);

    // [2] 유지수액요법 (Maint) 상태
    const [maintBaseFluid, setMaintBaseFluid] = useState<string>('');
    const [maintRate, setMaintRate] = useState<number>(currentRate || 0);
    const [maintMeds, setMaintMeds] = useState<MixedMed[]>([]);

    // [3] 항생제 (Anti) 상태
    const [antibioticMeds, setAntibioticMeds] = useState<MixedMed[]>([]);

    // [4] 기타 약물 (Other) 상태
    const [otherMeds, setOtherMeds] = useState<MixedMed[]>([]);

    // [5] 검사 항목 (Lab) 상태
    const [labResults, setLabResults] = useState<LabResultMap>({
        cbc: { checked: false, value: '' },
        lft: { checked: false, value: '' },
        electrolyte: { checked: false, value: '' },
        ua: { checked: false, value: '' },
        bcx: { checked: false, value: '' },
        stool: { checked: false, value: '' },
        resp: { checked: false, value: '' }
    });

    const ageGender = formatPatientDemographics(bed.dob, bed.gender);
    const printDate = getKSTNowString().split(' ')[0];

    /**
     * 혼합 약물 목록을 라벨 표시용 문자열로 포맷팅한다.
     * @param meds 혼합 약물 배열
     */
    const formatMeds = (meds: MixedMed[]) => 
        meds.map(m => `${m.name} ${m.amount}${m.unit}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ');

    /** 
     * 검사 항목 체크박스 또는 결과값을 업데이트한다. 
     */
    const handleLabChange = (id: string, field: 'checked' | 'value', val: boolean | string) => {
        setLabResults(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: val }
        }));
    };

    /** 
     * 전체 데이터를 수집하여 라벨 인쇄 IPC를 호출한다. 
     */
    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 모든 약물 섹션 통합
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
                infusionRate: rapidRate || maintRate, // 급속 속도 우선
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
            
            console.log('[useIVLabel] IV Label print command sent successfully:', data);
            
            toaster.create({ 
                title: '인쇄 시작', 
                description: '라벨 인쇄 명령이 성공적으로 전송되었습니다.', 
                type: 'success' 
            });
            
            // onClose(); // 인쇄 후 모달을 유지하기 위해 주석 처리 또는 제거
        } catch (error) {
            console.error('[useIVLabel] 라벨 인쇄 실패:', error);
            toaster.create({ 
                title: '인쇄 실패', 
                description: '프린터 연결 상태를 확인해 주세요.', 
                type: 'error' 
            });
        } finally {
            setIsPrinting(false);
        }
    };

    return {
        state: {
            patientId,
            manualName,
            astResult,
            isPrinting,
            rapidBaseFluid,
            rapidRate,
            rapidMeds,
            maintBaseFluid,
            maintRate,
            maintMeds,
            antibioticMeds,
            otherMeds,
            labResults,
            ageGender,
            printDate
        },
        actions: {
            setPatientId,
            setManualName,
            setAstResult,
            setRapidBaseFluid,
            setRapidRate,
            setRapidMeds,
            setMaintBaseFluid,
            setMaintRate,
            setMaintMeds,
            setAntibioticMeds,
            setOtherMeds,
            handleLabChange,
            handlePrint,
            formatMeds
        }
    };
}
