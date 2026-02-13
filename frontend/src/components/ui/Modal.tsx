import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 transition-opacity duration-300",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className={cn(
                "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm max-h-[90dvh] overflow-hidden relative z-10 transform transition-all duration-300",
                isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4",
                className
            )}>
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                        <button
                            onClick={onClose}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full active:bg-slate-100 text-slate-400 touch-manipulation -mr-2"
                            aria-label="닫기"
                        >
                            <X size={22} />
                        </button>
                    </div>
                )}
                <div className="p-4 overflow-y-auto max-h-[calc(90dvh-4rem)]">
                    {children}
                </div>
            </div>
        </div>
    );
}
