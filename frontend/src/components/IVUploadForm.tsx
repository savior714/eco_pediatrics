'use client';

import React, { useState } from 'react';
import { Card } from './Card';
import { Upload, Droplet, Check } from 'lucide-react';

interface IVUploadFormProps {
    admissionId: string; // Internal ID, or handle mapping in parent
    patientName: string;
    onUploadSuccess: () => void;
}

export function IVUploadForm({ admissionId, patientName, onUploadSuccess }: IVUploadFormProps) {
    const [rate, setRate] = useState<number>(60);
    const [isUploading, setIsUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleUpload = async () => {
        setIsUploading(true);
        // In a real app, upload file to storage (AWS S3/Supabase Storage) first, get URL.
        // Here we simulate it with a placeholder.
        const mockPhotoUrl = "https://placehold.co/400x400/png?text=IV+Photo";

        try {
            const res = await fetch('http://localhost:8000/api/v1/iv-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_id: admissionId, // Note: In real app, ensure this matches DB UUID
                    photo_url: mockPhotoUrl,
                    infusion_rate: rate
                })
            });

            if (res.ok) {
                setSuccess(true);
                onUploadSuccess();
                setTimeout(() => setSuccess(false), 3000);
            } else {
                alert('Upload failed');
            }
        } catch (e) {
            console.error(e);
            alert('Error uploading record');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="mt-4 border-slate-200 bg-white shadow-md">
            <h5 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 rounded-lg">
                    <Droplet size={18} className="text-primary" />
                </div>
                IV Check ({patientName})
            </h5>

            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-500">Speed (cc/hr)</label>
                    <input
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(Number(e.target.value))}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
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
        </Card>
    );
}
