'use client';

import type { MealRequest } from '@/types/domain';

/** YYYY-MM-DD 포맷 */
export const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/** 표시용 MM/DD (요일) */
export const formatDisplayDate = (d: Date): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

export const MEAL_TIMES = ['LUNCH', 'BREAKFAST', 'DINNER'] as const;

export const PEDIATRIC_OPTIONS = ['일반식', '죽1', '죽2', '죽3', '선택 안함'];
export const GUARDIAN_OPTIONS = ['일반식', '선택 안함'];

export type MealMatrix = Record<string, Record<string, MealRequest>>;

/** 비고 읽기: LUNCH 우선, 없으면 BREAKFAST/DINNER에서 첫 번째 존재하는 room_note 사용 */
export function getRoomNoteFromMatrix(matrix: MealMatrix, admissionId: string): string {
    for (const time of MEAL_TIMES) {
        const note = matrix[admissionId]?.[time]?.room_note;
        if (note !== undefined && note !== '') return note;
    }
    return '';
}

/** 비고 저장 시 사용할 meal_time: 기존 레코드가 있는 시간대 우선, 없으면 LUNCH */
export function getTargetMealTimeForNote(matrix: MealMatrix, admissionId: string): string {
    if (matrix[admissionId]?.['LUNCH']) return 'LUNCH';
    if (matrix[admissionId]?.['BREAKFAST']) return 'BREAKFAST';
    if (matrix[admissionId]?.['DINNER']) return 'DINNER';
    return 'LUNCH';
}
