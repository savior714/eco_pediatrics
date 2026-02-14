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
