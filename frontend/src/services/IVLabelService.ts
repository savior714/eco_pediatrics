import { invoke } from '@tauri-apps/api/core';
import { getKSTNowString } from '@/utils/dateUtils';

export interface IVLabelData {
    name: string;
    room: string;
    ageGender: string;
    infusionRate: number; // cc/hr
    dropFactor: 20 | 60; // 20: Standard, 60: Micro
    patientId?: string;
    manualName?: string;
    fluidType?: string;
    mixMeds?: string;
    astCheck?: boolean;
    labResults?: string;
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
     * b-PAC SDK를 통해 라벨 미리보기 이미지를 생성합니다.
     * @returns 생성된 미리보기 이미지의 Base64 또는 로컬 경로
     */
    static async generatePreview(data: IVLabelData): Promise<string> {
        const gttMin = this.calculateGttFromCc(data.infusionRate, data.dropFactor);
        const info = `${data.infusionRate} cc/hr (${Math.round(gttMin)} gtt/min)`;

        try {
            // Tauri 명령 호출: iv_label_preview
            // 결과는 base64 이미지 스트링
            const previewBase64 = await invoke<string>('generate_iv_label_preview', {
                name: data.name,
                room: data.room,
                rate: info,
                ageGender: data.ageGender,
                date: getKSTNowString(),
                patientId: data.patientId,
                manualName: data.manualName,
                fluidType: data.fluidType,
                mixMeds: data.mixMeds,
                astCheck: data.astCheck,
                labResults: data.labResults
            });
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
        const gttMin = this.calculateGttFromCc(data.infusionRate, data.dropFactor);
        const info = `${data.infusionRate} cc/hr (${Math.round(gttMin)} gtt/min)`;

        try {
            await invoke('print_iv_label', {
                name: data.name,
                room: data.room,
                rate: info,
                ageGender: data.ageGender,
                date: getKSTNowString(),
                patientId: data.patientId,
                manualName: data.manualName,
                fluidType: data.fluidType,
                mixMeds: data.mixMeds,
                astCheck: data.astCheck,
                labResults: data.labResults
            });
        } catch (error) {
            console.error('라벨 인쇄 실패:', error);
            throw error;
        }
    }
}
