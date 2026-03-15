import { invoke } from '@tauri-apps/api/core';
import { getKSTNowString } from '@/utils/dateUtils';

export interface IVLabelData {
    name: string;
    room: string;
    ageGender: string;
    infusionRate: number; // cc/hr
    dropFactor: 60; // Micro 고정
    patientId?: string;
    manualName?: string;
    fluidType?: string; // RAPID | MAINTENANCE
    mixMeds?: string;
    astCheck?: boolean; // AST 결과 여부
    astResult?: 'NONE' | 'NEG' | 'POS'; // 상세 결과
    labResults?: string; // JSON string of lab results
}

export class IVLabelService {
    /**
     * cc/hr를 gtt/min으로 변환합니다.
     * 공식: gtt/min = (cc/hr * DropFactor) / 60
     */
    static calculateGttFromCc(ccHr: number, dropFactor: number): number {
        return (ccHr * dropFactor) / 60;
    }

    /**
     * gtt/min을 cc/hr로 변환합니다.
     * 공식: cc/hr = (gtt/min * 60) / DropFactor
     */
    static calculateCcFromGtt(gttMin: number, dropFactor: number): number {
        return (gttMin * 60) / dropFactor;
    }

    /**
     * Tauri invoke 공통 파라미터를 빌드합니다.
     * generatePreview, printLabel 양쪽에서 동일한 페이로드를 사용하므로 단일 출처로 관리합니다.
     */
    private static buildInvokeParams(data: IVLabelData): Record<string, unknown> {
        return {
            name: data.name,
            room: data.room,
            rate: `${data.infusionRate} cc/hr`,
            ageGender: data.ageGender,
            date: getKSTNowString(),
            patientId: data.patientId,
            manualName: data.manualName,
            fluidType: data.fluidType,
            mixMeds: data.mixMeds,
            astCheck: data.astCheck,
            astResult: data.astResult,
            labResults: data.labResults,
        };
    }

    /**
     * b-PAC SDK를 통해 라벨 미리보기 이미지를 생성합니다.
     * @returns 생성된 미리보기 이미지의 Base64 데이터 URI
     */
    static async generatePreview(data: IVLabelData): Promise<string> {
        try {
            const previewBase64 = await invoke<string>(
                'generate_iv_label_preview',
                IVLabelService.buildInvokeParams(data)
            );
            return `data:image/png;base64,${previewBase64}`;
        } catch (error) {
            console.error('라벨 미리보기 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 실제로 라벨을 인쇄합니다.
     */
    static async printLabel(data: IVLabelData): Promise<void> {
        try {
            await invoke('print_iv_label', IVLabelService.buildInvokeParams(data));
        } catch (error) {
            console.error('라벨 인쇄 실패:', error);
            throw error;
        }
    }
}
