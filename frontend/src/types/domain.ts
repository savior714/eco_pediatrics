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

export interface WsMessage {
    type: WsMessageType;
    data: any; // We can be more specific if needed, but 'any' with type guard is okay for now or specific interfaces
}

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
