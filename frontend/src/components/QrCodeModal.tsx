'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';

interface QrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    roomNumber: string;
    token: string;
}

export function QrCodeModal({ isOpen, onClose, patientName, roomNumber, token }: QrCodeModalProps) {
    // Generate the URL for the guardian dashboard
    // Use window.location.origin if available, otherwise fallback (though this runs on client)
    const [origin, setOrigin] = React.useState('');

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const dashboardUrl = `${origin}/dashboard?token=${token}`;

    const handleOpenSmartphoneWindow = async () => {
        if (!dashboardUrl) return;

        // Tauri 환경인지 확인
        const isTauri =
            typeof window !== 'undefined' &&
            (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined;

        if (isTauri) {
            try {
                const { WindowManager } = await import('@/utils/tauriWindowManager');
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

                const existing = await WebviewWindow.getByLabel('smartphone-preview');
                if (existing) {
                    // 창이 이미 존재: IPC 이벤트로 데이터만 갱신 (창 재생성 없음)
                    await WindowManager.sendEvent('update-preview-patient', { token });
                    await WindowManager.focusWindow('smartphone-preview');
                } else {
                    // 최초 생성
                    await WindowManager.getOrCreate('smartphone-preview', dashboardUrl, {
                        title: `스마트폰 미리보기 - ${patientName}`,
                        width: 375,
                        height: 812,
                        resizable: true,
                    });
                }
                return;
            } catch (err) {
                console.error('Failed to load Tauri API:', err);
            }
        }

        // 브라우저 환경 또는 Tauri API 로드 실패 시 fallback
        window.open(
            dashboardUrl,
            'SmartphonePreview',
            'width=375,height=812,resizable=yes,scrollbars=yes,location=yes,status=yes'
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`보호자 대시보드 QR (${roomNumber}호 ${patientName})`}>
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                    {origin && token ? (
                        <QRCodeSVG value={dashboardUrl} size={200} level="H" includeMargin={true} />
                    ) : (
                        <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                            Loading...
                        </div>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm text-slate-500">
                        보호자의 스마트폰 카메라로<br />
                        위 QR 코드를 스캔해 주세요.
                    </p>
                    <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
                        <p className="text-[10px] text-slate-400 bg-slate-50 py-2 px-4 rounded-full font-mono break-all flex-1 text-left">
                            {dashboardUrl}
                        </p>
                        <button
                            onClick={handleOpenSmartphoneWindow}
                            className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95 flex-shrink-0 shadow-sm border border-blue-100"
                            title="스마트폰 미리보기 (개발용)"
                        >
                            <Smartphone size={16} />
                        </button>
                    </div>
                </div>

                <div className="w-full pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </Modal>
    );
}
