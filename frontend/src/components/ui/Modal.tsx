'use client';

import React from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { Presence } from '@ark-ui/react/presence';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    unmountOnExit?: boolean;
    /** 다른 모달 위에 띄울 때 true (예: 환자 상세 모달 안에서 뜨는 체온/전실 모달) */
    elevation?: 'default' | 'nested';
}

/**
 * Ark UI 기반의 표준 모달 컴포넌트
 * - Headless 구조를 통해 상태 로직과 스타일링을 분리
 * - 접근성(WAI-ARIA) 자동 준수 (Focus Trap, Escape to Close 등)
 * - Ark UI v4+ 대응: Portal 및 Presence를 명시적으로 사용
 */
const elevationClasses = {
    default: { backdrop: 'z-modal-backdrop', content: 'z-modal-content' },
    nested: { backdrop: 'z-modal-backdrop-nested', content: 'z-modal-content-nested' },
};

export function Modal({ isOpen, onClose, title, children, className, unmountOnExit, elevation = 'default' }: ModalProps) {
    const z = elevationClasses[elevation];
    return (
        <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
            <Portal>
                <Presence present={isOpen} unmountOnExit={unmountOnExit}>
                    <Dialog.Backdrop
                        className={cn("fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300", z.backdrop)}
                    />
                    <Dialog.Positioner
                        className={cn("fixed inset-0 flex items-end sm:items-center justify-center px-0 sm:px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]", z.content)}
                    >
                        <Dialog.Content
                            className={cn(
                                "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm max-h-[90dvh] overflow-hidden transform transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
                                className
                            )}
                        >
                            {title && (
                                <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                                    <Dialog.Title className="font-bold text-lg text-slate-800">
                                        {title}
                                    </Dialog.Title>
                                    <Dialog.CloseTrigger asChild>
                                        <button
                                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400 touch-manipulation -mr-2"
                                            aria-label="닫기"
                                        >
                                            <X size={22} />
                                        </button>
                                    </Dialog.CloseTrigger>
                                </div>
                            )}
                            <Dialog.Description className="sr-only">
                                {title || "모달 창"} 상세 내용
                            </Dialog.Description>
                            <div className="p-4 overflow-y-auto max-h-[calc(90dvh-4rem)]">
                                {children}
                            </div>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Presence>
            </Portal>
        </Dialog.Root>
    );
}
