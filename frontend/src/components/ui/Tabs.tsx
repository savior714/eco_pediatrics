'use client';

import React, { useMemo } from 'react';
import { Tabs as ArkTabs } from '@ark-ui/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TabOption {
    label: string;
    value: string;
    content: React.ReactNode;
    disabled?: boolean;
}

interface TabsProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    tabs: TabOption[];
    className?: string;
}

/**
 * Ark UI 기반의 표준 탭 컴포넌트
 * - Headless 구조로 상태와 뷰 분리
 * - 스타일링은 Tailwind CSS의 커스텀 variant(selected:, active:) 활용
 */
export function Tabs({ defaultValue, value, onValueChange, tabs, className }: TabsProps) {
    return (
        <ArkTabs.Root
            defaultValue={defaultValue}
            value={value}
            onValueChange={(details) => onValueChange?.(details.value)}
            className={cn("w-full flex flex-col", className)}
        >
            <ArkTabs.List className="flex bg-slate-100 p-1 rounded-2xl gap-1 mb-4 select-none self-start">
                {tabs.map((tab) => (
                    <ArkTabs.Trigger
                        key={tab.value}
                        value={tab.value}
                        disabled={tab.disabled}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer outline-none whitespace-nowrap",
                            "text-slate-500 hover:text-slate-700",
                            "data-[selected]:bg-white data-[selected]:text-teal-600 data-[selected]:shadow-sm"
                        )}
                    >
                        {tab.label}
                    </ArkTabs.Trigger>
                ))}
                <ArkTabs.Indicator className="hidden" />
            </ArkTabs.List>

            {tabs.map((tab) => (
                <ArkTabs.Content
                    key={tab.value}
                    value={tab.value}
                    className="flex-1 outline-none animate-in fade-in slide-in-from-top-1 duration-300"
                >
                    {tab.content}
                </ArkTabs.Content>
            ))}
        </ArkTabs.Root>
    );
}
