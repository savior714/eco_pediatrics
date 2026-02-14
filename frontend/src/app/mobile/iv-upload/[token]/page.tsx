'use client';

import React, { useState, ChangeEvent } from 'react';
import { Upload, Camera, Check, AlertCircle } from 'lucide-react';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MobileIVUpload({ params }: { params: { token: string } }) {
    const { token } = params;
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validation
            if (!selectedFile.type.startsWith('image/')) {
                setError('이미지 파일만 업로드 가능합니다.');
                setFile(null);
                setPreview(null);
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('파일 크기는 10MB를 초과할 수 없습니다.');
                setFile(null);
                setPreview(null);
                return;
            }

            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/api/v1/upload/image?token=${token}`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            setError('사진 전송에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-teal-50 p-4 text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                    <Check size={40} className="text-teal-600" />
                </div>
                <h1 className="text-2xl font-bold text-teal-800 mb-2">전송 완료!</h1>
                <p className="text-teal-600">스테이션으로 사진이 전송되었습니다.</p>
                <p className="text-sm text-teal-500 mt-8">창을 닫으셔도 됩니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 bg-slate-800 text-white text-center">
                    <h1 className="text-xl font-bold">IV 모니터 사진 업로드</h1>
                    <p className="text-sm text-slate-300 mt-1">수액 조절기 값을 촬영해 주세요</p>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Preview Area */}
                    <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                        {preview ? (
                            <Image src={preview} alt="Preview" fill className="object-cover" />
                        ) : (
                            <div className="text-center text-slate-400">
                                <Camera size={48} className="mx-auto mb-2 opacity-50" />
                                <span className="text-sm">사진을 선택하거나 촬영하세요</span>
                            </div>
                        )}

                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${!file
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : uploading
                                ? 'bg-slate-400 text-white cursor-wait'
                                : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                            }`}
                    >
                        {uploading ? '전송 중...' : '스테이션으로 전송'}
                    </button>
                </div>
            </div>
        </div>
    );
}
