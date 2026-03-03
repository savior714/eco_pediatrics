'use client';

import React from 'react';
import { Checkbox as ArkCheckbox } from '@ark-ui/react/checkbox';
import { Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CheckboxProps {
    label?: string;
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean | 'indeterminate') => void;
    className?: string;
    id?: string;
    disabled?: boolean;
}

/**
 * Ark UI 기반의 표준 체크박스 컴포넌트
 */
export function Checkbox({ label, checked, onCheckedChange, className, id, disabled }: CheckboxProps) {
    return (
        <ArkCheckbox.Root
            id={id}
            checked={checked}
            onCheckedChange={(details) => onCheckedChange?.(details.checked)}
            disabled={disabled}
            className={cn("flex items-center gap-2 cursor-pointer group", className)}
        >
            <ArkCheckbox.Control className="w-5 h-5 rounded-md border-2 border-slate-200 bg-white flex items-center justify-center transition-all group-hover:border-slate-300 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed">
                <ArkCheckbox.Indicator>
                    <Check size={14} className="text-white" strokeWidth={3} />
                </ArkCheckbox.Indicator>
            </ArkCheckbox.Control>
            {label && (
                <ArkCheckbox.Label className="text-xs font-bold text-slate-600 select-none group-data-[disabled]:opacity-50">
                    {label}
                </ArkCheckbox.Label>
            )}
            <ArkCheckbox.HiddenInput />
        </ArkCheckbox.Root>
    );
}
