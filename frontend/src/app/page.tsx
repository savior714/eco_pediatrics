'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/station');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
            <div className="text-center">
                <p className="text-slate-400 animate-pulse">Loading Station Dashboard...</p>
            </div>
        </div>
    );
}
