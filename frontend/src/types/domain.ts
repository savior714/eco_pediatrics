export interface Bed {
    id: string;
    room: string;
    name: string;
    temp: number;
    drops: number;
    status: 'normal' | 'fever';
    token: string;
}

export interface Notification {
    id: string;
    room: string;
    time: string;
    content: string;
    type: 'meal' | 'doc' | 'call' | 'emergency';
}

export interface VitalData {
    time: string;
    temperature: number;
    has_medication: boolean;
    medication_type?: string;
    recorded_at: string;
}

export interface VitalDataResponse {
    recorded_at: string;
    temperature: number;
    has_medication: boolean;
    medication_type?: string;
}

export interface ExamScheduleItem {
    id: number;
    admission_id: string;
    scheduled_at: string;
    name: string;
    note?: string;
}

export interface LastUploadedIv {
    admissionId: string;
    url: string;
}

export interface AdmissionSummary {
    id: string;
    patient_name_masked: string;
    room_number: string;
    access_token: string;
    latest_iv?: {
        infusion_rate: number;
    }
}

export type WsMessageType = 'NEW_MEAL_REQUEST' | 'NEW_DOC_REQUEST' | 'IV_PHOTO_UPLOADED' | 'NEW_IV' | 'NEW_VITAL';

export type WsMessage =
    | { type: 'NEW_MEAL_REQUEST'; data: { room: string; request_type: string } }
    | { type: 'NEW_DOC_REQUEST'; data: { room: string; request_items: string[] } }
    | { type: 'IV_PHOTO_UPLOADED'; data: { admission_id: string; room_number: string; photo_url: string } }
    | { type: 'NEW_IV'; data: { infusion_rate: number; room: string } }
    | { type: 'NEW_VITAL'; data: VitalDataResponse };

export interface IVRecord {
    id: number;
    admission_id: string;
    photo_url: string;
    infusion_rate: number;
    created_at: string;
}

export interface MealRequest {
    id: number;
    admission_id: string;
    request_type: string;
    created_at: string;
}

export interface DocumentRequest {
    id: number;
    admission_id: string;
    request_items: string[];
    created_at: string;
}
