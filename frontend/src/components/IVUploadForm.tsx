'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { Upload, X, Check, Camera, Droplet } from 'lucide-react';
import Image from 'next/image';
import { toaster } from './ui/Toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { QRCodeCanvas } from 'qrcode.react';

/** 수액 기록 업로드 폼 Props */
interface IVUploadFormProps {
    admissionId: string;
    patientName: string;
    /** 모바일 QR 업로드 URL 생성용 인증 토큰 */
    token?: string;
    /** 기록 저장 성공 시 주입 속도 값을 부모에 전달하는 콜백 */
    onUploadSuccess: (rate?: number) => void;
    /** WebSocket을 통해 수신된 최신 수액 사진 정보 */
    lastUploadedIv?: { admissionId: string; url: string } | null;
}

/**
 * 수액 주입 속도 입력 및 수액 조절기 사진 등록 폼 컴포넌트.
 * 모바일 QR 스캔을 통한 사진 업로드와 WebSocket 자동 반영을 지원한다.
 */
export function IVUploadForm({ admissionId, patientName, token, onUploadSuccess, lastUploadedIv }: IVUploadFormProps) {
    const [rate, setRate] = useState<number | ''>('');
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showZoom, setShowZoom] = useState(false);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    // WebSocket 이벤트로 수신된 사진 URL 자동 반영
    React.useEffect(() => {
        if (lastUploadedIv && lastUploadedIv.admissionId === admissionId) {
            setPhotoUrl(lastUploadedIv.url);
        }
    }, [lastUploadedIv, admissionId]);

    /** 수액 기록(속도 + 사진 URL)을 서버에 저장하고, 성공 시 부모에 결과를 전달한다. */
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
                onUploadSuccess(rate === '' ? undefined : Number(rate));
                setPhotoUrl(''); // 저장 성공 후 사진 URL 초기화
                toaster.create({
                    title: '성공',
                    description: '기록이 저장되었습니다.',
                    type: 'success'
                });
                if (successTimerRef.current) clearTimeout(successTimerRef.current);
                successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
            } else {
                const errorData = await res.json().catch(() => ({}));
                toaster.create({
                    title: '실패',
                    description: errorData.detail || '기록 저장 중 서버 오류가 발생했습니다.',
                    type: 'error'
                });
            }
        } catch (e) {
            console.error(e);
            toaster.create({
                title: '실패',
                description: '기록 저장 중 오류가 발생했습니다.',
                type: 'error'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const mobileUploadUrl = token ? `${window.location.origin}/mobile/iv-upload?token=${token}` : '';
    const fullPhotoUrl = photoUrl ? (photoUrl.startsWith('/') ? `${API_BASE}${photoUrl}` : photoUrl) : '';

    return (
        <>
            <div className={`relative ${photoUrl ? 'ring-2 ring-orange-400 rounded-xl p-1 -m-1 bg-orange-50/50' : ''}`}>
                {/* 속도 입력 + 저장 버튼 + QR/사진 영역 수평 배치 */}
                <div className="flex items-stretch gap-2 h-10">
                    {/* 주입 속도 입력 */}
                    <div className="flex-1 min-w-0 relative">
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">cc/hr</span>
                    </div>

                    {/* 저장 버튼 */}
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || success}
                        className={`flex items-center justify-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm border whitespace-nowrap min-w-[70px] ${success
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : photoUrl
                                ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600 animate-pulse'
                                : 'bg-slate-800 text-white border-slate-900 hover:bg-black'
                            }`}
                    >
                        {success ? (
                            <Check size={14} />
                        ) : (
                            <Upload size={14} />
                        )}
                        <span>{isUploading ? '저장...' : success ? '완료' : photoUrl ? '승인' : '기록'}</span>
                    </button>

                    {/* QR 아이콘 버튼 / 사진 미리보기 (우측) */}
                    <div className="flex-none h-full aspect-square relative">
                        {/* 사진이 있으면 미리보기, 없으면 QR 스캔 버튼 */}
                        {photoUrl ? (
                            <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer" onClick={() => setShowZoom(true)}>
                                <Image
                                    src={fullPhotoUrl}
                                    alt="Up"
                                    fill
                                    className="object-cover"
                                />
                                {/* 사진 삭제 버튼 (우상단) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPhotoUrl(''); }}
                                    className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"
                                >
                                    <X size={10} className="text-white" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowQr(true)}
                                className="w-full h-full border border-slate-300 border-dashed bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
                                title="QR 업로드"
                            >
                                <Camera size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* QR Modal Overlay */}
                {showQr && token && (
                    <div className="absolute top-full right-0 mt-2 bg-white z-popover flex flex-col items-center justify-center rounded-xl p-3 animate-in fade-in zoom-in-95 border border-slate-200 shadow-xl w-48">
                        <button
                            onClick={() => setShowQr(false)}
                            className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                        >
                            <X size={16} />
                        </button>
                        <p className="text-xs text-slate-600 mb-3 font-bold text-center">모바일 스캔하여 업로드</p>
                        <div className="bg-white p-1 rounded-lg border border-slate-100">
                            <QRCodeCanvas value={mobileUploadUrl} size={120} />
                        </div>
                    </div>
                )}
            </div>

            {/* 사진 확대 모달 (전체 화면) */}
            {showZoom && fullPhotoUrl && (
                <div
                    className="fixed inset-0 z-modal-content bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setShowZoom(false)}
                >
                    <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
                        <div className="relative w-full h-full">
                            <Image
                                src={fullPhotoUrl}
                                alt="Zoomed IV"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <p className="text-white/70 mt-4 text-sm font-medium">화면을 클릭하면 닫힙니다</p>
                    </div>
                </div>
            )}
        </>
    );
}
