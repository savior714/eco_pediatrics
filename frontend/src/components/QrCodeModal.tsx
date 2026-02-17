'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from 'qrcode.react';

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
                    <p className="text-xs text-slate-400 bg-slate-50 py-2 px-4 rounded-full font-mono mt-2 break-all">
                        {dashboardUrl}
                    </p>
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
