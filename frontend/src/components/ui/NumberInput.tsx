'use client';

import React from 'react';
import { NumberInput as ArkNumberInput } from '@ark-ui/react/number-input';
import { Field as ArkField } from '@ark-ui/react/field';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronUp, ChevronDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NumberInputProps {
    label?: string;
    defaultValue?: string;
    value?: string;
    onValueChange?: (details: ArkNumberInput.ValueChangeDetails) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
    invalid?: boolean;
}

/**
 * Ark UI 기반의 표준 수치 입력 컴포넌트
 * - 증감 버튼 제어 및 WAI-ARIA 상태 관리
 * - 체온, 수액 속도 등 정밀한 수치 입력에 최적화
 */
export function NumberInput({ label, defaultValue, value, onValueChange, min, max, step, placeholder, className, invalid }: NumberInputProps) {
    return (
        <ArkField.Root invalid={invalid} className={cn("w-full space-y-1.5", className)}>
            {label && (
                <ArkField.Label className="block text-xs font-bold text-slate-500 ml-1">
                    {label}
                </ArkField.Label>
            )}
            <ArkNumberInput.Root
                defaultValue={defaultValue}
                value={value}
                onValueChange={onValueChange}
                min={min}
                max={max}
                step={step}
                className="w-full relative group"
            >
                <div className="relative flex items-center">
                    <ArkNumberInput.Input
                        placeholder={placeholder}
                        className={cn(
                            "w-full p-3.5 border-2 border-slate-100 rounded-xl bg-white text-base font-bold text-slate-700 transition-all outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            "hover:border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10",
                            "data-[invalid]:border-red-500 data-[invalid]:focus:ring-red-500/10"
                        )}
                    />
                </div>
            </ArkNumberInput.Root>
        </ArkField.Root>
    );
}
