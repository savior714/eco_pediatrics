'use client';

import React, { useMemo } from 'react';
import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { Check, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

interface SelectProps {
    label?: string;
    options: SelectOption[];
    value?: string[];
    onValueChange?: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Ark UI 기반의 표준 셀렉트 컴포넌트
 * - Ark UI v4+ 대응: createListCollection 사용
 * - Headless 구조로 상태와 뷰 분리
 */
export function Select({ label, options, value, onValueChange, placeholder, className }: SelectProps) {
    const collection = useMemo(() => createListCollection({ items: options }), [options]);

    return (
        <ArkSelect.Root
            collection={collection}
            value={value}
            onValueChange={(details) => onValueChange?.(details.value)}
            positioning={{ gutter: 4, sameWidth: true }}
            className={cn("w-full", className)}
        >
            {label && (
                <ArkSelect.Label className="text-xs font-bold text-slate-500 mb-1.5 block ml-1">
                    {label}
                </ArkSelect.Label>
            )}
            <ArkSelect.Control>
                <ArkSelect.Trigger
                    className="w-full h-11 px-4 flex items-center justify-between rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-700 transition-all hover:border-slate-200 focus:border-teal-500 outline-none active:scale-[0.99]"
                >
                    <ArkSelect.ValueText placeholder={placeholder} />
                    <ArkSelect.Indicator className="text-slate-400">
                        <ChevronDown size={18} />
                    </ArkSelect.Indicator>
                </ArkSelect.Trigger>
            </ArkSelect.Control>
            <Portal>
                <ArkSelect.Positioner className="z-dropdown" style={{ zIndex: 4000 }}>
                    <ArkSelect.Content className="bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                        <ArkSelect.ItemGroup>
                            {options.map((item) => (
                                <ArkSelect.Item
                                    key={item.value}
                                    item={item}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-600 cursor-pointer transition-colors hover:bg-slate-50 data-[highlighted]:bg-slate-50 data-[state=selected]:text-teal-600 data-[state=selected]:bg-teal-50"
                                >
                                    <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
                                    <ArkSelect.ItemIndicator>
                                        <Check size={14} />
                                    </ArkSelect.ItemIndicator>
                                </ArkSelect.Item>
                            ))}
                        </ArkSelect.ItemGroup>
                    </ArkSelect.Content>
                </ArkSelect.Positioner>
            </Portal>
        </ArkSelect.Root>
    );
}
