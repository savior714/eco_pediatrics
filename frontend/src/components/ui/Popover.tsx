'use client';

import React from 'react';
import { Popover as ArkPopover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import { Presence } from '@ark-ui/react/presence';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PopoverProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

/**
 * Ark UI 기반의 표준 팝오버 컴포넌트
 * - 상세 정보 툴팁이나 인터랙티브한 보조창에 활용
 * - Floating UI 로직 내장 (자동 위치 조정)
 */
export function Popover({ trigger, children, title, className }: PopoverProps) {
    return (
        <ArkPopover.Root positioning={{ gutter: 8 }}>
            <ArkPopover.Trigger asChild>
                {trigger}
            </ArkPopover.Trigger>

            <Portal>
                <ArkPopover.Positioner className="z-dropdown">
                    <ArkPopover.Content
                        className={cn(
                            "bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[240px] max-w-sm animate-in fade-in zoom-in-95 duration-200 outline-none",
                            className
                        )}
                    >
                        <ArkPopover.Arrow>
                            <ArkPopover.ArrowTip className="bg-white border-t border-l border-slate-100" />
                        </ArkPopover.Arrow>

                        {title && (
                            <div className="flex items-center justify-between mb-2">
                                <ArkPopover.Title className="text-sm font-bold text-slate-800">
                                    {title}
                                </ArkPopover.Title>
                                <ArkPopover.CloseTrigger className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                                    <X size={14} />
                                </ArkPopover.CloseTrigger>
                            </div>
                        )}

                        <ArkPopover.Description className="text-xs text-slate-600 font-medium leading-relaxed">
                            {children}
                        </ArkPopover.Description>
                    </ArkPopover.Content>
                </ArkPopover.Positioner>
            </Portal>
        </ArkPopover.Root>
    );
}
