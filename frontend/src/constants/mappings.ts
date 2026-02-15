export const MEAL_MAP: Record<string, string> = {
    GENERAL: '일반식',
    SOFT: '죽',
    NPO: '금식'
};
// No changes here yet, I'll fix the logic in useStation.ts instead.

export const DOC_MAP: Record<string, string> = {
    RECEIPT: '영수증',
    DETAIL: '세부내역서',
    CERT: '진단서',
    DIAGNOSIS: '소견서',
    INITIAL: '기록지'
};

export const EXAM_TYPE_OPTIONS = [
    '흉부 X-Ray',
    '복부 X-Ray',
    '초음파',
    '소변검사',
    '대변검사',
    '혈액검사',
    'PCR 검사',
    '신속항원 검사',
] as const;

export const ROOM_NUMBERS = [
    '301', '302', '303', '304', '305', '306', '307', '308', '309',
    '310-1', '310-2',
    '311-1', '311-2', '311-3', '311-4',
    '312', '313', '314',
    '315-1', '315-2', '315-3', '315-4',
    '401-1', '401-2', '401-3', '401-4',
    '402-1', '402-2', '402-3', '402-4'
];
