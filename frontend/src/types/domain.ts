/**
 * Optimistic UI 상태 믹스인.
 * 서버 응답 대기 중인 임시 항목을 식별하기 위해 사용됩니다.
 */
export interface OptimisticStatus {
    /** 서버 ID (숫자) 또는 임시 string ID */
    id?: string | number;
    /** Optimistic 삽입 시 클라이언트가 부여한 임시 식별자 */
    tempId?: string;
    /** 서버 확정 전 낙관적 표시 여부 */
    isOptimistic?: boolean;
    /** 삭제 진행 중 여부 (UI 비활성화용) */
    isDeleting?: boolean;
}

/**
 * 병상(Bed) 도메인 모델.
 * 스테이션 대시보드에서 각 환자의 실시간 상태를 표현합니다.
 */
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

export interface VitalDataResponse extends OptimisticStatus {
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

/**
 * 입원 요약 정보.
 * 스테이션 목록 조회 API 응답에서 반환되는 환자별 요약 뷰입니다.
 */
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

/**
 * WebSocket 서버에서 수신되는 이벤트 유니온 타입.
 * 각 타입별로 data 페이로드 구조가 고정되어 있습니다.
 */
export type WsMessage =
    | { type: 'NEW_MEAL_REQUEST'; data: { id: number; room: string; request_type: string; admission_id: string; meal_date: string; meal_time: string; pediatric_meal_type?: string; guardian_meal_type?: string; requested_pediatric_meal_type?: string; requested_guardian_meal_type?: string; content?: string } }
    | { type: 'NEW_DOC_REQUEST'; data: { id: number; admission_id: string; room: string; request_items: string[]; created_at?: string; content?: string } }
    | { type: 'DOC_REQUEST_UPDATED'; data: { id: number; status: DocumentStatus; room?: string } }
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

/**
 * IV 라벨 혼합 약물 단위 도메인 모델.
 * IVLabelMedSection(편집용)과 IVLabelPreviewSection(미리보기용)이 공유하는 SSOT 타입.
 */
export interface MixedMed {
    id: string;
    name: string;
    amount: number;
    unit?: string;
    frequency?: 'QD' | 'BID' | 'TID';
}

export type MealRequestType = 'STATION_UPDATE' | 'GENERAL' | 'SOFT';
export type MealStatus = 'PENDING' | 'FULFILLED';
export type DocumentStatus = 'PENDING' | 'FULFILLED' | 'CANCELED';
export type MealTime = 'BREAKFAST' | 'LUNCH' | 'DINNER';

/**
 * 식사 신청 도메인 모델.
 * 보호자 앱에서 제출되며 스테이션에서 확인·처리됩니다.
 */
export interface MealRequest extends OptimisticStatus {
    id?: number;
    admission_id: string;
    request_type: MealRequestType;
    pediatric_meal_type?: string;
    guardian_meal_type?: string;
    requested_pediatric_meal_type?: string;
    requested_guardian_meal_type?: string;
    room_note?: string;
    meal_date: string;
    meal_time: MealTime;
    status: MealStatus;
    created_at?: string;
}

export interface DocumentRequest {
    id: number;
    admission_id: string;
    request_items: string[];
    status: DocumentStatus;
    created_at: string;
}
