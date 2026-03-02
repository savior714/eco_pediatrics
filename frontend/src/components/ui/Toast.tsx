'use client';

import React from 'react';
import { createToaster, Toaster, Toast } from '@ark-ui/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Ark UI 기반의 전역 토스트 시스템
 * - 독립적인 Toaster 인스턴스를 통해 명령형 호출 지원
 */
export const toaster = createToaster({
    placement: 'top-end',
    overlap: true,
    gap: 16,
});

export function ToastProvider() {
    return (
        <Toaster toaster={toaster}>
            {(toast) => (
                <Toast.Root
                    key={toast.id}
                    className="group bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-start gap-3 min-w-[320px] animate-in slide-in-from-right-10 fade-in duration-300 data-[closed]:animate-out data-[closed]:fade-out data-[closed]:slide-out-to-right-10"
                >
                    <div className="shrink-0 mt-0.5">
                        {toast.type === 'success' && <CheckCircle size={20} className="text-teal-500" />}
                        {toast.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
                        {toast.type === 'info' && <Info size={20} className="text-sky-500" />}
                    </div>

                    <div className="flex-1 space-y-1">
                        <Toast.Title className="text-sm font-bold text-slate-800">
                            {toast.title}
                        </Toast.Title>
                        <Toast.Description className="text-xs text-slate-500 font-medium leading-relaxed">
                            {toast.description}
                        </Toast.Description>
                    </div>

                    <Toast.CloseTrigger className="shrink-0 -mt-1 -mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={16} />
                    </Toast.CloseTrigger>
                </Toast.Root>
            )}
        </Toaster>
    );
}
