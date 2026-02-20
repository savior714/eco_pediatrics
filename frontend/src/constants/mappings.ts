export const MEAL_MAP: Record<string, string> = {
    GENERAL: '일반식',
    SOFT: '죽',
    NPO: '금식'
};
// No changes here yet, I'll fix the logic in useStation.ts instead.

/** 서류 신청 항목 코드 → 한글 라벨 (스테이션 알림·사이드바·대시보드 공통) */
export const DOC_MAP: Record<string, string> = {
    RECEIPT: '진료비 계산서(영수증)',
    DETAIL: '진료비 세부내역서',
    CERT: '입퇴원확인서',
    DIAGNOSIS: '진단서',
    INITIAL: '초진기록지',
};

export const EXAM_TYPE_OPTIONS = [
    '흉부 X-Ray',
    '복부 X-Ray',
    '초음파',
    '소변검사',
    '혈액검사',
    '심전도 검사',
    'PCR 검사',
    '신속항원검사',
    '대변검사',
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
