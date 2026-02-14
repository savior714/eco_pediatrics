export interface Bed {
    id: string;
    room: string;
    name: string;
    temp: number;
    drops: number;
    status: 'normal' | 'fever';
    token: string;
    latest_temp?: number;
    had_fever_in_6h?: boolean;
    latest_meal?: MealRequest;
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
    display_name: string;
    room_number: string;
    access_token: string;
    latest_iv?: {
        infusion_rate: number;
    };
    latest_temp?: number;
    had_fever_in_6h?: boolean;
    latest_meal?: MealRequest;
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
    pediatric_meal_type?: string;
    guardian_meal_type?: string;
    room_note?: string;
    created_at: string;
}

export interface DocumentRequest {
    id: number;
    admission_id: string;
    request_items: string[];
    created_at: string;
}
