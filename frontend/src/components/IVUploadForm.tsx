'use client';

import React, { useState } from 'react';
import { Card } from './Card';
import { Upload, X, Check, Camera, Droplet } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { QRCodeCanvas } from 'qrcode.react';

interface IVUploadFormProps {
    admissionId: string;
    patientName: string;
    token?: string;
    onUploadSuccess: (rate?: number) => void;
    lastUploadedIv?: { admissionId: string; url: string } | null;
}

export function IVUploadForm({ admissionId, patientName, token, onUploadSuccess, lastUploadedIv }: IVUploadFormProps) {
    const [rate, setRate] = useState<number>(60);
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [manualInput, setManualInput] = useState(false);

    // Auto-fill from WebSocket event
    React.useEffect(() => {
        if (lastUploadedIv && lastUploadedIv.admissionId === admissionId) {
            setPhotoUrl(lastUploadedIv.url);
            // Optional: Auto-submit or just show success? 
            // Let's just fill it and show a highlight or toast?
            // For now, just fill it.
        }
    }, [lastUploadedIv, admissionId]);

    const handleUpload = async () => {
        if (!admissionId || admissionId.trim() === '') {
            alert('이 병상은 현재 입원 정보가 연동되어 있지 않아 기록을 저장할 수 없습니다.');
            return;
        }

        setIsUploading(true);
        const body: { admission_id: string; infusion_rate: number; photo_url?: string } = {
            admission_id: admissionId,
            infusion_rate: rate
        };
        if (photoUrl.trim()) body.photo_url = photoUrl.trim();

        try {
            const res = await fetch(`${API_BASE}/api/v1/iv-records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setSuccess(true);
                onUploadSuccess(rate);
                setPhotoUrl(''); // Clear after success
                setTimeout(() => setSuccess(false), 3000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(`Upload failed: ${errorData.detail || 'Server error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error uploading record');
        } finally {
            setIsUploading(false);
        }
    };

    const mobileUploadUrl = token ? `${window.location.origin}/mobile/iv-upload/${token}` : '';

    return (
        <Card className="mt-4 border-slate-200 bg-white shadow-md relative">
            <h5 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 rounded-lg">
                    <Droplet size={18} className="text-primary" />
                </div>
                IV Check ({patientName})
            </h5>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-500">Speed (cc/hr)</label>
                    <input
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-500">IV Photo</label>
                        <button
                            onClick={() => setManualInput(!manualInput)}
                            className="text-xs text-slate-400 underline hover:text-slate-600"
                        >
                            {manualInput ? 'QR로 업로드' : 'URL 직접 입력'}
                        </button>
                    </div>

                    {manualInput ? (
                        <input
                            type="url"
                            placeholder="https://..."
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-sm"
                        />
                    ) : (
                        <div className="flex gap-2">
                            {photoUrl ? (
                                <div className="flex-1 relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                                    {/* Handle relative URLs from backend */}
                                    <img
                                        src={photoUrl.startsWith('/') ? `${API_BASE}${photoUrl}` : photoUrl}
                                        alt="Uploaded"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => setPhotoUrl('')}
                                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 bg-green-500/90 text-white text-[10px] text-center py-0.5">
                                        업로드됨
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowQr(true)}
                                    className="flex-1 py-3 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all gap-1"
                                >
                                    <Camera size={20} />
                                    <span className="text-xs font-medium">모바일 업로드 (QR)</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleUpload}
                    disabled={isUploading || success}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold shadow-sm active:scale-95 transition-all ${success
                        ? 'bg-status-success text-white ring-2 ring-green-200'
                        : 'bg-primary text-white hover:bg-teal-600 shadow-teal-100'
                        }`}
                >
                    {success ? (
                        <><Check size={18} /> Recorded</>
                    ) : (
                        <><Upload size={18} /> {isUploading ? 'Saving...' : 'Upload Record'}</>
                    )}
                </button>
            </div>

            {/* QR Modal Overlay */}
            {showQr && token && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl p-4 animate-in fade-in zoom-in-95">
                    <button
                        onClick={() => setShowQr(false)}
                        className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                    <h6 className="font-bold text-slate-700 mb-1">모바일 카메라로 스캔</h6>
                    <p className="text-xs text-slate-500 mb-4 text-center">아래 QR을 스캔하여<br />사진을 업로드하세요</p>

                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                        <QRCodeCanvas value={mobileUploadUrl} size={140} />
                    </div>
                </div>
            )}
            {showQr && !token && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl p-4 text-center">
                    <p className="text-sm text-red-500 font-medium mb-2">토큰이 없습니다.</p>
                    <button
                        onClick={() => setShowQr(false)}
                        className="px-4 py-2 bg-slate-100 rounded-lg text-xs"
                    >
                        닫기
                    </button>
                </div>
            )}
        </Card>
    );
}
