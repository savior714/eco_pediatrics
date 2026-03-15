/**
 * 프로젝트 공통 UI 유틸리티
 * cn: clsx + tailwind-merge 조합 클래스 병합 헬퍼 (SSOT)
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
