export interface OptimisticStatus {
    id?: string | number; // Optional as it might be a temp string or server number
    tempId?: string;
    isOptimistic?: boolean;
    isDeleting?: boolean;
}

export interface Bed {
    id: string;
    room: string;
    name: string;
    temp: number | null;
    drops: number | null;
    status: 'normal' | 'fever';
    token: string;
    latest_temp?: number;
    had_fever_in_6h?: boolean;
    latest_meal?: MealRequest;
    last_vital_at?: string;
    dob?: string;
    gender?: string;
    attending_physician?: string;
}

export interface Notification {
    id: string;
    room: string;
    time: string;
    content: string;
    type: 'meal' | 'doc' | 'call' | 'emergency';
    admissionId?: string;
}

export interface VitalData extends OptimisticStatus {
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

export interface ExamScheduleItem extends OptimisticStatus {
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
    last_vital_at?: string;
    dob?: string;
    gender?: string;
    attending_physician?: string;
}

export type WsMessageType = 'NEW_MEAL_REQUEST' | 'NEW_DOC_REQUEST' | 'DOC_REQUEST_UPDATED' | 'IV_PHOTO_UPLOADED' | 'NEW_IV' | 'NEW_VITAL' | 'NEW_EXAM_SCHEDULE' | 'DELETE_EXAM_SCHEDULE' | 'ADMISSION_TRANSFERRED' | 'ADMISSION_DISCHARGED' | 'MEAL_UPDATED' | 'REFRESH_DASHBOARD';

export type WsMessage =
    | { type: 'NEW_MEAL_REQUEST'; data: { id: number; room: string; request_type: string; admission_id: string; meal_date: string; meal_time: string; pediatric_meal_type?: string; guardian_meal_type?: string; requested_pediatric_meal_type?: string; requested_guardian_meal_type?: string; content?: string } }
    | { type: 'NEW_DOC_REQUEST'; data: { id: number; admission_id: string; room: string; request_items: string[]; created_at?: string; content?: string } }
    | { type: 'DOC_REQUEST_UPDATED'; data: { id: number; status: string; room?: string } }
    | { type: 'IV_PHOTO_UPLOADED'; data: { admission_id: string; room_number: string; photo_url: string } }
    | { type: 'NEW_IV'; data: { id: number; infusion_rate: number; room: string | null; admission_id: string; photo_url?: string; created_at?: string } }
    | { type: 'NEW_VITAL'; data: { id: number; admission_id: string; temperature: number; has_medication: boolean; medication_type?: string; recorded_at: string; room?: string } }
    | { type: 'NEW_EXAM_SCHEDULE'; data: ExamScheduleItem & { room: string } }
    | { type: 'DELETE_EXAM_SCHEDULE'; data: { id: number; admission_id: string; room: string } }
    | { type: 'ADMISSION_TRANSFERRED'; data: { admission_id: string; old_room: string; new_room: string } }
    | { type: 'ADMISSION_DISCHARGED'; data: { admission_id: string; room: string } }
    | { type: 'MEAL_UPDATED'; data: MealRequest }
    | { type: 'REFRESH_DASHBOARD'; data: { admission_id: string } };

export interface IVRecord {
    id: number;
    admission_id: string;
    photo_url: string;
    infusion_rate: number;
    created_at: string;
}

export interface MealRequest extends OptimisticStatus {
    id?: number;
    admission_id: string;
    request_type: string;
    pediatric_meal_type?: string;
    guardian_meal_type?: string;
    requested_pediatric_meal_type?: string;
    requested_guardian_meal_type?: string;
    room_note?: string;
    meal_date: string;
    meal_time: string;
    status: string;
    created_at?: string;
}

export interface DocumentRequest {
    id: number;
    admission_id: string;
    request_items: string[];
    status: string;
    created_at: string;
}
