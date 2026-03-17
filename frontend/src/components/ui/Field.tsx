'use client';

import React from 'react';
import { Field as ArkField } from '@ark-ui/react/field';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    helperText?: string;
    errorText?: string;
    invalid?: boolean;
    /** 루트 wrapper에 적용할 클래스 (width, margin 등 레이아웃 제어) */
    rootClassName?: string;
    /** input 엘리먼트에 직접 적용할 클래스 (height, color 등) */
    inputClassName?: string;
}

/**
 * Ark UI 기반의 표준 필드(Input) 컴포넌트
 * - Label, Input, HelperText, ErrorText를 포함하는 논리적 단위
 * - WAI-ARIA 상태 관리 자동화
 */
export function Field({ label, helperText, errorText, invalid, className, rootClassName, inputClassName, id, ...props }: FieldProps) {
    return (
        <ArkField.Root id={id} invalid={invalid} className={cn("w-full space-y-1.5", rootClassName, className)}>
            {label && (
                <ArkField.Label className="block text-xs font-bold text-slate-500 ml-1">
                    {label}
                </ArkField.Label>
            )}
            <ArkField.Input asChild>
                <input
                    {...props}
                    className={cn(
                        "w-full p-3 border-2 border-slate-100 rounded-xl bg-white text-xs font-bold text-slate-700 transition-all outline-none",
                        "hover:border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10",
                        "data-[invalid]:border-red-500 data-[invalid]:focus:ring-red-500/10",
                        inputClassName
                    )}
                />
            </ArkField.Input>
            {helperText && !invalid && (
                <ArkField.HelperText className="text-[10px] text-slate-400 ml-1">
                    {helperText}
                </ArkField.HelperText>
            )}
            {errorText && invalid && (
                <ArkField.ErrorText className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in slide-in-from-top-1">
                    {errorText}
                </ArkField.ErrorText>
            )}
        </ArkField.Root>
    );
}
