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
    const [rate, setRate] = useState<number | ''>('');
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
        const body: { admission_id: string; infusion_rate: number | ''; photo_url?: string } = {
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
                onUploadSuccess(rate === '' ? undefined : rate);
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
        <div className="relative">
            {/* Top Center Save Button (Now in flex) */}

            <div className="flex items-stretch gap-2 h-10">
                {/* 1. Rate Input Group */}
                <div className="flex-1 min-w-0">
                    <input
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                        className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                    />
                </div>

                {/* 2. Save Button (Center) */}
                <button
                    onClick={handleUpload}
                    disabled={isUploading || success}
                    className={`flex items-center justify-center gap-1.5 px-4 h-full rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm border whitespace-nowrap ${success
                        ? 'bg-status-success/10 text-status-success border-status-success/20'
                        : 'bg-primary text-white border-primary hover:bg-teal-600'
                        }`}
                >
                    {success ? (
                        <Check size={14} />
                    ) : (
                        <Upload size={14} />
                    )}
                    <span>{isUploading ? '저장' : success ? '완료' : '기록'}</span>
                </button>

                {/* 3. QR Icon Button (Right) */}
                <div className="flex-none h-full aspect-square">
                    {/* If photo uploaded, show small preview or X to clear */}
                    {photoUrl ? (
                        <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                            <img
                                src={photoUrl.startsWith('/') ? `${API_BASE}${photoUrl}` : photoUrl}
                                alt="Up"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setPhotoUrl('')}
                                className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={14} className="text-white" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowQr(true)}
                            className="w-full h-full border border-primary border-dashed bg-primary/5 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-all"
                            title="QR 업로드"
                        >
                            <Camera size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* QR Modal Overlay */}
            {showQr && token && (
                <div className="absolute inset-x-[-12px] inset-y-[-12px] bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl p-3 animate-in fade-in zoom-in-95 border border-slate-100 shadow-xl">
                    <button
                        onClick={() => setShowQr(false)}
                        className="absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                    <p className="text-[10px] text-slate-500 mb-2 font-bold text-center leading-tight">모바일로 사진을<br />업로드하세요</p>
                    <div className="bg-white p-1 rounded-lg border border-slate-100">
                        <QRCodeCanvas value={mobileUploadUrl} size={90} />
                    </div>
                </div>
            )}
            {showQr && !token && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-red-500 font-bold mb-2">토큰 없음</p>
                    <button onClick={() => setShowQr(false)} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px]">닫기</button>
                </div>
            )}
        </div>
    );
}
